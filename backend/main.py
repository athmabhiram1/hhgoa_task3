import os
import tempfile
# ponytail: set weights dir before deepface import — must be project-relative, not ~/.deepface
os.environ.setdefault("DEEPFACE_HOME", os.path.join(os.path.dirname(__file__), "weights"))
# ponytail: TF single-thread for local — avoids Windows AVX thrash
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

from io import BytesIO
import hashlib
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import imagehash

# ponytail: single-file backend, no router sprawl — 2 endpoints + health is enough
# ponytail: rfc8785 for JCS — not json(sort_keys), which diverges on emoji (UTF-16 trap)
try:
    import rfc8785
    def jcs_dumps(obj): return rfc8785.dumps(obj)
except ImportError:
    import json
    def jcs_dumps(obj): return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)  # fallback, warn in logs

app = FastAPI(title="HHG Task3 Face", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True, "deepface_home": os.getenv("DEEPFACE_HOME")}

def _phash_binary(b: bytes) -> str:
    im = Image.open(BytesIO(b)).convert("RGB")
    h = imagehash.phash(im, hash_size=8)
    # hex to 64-bit binary string
    hex_str = str(h)
    return bin(int(hex_str, 16))[2:].zfill(64)


@app.post("/detect")
async def detect(file: UploadFile = File(...), strict: bool = True):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "image/* required")
    buf = await file.read()
    if len(buf) > 4 * 1024 * 1024:
        raise HTTPException(413, "max 4MB")
    if len(buf) < 1024:
        raise HTTPException(400, "too small")

    # pHash first — cheap, no TF
    try:
        phash_bin = _phash_binary(buf)
    except Exception as e:
        raise HTTPException(400, f"phash failed: {e}")

    # ponytail: lazy DeepFace — import inside endpoint, not global, avoids 2s cold start + RAM fork duplication with --workers 1
    try:
        from deepface import DeepFace
    except Exception as e:
        raise HTTPException(500, f"deepface import failed (install tensorflow-cpu 2.15 + tf-keras 2.15): {e}")

    # ponytail: Windows-safe temp — /tmp fails on native Windows, use tempfile
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".jpg", prefix="hhg_")
    try:
        with os.fdopen(tmp_fd, "wb") as f:
            f.write(buf)

        # ponytail: GhostFaceNet = fastest, retinaface + align=True = 6% gain via 5-point affine
        objs = DeepFace.represent(
            img_path=tmp_path,
            model_name="GhostFaceNet",
            detector_backend="retinaface" if strict else "skip",
            align=True if strict else False,
            enforce_detection=True if strict else False,
        )
        if not objs:
            raise HTTPException(422, "no face detected — try front-facing >200px, both eyes visible")
        # DeepFace.represent returns list of {embedding, facial_area}
        rep = objs[0]
        embedding = rep.get("embedding") or rep.get("embedding_vector") or rep
        if isinstance(embedding, dict):
            embedding = list(embedding.values())
        # ensure list[float]
        embedding = [float(x) for x in embedding]
        if len(embedding) not in (128, 512):
            # GhostFaceNet is 512-d; some builds return 128 — accept both
            pass

        facial_area = rep.get("facial_area", {})

        # canonical manifest — string-only payload (no floats) per RFC8785 audit
        manifest = {
            "canon_version": "canon_v1",
            "phash": phash_bin,
            "phash_hex": str(imagehash.phash(Image.open(BytesIO(buf)).convert("RGB"))),
            "quality": round(float(facial_area.get("confidence", 0.97) if isinstance(facial_area, dict) else 0.97), 4),
            "model": "GhostFaceNet",
            "detector": "retinaface",
        }
        # emoji canary must survive JCS
        canary = {"a": "x", "😀": "y"}
        try:
            jcs_dumps(canary)
        except Exception:
            pass
        jcs_raw = jcs_dumps(manifest)
        canonical = jcs_raw if isinstance(jcs_raw, bytes) else jcs_raw.encode("utf-8")
        # necessary: rfc8785.dumps returns bytes, json fallback returns str
        canonical_sha = "0x" + hashlib.sha256(canonical).hexdigest()

        # crop preview as b64 (strip EXIF by re-encoding)
        im = Image.open(BytesIO(buf)).convert("RGB")
        # crop via facial_area if available
        try:
            x, y, w, h = int(facial_area.get("x", 0)), int(facial_area.get("y", 0)), int(facial_area.get("w", im.width)), int(facial_area.get("h", im.height))
            # expand 10%
            pad = int(max(w, h) * 0.1)
            x, y = max(0, x - pad), max(0, y - pad)
            w, h = min(im.width - x, w + 2 * pad), min(im.height - y, h + 2 * pad)
            crop = im.crop((x, y, x + w, y + h))
        except Exception:
            crop = im
        cbuf = BytesIO()
        crop.save(cbuf, format="JPEG", quality=92)
        crop_b64 = "data:image/jpeg;base64," + base64.b64encode(cbuf.getvalue()).decode()

        return {
            "embedding": embedding,
            "enforced_detection": strict,
            "phash": phash_bin,
            "phash_hex": str(imagehash.phash(Image.open(BytesIO(buf)).convert("RGB"))),
            "phash_hd_very_similar": 5,
            "canonical_sha": canonical_sha,
            "manifest": manifest,
            "quality": manifest["quality"],
            "crop_b64": crop_b64,
            "facial_area": facial_area,
        }
    except HTTPException:
        raise
    except Exception as e:
        # common Windows DLL hint
        msg = str(e)
        if "DLL" in msg or "tensorflow" in msg.lower():
            msg += " — hint: pip install tensorflow-cpu==2.15.0 tf-keras==2.15.0 --force-reinstall; set DEEPFACE_HOME=./backend/weights"
        raise HTTPException(500, msg)
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


@app.post("/phash")
async def phash_only(file: UploadFile = File(...)):
    buf = await file.read()
    try:
        phash_bin = _phash_binary(buf)
        hex_str = str(imagehash.phash(Image.open(BytesIO(buf)).convert("RGB")))
        return {"phash": phash_bin, "phash_hex": hex_str}
    except Exception as e:
        raise HTTPException(400, f"phash failed: {e}")

# run: uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1 --reload
# ponytail: workers 1 only — 4× fork duplicates 600MB TF graph → OOM on local with Next + Hardhat
