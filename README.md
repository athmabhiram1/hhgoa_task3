# HHG Task 3 — SybilWatch: Face Scan → Genuine Web Find → Chain Custody

**HH Goa 2026 Shortlisting Task 3 — Face Identification & Blockchain Verification**

**Repo:** https://github.com/athmabhiram1/hhgoa_task3
**Video:** _(unlisted link added after recording — see `.omo/VIDEO-SCRIPT.md` for the exact take)_
**Form:** https://forms.gle/oZbQGuwiNeHVcHWo8 (one-shot, before Sep 7 23:59 IST)

**Thesis (DPRK-inspired, disclaimer first):** Flags **profile image reuse & synthetic identity risk** for remote-hiring fraud (FBI July 2025 update, UN $250–600M/yr). **Does not attribute to DPRK**, does not prove SSN/name ownership — proves **the same face / near-duplicate image existed at block T and is untampered via hash lineage**.

## Requirement checklist (maps 1:1 to the brief)

| # | Brief requirement | How this repo meets it | Where to look |
|---|---|---|---|
| 1 | Face identification — detect + encode a face from input | GhostFaceNet 512-d embedding + retinaface align + pHash-64 + quality, local FastAPI | `backend/main.py` → `POST /detect` |
| 2 | Genuine web/social search — at least one real matching post, no hardcoding | Face crop → SerpAPI Lens `image_id` flow → `visual_matches` + `search_metadata.id`; no fixture/mock path in code (503 without key) | `app/api/lens/route.ts`, `app/page.tsx` `runSearch` |
| 3 | Blockchain upload + re-verification of discovered data | Canonical JCS manifest → SHA-256 → `FaceAnchor.anchor()`; `verify()` recompute vs on-chain → VERIFIED / TAMPERED | `contracts/FaceAnchor.sol`, `app/lib/ethers.ts`, `scripts/e2e.mjs` |
| 4 | No website required | Pipeline-first; the Next.js UI is a local demo console only (`npm run dev`, never hosted) | `app/` |
| 5 | GitHub repo + README (what / run / chain / limits) | This file | — |

**Pipeline:** `Face scan → face crop → SerpAPI Lens (genuine search_id) → top-8 candidates → canonical JCS (RFC 8785, UTF-16BE, string-only) → SHA-256 + pHash-64 → Hardhat 31337 → Re-verify + Tamper Climax`

**Status:** Local-only (`npm run dev` + `npx hardhat node` + `uvicorn --workers 1`), 0₹ (Lens ~8/250 used, Vision 1k free + $300, Hardhat 0). No hosting for submission.

---

## Architecture

```
Input headshot → GhostFaceNet 512-d + retinaface align=True → 512-d + pHash-64 + quality
→ Face crop (crop_b64) → SerpAPI Lens (engine=google_lens, image_id 500KB/10min, search_id in body + x-search-id header)
  — fallback Vision WEB_DETECTION (1k free, post-filter social; needs billing linked)
→ Candidates top-8 (SOCIAL/WEB tags, filter pills, provider chip, search_id copy)
→ Canonical manifest JCS rfc8785 (UTF-16BE, canon_version, string-only) → SHA-256 + pHash
→ Anchor FaceAnchor.sol (sha, phash uint64, url, cid, prev, ts, consenter, consentHash), event Anchored
→ Verify: recompute SHA vs on-chain → VERIFIED / TAMPER (Expected vs Computed) — Synthetic Risk: UNKNOWN (NullProvider, pluggable)
```

**UI (local console):** Intake (crop, 512-d, quality, pipeline checklist, pHash bit chart) | Discovery (ranked, search_id, filter pills) | Custody (Block, Tx, manifest, FILED stamp, seal, TAMPERED climax).

---

## Which Blockchain & Why

**Default: Hardhat local 31337** — `npx hardhat node` (ESM, Node ≥22.13, Hardhat 3.11), instant, 0 gas, 20×10000 ETH, `npm run deploy:local`. Guarantees a flawless recording.

**Toggle: Polygon Amoy 80002** — `amoy.polygonscan.com`, same `FaceAnchor.sol ^0.8.28` (`npm run deploy:amoy`, faucet-gated bonus, not required).

**Why not mainnet/Sepolia:** cost / faucet queue / zero extra judging points — YAGNI.

**Contract:** `contracts/FaceAnchor.sol` (`sha, phash, url, cid, prev, ts, consenter, consentHash`), `anchor()` guards duplicates (`ts==0`), `verify()` view. See `ignition/modules/FaceAnchor.ts`.

---

## Setup — Local (Windows)

