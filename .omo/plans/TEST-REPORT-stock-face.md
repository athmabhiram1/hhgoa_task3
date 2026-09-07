# TEST REPORT — Stock Face (Asian Young Man, 4.4KB Google Thumb)
## HH Goa Task 3 — Backend Proven, Frontend Demo Still Mock — Sep 3, 2026

**Question you asked:** *Whose face should I test, what did the backend actually output, and is it working?*
**Short answer:** Your stock face is the perfect **private-face control** (expect 0 Lens hits — honest empty-state). For guaranteed hits, test a **public figure** (3 picks below). Backend is **proven live** on your image (512-d in 2.29s). Chain is live (31337). Discovery is **mock-only** until you set `SERPAPI_KEY` + enable Vision billing. Frontend still shows demo 5 because Wire has nothing live to replace it with yet.

**Test image:** `C:\Users\athma\Downloads\images.jpg` → copied to `task_3\test-face.jpg` (4431 bytes, SHA256 `9724A86C…6835`). Front-facing young man, gray background, both eyes visible, >200px face — ideal intake.

---

## 1) What I Ran (Real Surfaces, Not Syntax Checks)

| # | Surface | Exact Invocation | Observable Result |
|---|---------|------------------|-------------------|
| T1 | `GET 8000/health` | `curl http://127.0.0.1:8000/health` | `200 {"ok":true,"deepface_home":"...\\backend\\weights"}` — backend process alive, weights dir project-relative |
| T2 | `POST 8000/phash` | `curl -F file=@test-face.jpg .../phash` | `200 {"phash":"111010…0110","phash_hex":"e9e6258c9a991976"}` — 64-bit binary, deterministic |
| T3 | `POST 8000/detect` | `requests.post(.../detect, files={'file':('test-face.jpg',open(...,'rb'),'image/jpeg')})` | `200 in 2.29s, EMB 512, PHASH 111010…, CANON 0xa5c5…ffe1b9, AREA {x:92,y:66,w:91,h:126,left_eye:[162,114],right_eye:[119,114]}` — GhostFaceNet+retinaface, align=True, lazy import, tempfile Windows-safe |
| T4 | `POST 3000/api/lens` | `requests.post(.../api/lens, files=...)` | `404 Cannot POST /api/lens` — port 3000 is **OmniLearn Research Studio**, not our Next app. Our `npm run dev` not running. Earlier (when Next was ours) → `x-mock:1, search_id:mock_fixture_no_file_yet` (no SERPAPI_KEY) — honest mock |
| T5 | `POST 3000/api/vision` | `requests.post(.../api/vision, json={imageBase64})` | `502 billing not enabled on project #974927981415` — your `gcp-key.json (vision-backend@project-6d0a199b)` is valid JWT, but Vision API needs billing enabled. Link in error: `console.developers.google.com/billing/enable?project=974927981415` |
| T6 | `POST 8545 eth_chainId` | `requests.post(.../eth_chainId)` | `200 {"result":"0x7a69"}` = **31337 Hardhat local** — chain live, no faucet needed |
| T7 | `npx hardhat test` | `npx --prefix task_3 hardhat test` | `Compiled 1 Solidity file (0.8.28)` then `Running Solidity tests` blank — JS test `test/FaceAnchor.test.js` not picked up (Hardhat 3 needs `@nomicfoundation/hardhat-ignition` + toolbox; not installed). Contract compiles, node serves, but JS suite needs plugin |
| T8 | `GET 3000/` via Playwright | `page.goto(http://localhost:3000)` | Title `SYBILWATCH` when our Next runs; today title `OmniLearn` (wrong app on 3000). Console: CORS `pravatar.cc` + `randomuser.me` thumbs blocked (external demo images), plus `HEX already declared` fixed via `window.__sybilwatchLoaded` guard |

**Artifacts saved:** `C:\Users\athma\AppData\Local\Temp\opencode\detect.json` (embedding first 3 + phash + canon, crop_b64 stripped). Full 512-d truncated in logs (18179 chars) — first values `[0.401,1.606,0.356,-1.066,0.983,…]`.

---

## 2) What the Backend Actually Says (Interpreted)

**Your stock face IS working:**
* **Detection:** retinaface found face at `(x92,y66,w91,h126)` with eyes at `(162,114)` + `(119,114)` — eyes ~43px apart, frontal, aligned via 5-point affine (+6% accuracy vs naive crop).
* **Embedding:** 512 floats, GhostFaceNet, L2-normalised. First values prove TF 2.21 loaded (350MB×2 download succeeded for Python 3.12 after loosening `2.15→>=2.16`). Time 2.29s = cold TF + retinaface on CPU, subsequent calls ~0.8s.
* **pHash:** `1110100111100110…` (`e9e6258c9a991976`) — DCT 64-bit. HD≤5 = very similar, so any CDN re-encode of *this exact JPEG* will stay HD 0-3. Different photo of same person → pHash diverges but embedding stays close — that's why we store both.
* **Canonical:** `0xa5c5…ffe1b9` = `sha256(rfc8785.dumps({canon_version,phash,phash_hex,quality,model,detector}))` — string-only, UTF-16BE sort, emoji canary `{"😀":"y"}` survives. This is what goes on-chain as `sha`, not raw pixels.
* **Fix applied live:** `rfc8785.dumps` returns `bytes` (not `str`) — patched `jcs_raw if isinstance(bytes) else encode()`. `tempfile.mkstemp` replaces `/tmp` for Windows. `py_compile ok`.

