# Phases — Build Timeline (Local, No Vercel, No Paid)

## Day 0 (Sep 2) — Research Lock (Done)
* Thesis DPRK Sybil, dual-canonical-hash, Hardhat 31337/Amoy 80002 Option D, Lens→Vision→mock fallback, 3-card tamper climax, pluggable synthetic slot.
* Deliverables: this plan + ARCHITECTURE.md + PHASES.md at `.omo/plans/`. No code.

## Phase A — Sep 2 Eve (4h) — Chain + Repo Skeleton
**Goal:** `npx hardhat test` green, ignition deploys locally, contract event visible.
* Tasks: `package.json` with `"type":"module"` (Context7 HHE13 — Hardhat 3 ESM-first) + `hardhat.config.js` as ESM `import { defineConfig }`, `contracts/FaceAnchor.sol` Option D, `scripts/deploy.js` ESM, `test/FaceAnchor.test.js` (anchor + duplicate guard + verify + HD + JCS astral vector), `.env.example`, `.gitignore`.
* Problems to watch: Node ≥22.13 for Hardhat 3.11; HHE13 if missing `"type":"module"`; optimizer runs 200; provider 127.0.0.1 only;
* Done: `npm run node` shows 20 accounts, `npm run deploy:local` prints `0x5FbDB231...`, `npm test` passes.

## Phase B — Sep 3 (4h) — Backend Face + pHash + Canonical
**Goal:** `POST /detect` on local Python returns 512-d + pHash + JCS hash.
* Tasks: `backend/main.py` (FastAPI lazy `from deepface import DeepFace` inside endpoint + `DEEPFACE_HOME=./backend/weights` env, GhostFaceNet+retinaface `align=True`, `imagehash` pHash, `rfc8785` JCS UTF-16BE + string-only payload), `requirements.txt` includes `rfc8785 deepface fastapi uvicorn imagehash`, `lib/synthetic.ts` NullProvider, `lib/canonical.ts` mirror (JCS).
* Run: `uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1` (not 4 — 4× RAM fork → OOM, Gemini audit). Problems: first run ~500MB weights to `DEEPFACE_HOME`; TF DLL → `tensorflow-cpu`, fallback `ArcFace`; astral emoji → test `{"😀":"y"}`; heavy crop fails pHash → disclose.
* Done: `curl -F file=@demo.jpg http://localhost:8000/detect` returns `{embedding:512, phash:"101...", canonical_sha:"0x..."}`.

## Phase C — Sep 4 (5h) — Discovery Engine + Honest Demo
**Goal:** Private face 0 hits (honest) + demo public-figure 5 hits, both with search_id.
* Tasks: `app/api/lens/route.ts` (hide SERPAPI_KEY, propagate search_id), `app/api/vision/route.ts` (GCP credentials via `GOOGLE_APPLICATION_CREDENTIALS`), `fixtures/lens_real.json` (saved real response), `components/FaceDrop.tsx` + `DiscoveryMatrix.tsx` + empty-state CTA.
* Pre-validation: Run 2 demo figures ×1 Lens call each locally, save winner + search_id. Keep cached (1h free) to stay <10 calls.
* Problems: Lens needs public URL — use base64 image_id flow (SerpApi docs) not URL dance; Vision has no domain filter — post-filter; Vision needs billing enabled even for free tier.
* Done: Two paths tested: your face → `0 social` + search_id, demo → `visual_matches 6` with `pbs.twimg.com`.

## Phase D — Sep 5 (6h) — Custody + Consent + Lineage
**Goal:** Anchor → Block 5, linear prev chain, consent badge, re-verify side-by-side.
* Tasks: `lib/ethers.ts` (Context7 `TypedDataEncoder.hash/verifyTypedData/signer.signTypedData`, domain `{name:"HHGoa-Face", version:"1", chainId:31337, verifyingContract}`), Consent modal → `consentHash`, `app/anchor/page.tsx` → `contract.anchor(...)`, `app/verify/[hash]/page.tsx` (recompute + HD banner), lineage walking `prev`.
* Problems: Don't try Solidity `ecrecover` assembly for deadline — store hash, verify off-chain; chainId must match `31337` in typed domain or sig fails.
* Done: Tx hash + block visible, verify shows `Expected==Computed ✅`, lineage `0x000→0x8f2a`.

## Phase E — Sep 6 (4h) — 3-Card Polish + QR + README
**Goal:** Full click-through twice, QR proof card, elite README.
* Tasks: 3-card Tailwind layout (Input/Discovery/Custody), Tamper Inject button (mutates 1 char in canonical URL → HD=16 banner), `qrcode.react` + `html-to-image` QR, Vision fallback badge `via GCP Vision`, `.env.example`, `README.md` with Known Limitations.
* Problems: Windows Defender slows `next dev` → add Defender exclusion for project folder; Turbopack trace if slow.
* Done: Two dry runs succeed without terminal.

## Phase F — Sep 7 AM (3h) — Record + Upload
* 2 takes: Master local Hardhat tamper climax (3:00), Bonus Amoy clip if faucet grants (Polygonscan link). Upload YouTube unlisted, Drive mirror.
* Problems: `npx hardhat node` must stay open in separate terminal during record; keep `search_id` visible.

## Phase G — Sep 7 PM (1h) — Submit
* One-shot https://forms.gle/oZbQGuwiNeHVcHWo8 incognito, attach GitHub + video link, 3h buffer before 23:59 IST.

**Cut order if slip:** IPFS → graph polish → synthetic work (already deferred) → Amoy (stay local) — never core.

*End — Phases — Sep 2, 2026*