```bash
# 1. Node ≥22.13 + Python 3.12
node -v # 22.13+
npm install

# 2. Chain — terminal 1 (keep open)
npx hardhat node
# terminal 2
npm test                    # 4 FaceAnchor tests + 7 node tests
npm run deploy:local        # deterministic 0x5FbDB2315678afecb367f032d93F642f64180aa3
# public/contract.json already points there; resync only if the address differs

# 3. Backend — terminal 3 (workers 1 only — forks OOM)
python -m venv .venv; .venv\Scripts\activate
pip install -r backend\requirements.txt
# first run pulls ~500MB to backend/weights via DEEPFACE_HOME
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1 --reload

# 4. App — terminal 4
npm run dev                 # http://localhost:3000 (local only, never hosted)

# 5. Discovery keys — .env (see .env.example; never committed)
# SERPAPI_KEY=              # 250/mo, only successful searches count
# GOOGLE_CLOUD_VISION_API_KEY=  # fallback; needs billing linked even for free tier
# DEEPFACE_HOME=./backend/weights
```

**Prove the pipeline (no UI):**

```bash
curl http://127.0.0.1:8000/health
curl -F file=@cr7.jpg http://127.0.0.1:8000/detect  # 512-d, phash_hex, quality, canonical_sha, crop_b64
curl -F file=@cr7.jpg http://localhost:3000/api/lens  # search_id + visual_matches
node scripts/e2e.mjs  # full loop: detect → lens → anchor → verify → tamper probe + receipts
```

**Windows tip:** Add the project folder to Defender exclusions — `next dev` + TF otherwise stalls.

---

## Genuine-search proof (no hardcoding)

- `POST /api/lens` takes the **face crop** (not the full photo — full photos match clothing/background), uploads via `POST serpapi.com/image` → `image_id` (10 min) → `GET /search?engine=google_lens` → `visual_matches[]` + `search_metadata.id` returned in body **and** `x-search-id` header.
- There is **no mock/fixture path** in the app code: without `SERPAPI_KEY` the route returns 503; with it every card comes from a live call. `fixtures/lens_*.json` are saved reference responses only — never imported by `app/` or `backend/` (see `.omo/reports/mock-audit.md`).
- Quota discipline: 1 call per search; ~8/250 used during build+QA.

---

## Demo — 3:00 Master Take (exact script in `.omo/VIDEO-SCRIPT.md`)

1. **(0:00)** Disclaimer visible. Fresh chain (`npx hardhat node` + `npm run deploy:local`) so the seal is live.
2. **(0:15)** Your photo → 512-d + quality + pHash bits → Lens `search_id` → honest result (private faces return little — say so).
3. **(0:45)** Ronaldo (`cr7.jpg`) → ranked social matches, provider chip, search_id.
4. **(1:15)** Select → SEAL → `Tx 0x… · Block N (31337)` + FILED stamp + seal.
5. **(1:45)** RE-VERIFY → `VERIFIED · DIGEST MATCH`.
6. **(2:10)** SIMULATE TAMPER → red wash + TAMPERED stamp + shake → RESET.
7. **(2:55)** Close on the paper trail line.

---

## Known Limitations (graded — read before judging)

- **Scores:** cards show rank/source/tags, **not** per-candidate cosine/HD numbers (re-rank happens provider-side; numeric face re-scoring is future work).
- **pHash:** robust to JPEG re-encode / crop ≤15% (HD 0 identical, 1–5 very similar, 6–15 somewhat); fails on rotation >15° / heavy adversarial overlay.
- **Lens scope:** reverse-image match, not identity proof; tiny/low-res crops return weak matches — use a clear front-facing photo.
- **Vision fallback:** needs billing linked on the GCP project even for the free tier (or it 502s); ranking is weaker than Lens.
- **Consent:** EIP-712 helpers live in `app/lib/ethers.ts`; the UI currently anchors a zero-hash consent placeholder (sprint scope) — typed-data signing is the next wire-up.
- **Synthetic:** deferred — `NullProvider` → UNKNOWN; 2022-era ViT detectors miss modern generators at 5–15% FP, so no fake-certainty badges.
- **Model:** GhostFaceNet (~7M params, CPU-fast) trails ArcFace ~1–2pp on LFW; swap via one param.
- **Chain:** local 31337 has no public explorer; duplicate `anchor()` reverts by design (`exists` guard) — restart the node for a clean demo seal.
- **Privacy:** hash-only on chain; raw face lives in memory only. Biometric = sensitive data (DPDP Act 2023): use consented/public photos only.

---

## Verification Semantics

| Claim | Prove | Shown |
|-------|-------|-------|
| Face encoded | 512-d + quality + pHash bits from local model | Intake metrics + checklist + bit chart |
| Genuine find | live `search_id` + provider chip per search | Discovery header + copy button |
| Integrity | recomputed SHA == on-chain SHA | Expected vs Computed |
| Provenance | manifest existed at block time | Block + tx + FILED stamp |
| Tamper-evidence | 1-char mutation diverges digest | TAMPERED stamp + shake + reset |

## Future Work

Synthetic provider (UncovAI/HFViT one-line swap), per-candidate cosine/HD re-score, IPFS CID via Pinata, Merkle batch for 100+ evidences, EIP-712 modal wiring, Amoy explorer clip.

## Submission

- GitHub: https://github.com/athmabhiram1/hhgoa_task3
- Video: unlisted link (record per `.omo/VIDEO-SCRIPT.md`)
- Form: https://forms.gle/oZbQGuwiNeHVcHWo8 (one-shot, incognito) before **Sep 7 23:59 IST**