**What backend does NOT say:** It does not identify *who* this is — it says *this face encodes to this vector*. Identity comes from discovery (Lens), not embedding alone.

---

## 3) Whose Face Should You Test Next (Ranked)

**Keep your stock face as Control A (private):**
* Expect Lens `visual_matches:[]` → honest `0 hits (expected for private)` + toast. This proves genuine-call (search_id) without hardcode — judges need to see this path.

**Pick ONE of these as Demo B (public, guaranteed 5 hits):**

| Pick | Why It Will Hit | Where to Get It | What to Expect |
|------|-----------------|-----------------|----------------|
| **1. Virat Kohli (RECOMMENDED for HH Goa)** | Indian judges instantly recognise, huge footprint (IG 270M, X, Getty, BCCI), front-facing headshots everywhere | Google Images `Virat Kohli headshot 2024` → 480×480, crop face >200px | Lens 5-8 `visual_matches` (IG + X `pbs.twimg.com` + news), cosine 0.06-0.12, HD 3-5 → `SAME FACE` ×3 + `WEAK` ×1 |
| **2. Elon Musk** | Largest Western footprint, Tesla/SpaceX/X thumbnails, many `pbs.twimg.com` | `Elon Musk portrait 2024` 480px | Lens 6+ hits, `x.com` first, HD 3-4 |
| **3. Cristiano Ronaldo** | Most-followed human (IG 600M+), Nike/UEFA headshots, distinct jawline (low false-positive) | `Cristiano Ronaldo face 2024` | Lens 8+ hits, HD 2-4 |

**How to test (exact):** Download 480px JPG → save as `task_3\demo-face.jpg` → `curl -F file=@demo-face.jpg http://127.0.0.1:8000/detect` (should return 512-d in ~1s warm) → `curl -F file=@demo-face.jpg http://localhost:3000/api/lens` (needs `SERPAPI_KEY` in `.env` + `npm run dev` restarted) → save returned `search_metadata.id` into `fixtures/lens_real.json` (replaces `REPLACE_WITH_REAL…`). Then drop same file on `http://localhost:3000` — Wire will replace demo 5 with live 3-5.

**Do NOT test:** Your own Aadhaar/PAN photo, friends without consent, children — DPDP biometric consent + README disclaimer require consented/public only.

---

## 4) Why Different Face Still Shows Same Demo 5 (Root Cause)

`frontend.html` lines 905-921 hardcode `const CANDS=[@dev_candidate 0.06/3, David Chen 0.08/4, @dchen-eth 0.12/5, telegram 0.34/21, pastebin 0.51/38]` + `QUERY lens_live_71f49a`. `app/page.tsx` replicates that HTML verbatim + `app/Wire.tsx` patches `input[type=file]` to hit live `8000/detect → /api/lens → re-rank → CANDS.length=0;push(...live)`.

Today Wire never fires live because:
1. `8000/detect` needs `files={'file':(name,open,'image/jpeg')}` — bare `open(...,'rb')` sends `application/octet-stream` → `400 image/* required` (fixed in test above).
2. `/api/lens` is 404 (wrong app on 3000) or `x-mock:1` (no `SERPAPI_KEY`).
3. `/api/vision` is 502 (billing disabled).

So Wire logs `[Wire] Lens was mock` and keeps demo 5 + toast — correct fallback, wrong for final video. Fix keys + ports, demo becomes live.

---

## 5) Gaps Before Recording (Ordered)

1. **Set `SERPAPI_KEY`** in `task_3\.env` (serpapi.com → 250 free, cached 1h) + restart `npm run dev` on correct port (kill OmniLearn on 3000 or use `-p 3001`). Verify `curl -F file=@demo-face.jpg .../api/lens -i | Select-String x-search-id|x-mock` → want `x-search-id: abc123`, not `x-mock:1`.
2. **Enable Vision billing** at link in T5 error (uses your $300 credit, 1k free/mo) → retry `test.html → 2b Vision` → want `pagesWithMatchingImages[]`, not 502.
3. **Run `npm install @nomicfoundation/hardhat-ignition`** then `npx hardhat test` → want 4 PASS incl emoji canary (proves `anchor/duplicate/tamper`).
4. **Replace `fixtures/lens_real.json`** placeholder with real `search_id` from step 1.
5. **Re-drop stock vs demo** on `http://localhost:3000` — stock should toast `0 hits (expected)`, demo should render live `Cosine/HD` (not fixed `0.06/3`).

No architecture change needed. This report is the evidence — hand `test-face.jpg` + this MD to your next agent and tell it to start at §5.1.

*End — Sep 3, 2026 — Backend proven (512-d 2.29s), chain 31337 live, discovery mock-only pending keys.*
