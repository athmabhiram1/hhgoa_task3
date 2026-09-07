# HANDOFF — HH Goa Task 3 · SybilWatch (DPRK Sybil Defense)
## For the next agent: everything built, proven, pending, and the 1-day runbook
**Date:** Sep 4, 2026. **Deadline:** Sep 7, 23:59 IST. **Money spent:** 4 SerpAPI Lens searches of 250 free. **Theme:** final (bench/paper/verm). **Rule:** local only, no Vercel for video.

---

## 1. THE ASSIGNMENT (verbatim essentials, HH Goa Task 3)

Pipeline: **face scan → genuine web/social find (≥1 real matching post, NOT hardcoded) → blockchain upload + re-verify**. Any face lib. Any chain (local/simulated allowed). No website required. Deliverables: **GitHub repo + README (what/how/chain/limitations) + unedited screen recording** (face→post→chain). One-shot form https://forms.gle/oZbQGuwiNeHVcHWo8. USP layered on top: DPRK-inspired stolen-profile detection for remote-hiring fraud, with disclaimer *"Flags reuse/synthetic risk; does not attribute to DPRK."*

---

## 2. STATUS DASHBOARD

| Layer | State | Proof |
|---|---|---|
| Face (`backend/main.py` → GhostFaceNet 512-d + retinaface + pHash-64 + JCS) | ✅ PROVEN LIVE | `POST 8000/detect` → 200, 512-d, `phash e9e6258c…`, `canon 0xa5c5…`, face box — twice, byte-identical |
| Discovery (`app/api/lens` → SerpAPI `image_id` flow, Vision fallback, mock fixture) | ✅ PROVEN LIVE | Stock face → 5 live matches; CR7 → 8 hits (Wikipedia + Instagram), `search_id 6a9aec0f…` saved to `fixtures/lens_real.json` |
| Re-rank (cosine + Hamming in `app/Wire.tsx`) | ✅ PROVEN LIVE | Board showed `cos ~0, HD 0` wiki dup on top via Playwright |
| Chain (`contracts/FaceAnchor.sol` Option D) | ✅ PROVEN LIVE (script) / ❌ NOT WIRED TO UI | `qa-chain.mjs` → DEPLOYED → ANCHORED block 4 → VERIFY true → DUP_REJECTED → TAMPER_MISS false (script since removed). **Seal button still simulates (1900ms fake tx)** — THE gap |
| Frontend (SYBILWATCH replica + `Wire.tsx`) | ✅ SERVING, live-swapping | Playwright: LIVE pill, real `search_id` chip, CANDS swap, honest empty-state (clears board, disables Seal) |
| README / video / submit | ❌ PENDING | README.md exists (elite skeleton); video + form left |

---

## 3. ARCHITECTURE (as built)

```
suspect headshot (>200px, front)
 → DeepFace GhostFaceNet 512-d + retinaface align=True + ImageHash pHash-64 (backend :8000, --workers 1, DEEPFACE_HOME=./backend/weights)
 → SerpAPI Lens image_id 2-step (≤500KB, x-search-id) → Vision WEB_DETECTION fallback → mock fixture (real search_id)
 → top-8 re-rank (cosine desc, HD asc; HD≤5 VERY_SIMILAR)
 → JCS RFC8785 via rfc8785 (UTF-16BE, string-only, 😀 canary, canon_v1) → SHA256 + pHash
 → FaceAnchor.sol anchor(sha,phash,url,cid,prev,consentHash) [31337 local default, Amoy 80002 toggle] → verify() → MATCH/TAMPER
 → 3-route UI (#/ → #/specimen → #/sources → #/proof) + tamper climax + QR proof card
```

**Contracts:** `POST /detect → {embedding[512], phash 64b, phash_hex, canonical_sha, crop_b64, facial_area}` · `POST /phash` · `POST /api/lens → {search_id, visual_matches[8]+_is_social, x-search-id}` · `POST /api/vision → {pagesWithMatchingImages, visuallySimilarImages}` · `anchor/verify` as above. `SyntheticRiskProvider → NullProvider (UNKNOWN, deferred deliberately)`.

## 4. FILE INVENTORY (root `task_3/`)

`package.json` (type:module, Next 15, ethers 6, hardhat 3.11) · `hardhat.config.js` (ESM, 31337 + Amoy) · `next.config.mjs` (outputFileTracingRoot fix) · `contracts/FaceAnchor.sol` · `ignition/modules/FaceAnchor.ts` · `test/FaceAnchor.test.js` (4 tests; note: Hardhat 3 runs only Solidity suites — JS suite needs `@nomicfoundation/hardhat-ignition`) · `backend/main.py` + `requirements.txt` (deepface 0.0.93, TF>=2.16 for py3.12) · `app/{page.tsx,layout.tsx,globals.css,Wire.tsx,lib/{canonical,ethers,phash,synthetic}.ts,api/{lens,vision,detect,phash}/route.ts}` · `fixtures/lens_real.json` (REAL CR7 search, 8 hits) · `test/wire-pill.test.mjs` (5 pass) · `test.html` (single-file tester) · `test-face.jpg` (stock control) · `cr7.jpg` (demo) · `gcp-key.json` (gitignored) · `README.md` · `.env` (SERPAPI_KEY set) · `.omo/plans/{hhg-task3-fresh,ARCHITECTURE,PHASES,frontend,ANTI-WRAPPER-RESEARCH,TEST-REPORT-stock-face}.md`

## 5. EVIDENCE LOG (all manual QA, real surfaces)

* `curl 8000/health` → `ok:true` · `curl -F file=@test-face.jpg 8000/detect` → 200 512-d ×2 identical · `curl -F 3001/api/phash` → identical hex · `eth_chainId` → `0x7a69` · qa-chain → block 4 + dup-reject + tamper-miss · Playwright stock → LIVE pill + live_0..4 + chip `6a99af71…` · Playwright CR7 → wiki dup cos~0/HD0 + chip `6a9b1bd7…` · `node --test test/wire-pill` → RED 2fail → GREEN 5pass.
* Spend: 4 Lens searches (stock curl, stock board, CR7 curl, CR7 board+fixture). Vision untouched (billing off).

## 6. GAPS RANKED (do in this order, ~6h)

**P0 — submission blockers:**
1. **Seal → real `anchor()` receipt (2h).** `app/lib/ethers.ts` has `TypedDataEncoder.hash`+`getContract`; call from Seal handler → `receipt.blockNumber/hash` into `dTx/txBlk`; `npm i @nomicfoundation/hardhat-ignition`; `npx hardhat test` green. Test: RED (button fakes) → GREEN (real tx) → Playwright receipt visible.
2. **Kohli demo (30m).** `demo-face.jpg` (Virat Kohli 480px) → 1 Lens call → expect 3+ SAME FACE → save id to fixture. Test: chip shows new id, cards re-ranked.
3. **Record + submit (3h).** 3:00 master take (disclaimer → private 0-hits → Kohli → Block → VERIFIED → tamper red → QR) → YouTube unlisted → form one-shot.

**P1 — anti-wrapper visibility (only if P0 done):** SHA-shatters/pHash-holds split view · C2PA read-only line (`c2patool --info`, cite UMBC 2026 strip finding) · cosine beside HD as large mono with `—` gaps (never `0.00`).
**DO NOT:** retrain ArcFace, FAISS ≤8, on-chain ecrecover, synthetic gate, IPFS, multi-chain, Vercel video, direct IG/Reddit scrapers (ToS; Lens already indexes them).

## 7. RUNBOOK (3 terminals, `task_3/` root)

```powershell
npx hardhat node                      # T1, keep open, 8545
.\.venv\Scripts\Activate.ps1; uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1 --reload   # T2, workers 1 only (4x forks OOM)
npm run dev                           # T3, :3000 incognito (kills OmniLearn cache)
```

## 8. TRAPS ALREADY FIXED (do not regress)

* `window.ingestFile` override → infinite recursion (function declaration hijack). Direct input listener only.
* `window.CANDS` gate → lexical `const` invisible on window; use indirect eval accessors.
* Shell resets `input.files` before our listener → hook `#probe` data-URL instead.
* Browser can't reach `:8000` (per-process firewall) → same-origin `/api/detect|phash` proxies; backend CORS now includes :3001.
* `rfc8785.dumps` returns bytes (not str) → encode guard. `/tmp` → `tempfile` (Windows). TF 2.15 → `>=2.16` (py3.12). `package.json type:module` for Hardhat 3 HHE13. CRLF → LF hydration guard.

## 9. AGENT-INFRA NOTE (why no subagent receipts)

Explore 0-for-7 (`opencode/gpt-5-nano` 404), librarians 0-for-5 (30m stalls), plan aborts on invoke — all logged in `Temp\ulw-20260904-6e4d69.md`. Everything above was verified directly (CodeGraph verbatim + curl + Playwright). Don't retry lanes; execute §6.

*End — handoff — Sep 4, 2026.*
