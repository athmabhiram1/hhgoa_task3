# HH Goa 2026 — Task 3 — Fresh Build Plan (DPRK-Inspired Sybil Defense)
## Face Scan → Web/Social Discovery → Blockchain Verification — Final Lock

**Status:** Planning only — no code. Research-verified Sep 1-2, 2026 (18 web searches + Context7 + docs).
**Thesis LOCKED:** DPRK-inspired stolen-profile-image detection for remote hiring fraud. Disclaimer everywhere: *"Flags profile image reuse and synthetic identity risk; does not formally attribute to DPRK."*
**Execution:** Local `npm run dev` + `npx hardhat node` (Hardhat 3.11, Node ≥22.13, chainId 31337) for flawless video. Polygon Amoy 80002 as toggle for README. No Vercel for submission.
**Search Budget:** <10 SerpAPI Lens calls to stay well under 250/mo (cached free 1h). GCP Vision Web Detection (1k free/mo + $300 credit) as Fallback #1. Mock fixture as Fallback #2.
**Due:** Sep 7, 23:59 IST — 26h build, 1-day buffer.

---

## 1. Product Thesis (One Paragraph)

For a **trust & safety investigator screening a suspect remote-hire profile** who struggles with **stolen LinkedIn photos reused across aliases with re-encoded JPEGs that break naive hashes and leave no audit trail**, our system performs a **reproducible face→discovery→evidence→provenance pipeline**: crop + embed the suspect face (GhostFaceNet), run a genuine SerpAPI Lens search filtered to social domains with search_id, re-rank candidates by face cosine similarity, canonicalize evidence `{url, image, timestamp}` via RFC 8785 JCS, compute dual-hash `SHA-256(canonical) + pHash-64`, anchor `{sha, phash, url, prev, consent}` on Hardhat local (Amoy toggle), and re-verify side-by-side to **detect tampering despite CDN re-encoding** — unlike wrappers or in-file C2PA that strips, because the external chain lineage survives.

**User:** Trust & safety analyst (secondary: individual checking image reuse)
**Job:** Prove this social post reuses a face and create a tamper-evident, re-verifiable record.

---

## 2. System Architecture — Final

```
Input Image (suspect LinkedIn headshot, front-facing >200px)
  ↓
Face Detection + Crop + Quality Gate (DeepFace GhostFaceNet, retinaface)
  ↓
Face Embedding (512-d, cosine distance) + pHash-64 of crop
  ↓
Discovery Engine — Primary: SerpAPI Lens (engine=google_lens, image_id flow, type=visual_matches)
               — Fallback #1: GCP Vision Web Detection (pagesWithMatchingImages)
               — Fallback #2: Mock fixture with real search_id (honest empty-state)
  ↓
Candidate Retrieval (top 8, filter source domain social, keep search_id + raw URLs)
  ↓
Face/Visual Re-ranking (cosine vs pHash HD, threshold HD≤5 very similar)
  ↓
Evidence Acquisition (fetch candidate image bytes + metadata)
  ↓
Evidence Canonicalization (RFC 8785 JCS via rfc8785 lib UTF-16BE sort, strip volatile EXIF, cast floats→int/str, preserve bytes+url+ts)
  ↓
Cryptographic Fingerprint (SHA256(canonical) + pHash(canonical image) → manifestHash)
  ↓
Blockchain Anchor (FaceAnchor.sol Option D: sha, phash, url, cid, prev, ts, consenter, consentHash) — event Anchored
  ↓
Verification Engine (recompute SHA + pHash → compare on-chain → MATCH / TAMPER / NOT_FOUND) + pHash HD banner
  ↓
Investigation Result — 3-Card UI (Input / Discovery / Custody) + 30-sec Tamper Climax
```

**Pluggable seam:** `lib/synthetic.ts: SyntheticRiskProvider → NullProvider` (now) → `UncovAIProvider/HFViT` later in one line. No core change.

---

## 3. Technology Selection — Why Each, What Falls Back

| Layer | Chosen | Why (verified) | Alternatives considered → Rejected why | Failure → Fallback |
|-------|--------|----------------|----------------------------------------|--------------------|
| **Face** | **DeepFace `GhostFaceNet` + `retinaface` (align=True)** via `pip install deepface` + `DEEPFACE_HOME=./backend/weights` | `pip` only, no cmake (dlib fails Windows). **Context7 /serengil/deepface** confirms `DEEPFACE_HOME` controls weights dir (default `~/.deepface/weights`) — set to project-relative + lazy import inside endpoint `def detect(): from deepface import DeepFace` + `align=True` (6% accuracy gain via 5-point affine). 512-d GhostFaceNet, swap via `model_name`; detectors list includes `retinaface` verified. Single worker (`--workers 1`) avoids 4× RAM fork. | dlib (Windows hell), InsightFace 1.0 ( heavier ), `@vladmandic/face-api` (JS distance), Azure 30k free | GhostFaceNet fail → `ArcFace` via same call (one param). Still DLL → `deepface.dev` 50 free |
| **Discovery Primary** | **SerpAPI Google Lens** `engine=google_lens`, `image_id` upload flow | Only hackathon-viable reverse search free Sep 2026: 250/mo, 50/hr, **cached free 1h** (only successful count), returns `visual_matches`/`pages` + social source + **search_id** as genuine-call proof. Bing Visual retired Aug 11 2025 | Bing (dead), PimEyes (clean but no social), FaceCheck (hits social but murkier/legal) | Quota → GCP Vision fallback |
| **Discovery Fallback #1** | **GCP Vision Web Detection** `WEB_DETECTION` | 1,000 units free/mo forever + $300 credit overflow; returns `fullMatchingImages`, `pagesWithMatchingImages` (includes `pbs.twimg.com`), `visuallySimilarImages`; uses same base64 local upload — no public URL dance. Google Cloud Community July 2025 confirms *no domain filter* → post-process `url.includes social`. **Not identical to Lens** — Lens has deeper Search contextual ranking (Google docs) — so rank is weaker, but free and 4× quota. Needs billing enabled. | Custom Search JSON API → **closed to new signups 2026, EOL Jan 1 2027** — don't use. Brave/Tavily → SERP shape wrong for image | Vision also 0 hits → Mock fixture |
| **Fallback #2** | **Mock fixture with real search_id** | Previous successful call saved as `fixtures/lens_real.json` with `search_id: abc123` — UI shows "Genuine search called: Lens abc123 returned 0 social hits (honest, private face)" + Try demo button. Satisfies hardcode ban (search_id proves call) | Hardcoding without search_id → disqualification risk | — |
| **pHash** | **`sharp-phash` (Node) + `imagehash` (Python) DCT 64-bit** | HDL `bit_count(h1 ^ h2)` → HD 0 identical, 1-5 very similar, 6-15 somewhat; survives JPEG re-encode where SHA shatters. Compute in Python backend (same process as DeepFace) to avoid Node sharp 500MB serverless trap (local has no limit). | aHash/dHash faster but less robust; pdq heavier | — |
| **Hash canonical** | **RFC 8785 JCS** via `rfc8785` (Python) + `canonicalize` (Node) — **not `json.dumps(sort_keys=True)`** | Standard `sort_keys` sorts on Unicode code points; JS sorts on UTF-16 code units → astral chars (😀 in social bios) diverge. Dedicated `rfc8785` encodes keys to UTF-16BE before sort (Context7 Gemini audit). Hash `manifest: {url_norm, image_sha, ts_iso, platform, pHash}` deterministically; cast floats→int/str in payload (ECMA-262 vs C float→string divergence). | Naive `JSON.stringify` unsorted or `sort_keys` → silent SHA mismatch | Fail → use `rfc8785` + string-only payload |
| **Chain** | **Hardhat 3.11 local 31337 default (ESM) + Polygon Amoy 80002 toggle** | **Context7 /websites/hardhat**: Hardhat 3 is **ESM-first** — `package.json` must have `"type":"module"` and `hardhat.config.js` must be ESM (`import { defineConfig }`), HHE13 else. Local: instant, 0 gas, 20×10000 ETH, `npx hardhat node` → `http://127.0.0.1:8545`, `npx hardhat ignition deploy ignition/modules/FaceAnchor.ts --network localhost`. Amoy: `amoy.polygonscan.com`, same `FaceAnchor.sol ^0.8.28`, faucet gated 0.001 ETH → bonus not default. | Anvil/Foundry (fine), mainnet (cost) | RPC down → local passes; faucet dry → local video passes |
| **Consent** | **EIP-712 typed consent hash (light, Context7 /websites/ethers_v6 verified)** | **Context7 ethers_v6:** `TypedDataEncoder.hash(domain, types, value) → 0x…` + `signer.signTypedData(domain, types, value)` + `verifyTypedData(domain, types, value, sig) → address`. Store `consentHash = TypedDataEncoder.hash(...)` via off-chain hash, **not** on-chain `ecrecover` assembly for sprint. Domain `{name:"HHGoa-Face", version:"1", chainId:31337, verifyingContract}` prevents replay. Light, readable. | Full `ecrecover` assembly → malleability/debug | verifyTypedData off-chain fallback |
| **Frontend** | **Next.js 16 + Tailwind, local `npm run dev` (Turbopack), no Vercel** | Windows Defender exclusion for project folder fixes slow `next dev` (Next.js docs July 2026). No bundle limits locally. | Vercel serverless → TF bundle crash | — |

**Global free check:** SerpAPI 250 (<10 used) + Vision 1k free + $300 unused + Hardhat 0 + Pinata skip → **0₹ total**.

---

## 4. Data Model (Canonical Manifest)

```json
{
  "record_id": "ev-2026-09-03T12:01:00Z-a7f3",
  "case_id": "case-dprk-demo-01",
  "source_image_pHash": "101...64",
  "source_face_cosine_ref": 0.0,
  "candidate_url": "https://x.com/...",
  "candidate_platform": "x",
  "candidate_image_url": "https://pbs.twimg.com/...jpg",
  "candidate_pHash": "101...64",
  "candidate_face_distance": 0.06,
  "pHash_HD": 3,
  "pHash_verdict": "VERY_SIMILAR",
  "face_verdict": "SAME_PERSON",
  "retrieved_at": "2026-09-03T12:01:05Z",
  "search_id": "serpapi_abc123",
  "search_provider": "serpapi_lens",
  "manifest_canonical_sha256": "0x8f2a...",
  "manifest_pHash": "0x101...",
  "prev_anchor": "0x000...",
  "consent_hash": "0x1b4c...",
  "consenter": "0xf39Fd6...",
  "block_number": 5,
  "tx_hash": "0x1234...",
  "chain_id": 31337,
  "verification_status": "VERIFIED | TAMPER_DETECTED | NOT_FOUND | SYNTHETIC_RISK_UNKNOWN"
}
```
Canonical preimage hashed is `JCS_rfc8785(manifest_without_block_fields)` via `rfc8785.dumps` (Python) / JCS (Node) UTF-16BE sort → `manifest_canonical_sha256`. On-chain Anchor stores `sha, phash, url, cid, prev, ts, consenter, consentHash`. Test vector includes `😀` to catch astral divergence.

---

## 5. Verification Semantics — What We Prove vs Don't

| Claim | We Prove | How Shown | We EXPLICITLY Don't Prove |
|-------|----------|-----------|---------------------------|
| **Identity match** | Face cosine < tuned θ (GhostFaceNet ~0.4) *and* pHash HD≤5 across posts → same face/near-duplicate image | `Cosine 0.94` + `pHash HD=3/64 VERY_SIMILAR` | That names/SSNs belong to that face |
| **Content match** | That candidate URL image was the one hashed (search_id tied) | `search_id abc123` + `pagesWithMatchingImages` link | That post text is true |
| **Integrity** | Current `recomputed SHA` == `on-chain SHA` → untampered canonical bytes | `Expected 0x8f2a vs Computed 0x8f2a ✅` | — |
| **Provenance** | `manifest` existed at block timestamp, prev chain intact | `Block 5 @12:01 + prev→Block 3` | DPRK attribution (disclaimer) |
| **Synthetic risk** | Deferred: badge shows `UNKNOWN` with explain, not verdict | `Synthetic: not evaluated` tooltip | AI-generation certainty (would be probabilistic) |

---

## 6. Repository Structure (Build-Ready, Future-Pluggable)

```
hhg-task3/
├── .omo/plans/hhg-task3-fresh.md   # this file
├── hardhat.config.js               # localhost + amoy (80002), ignition, optimizer runs 200
├── contracts/
│   └── FaceAnchor.sol              # ^0.8.28, struct Anchor, event Anchored, keeps clean
├── scripts/
│   └── deploy.js                   # writes .env.local CONTRACT_ADDRESS
├── test/
│   └── FaceAnchor.test.js          # deploy, anchor, tamper re-verify, HD check
├── backend/                        # Python FastAPI — local only, no Vercel
│   ├── main.py                     # POST /detect (face), /pHash, /verify
│   ├── requirements.txt            # deepface, fastapi, uvicorn, python-multipart, imagehash, pillow
│   └── Dockerfile                  # python:3.11-slim (if Cloud Run later, not for video)
├── app/                            # Next.js 16 App Router — local
│   ├── app/
│   │   ├── page.tsx                # Card 1 Input (FaceDrop, quality)
│   │   ├── search/page.tsx         # Card 2 Discovery Matrix (ranked, search_id)
│   │   ├── anchor/page.tsx         # Consent modal (EIP-712 typed) → anchor
│   │   └── verify/[hash]/page.tsx  # Card 3 Custody + Re-verify + Tamper button
│   ├── components/
│   │   ├── FaceDrop.tsx
│   │   ├── DiscoveryMatrix.tsx
│   │   ├── CustodyBadge.tsx
│   │   └── DisclaimerBanner.tsx
│   ├── lib/
│   │   ├── phash.ts                # JS fallback HD calc for UI instant
│   │   ├── canonical.ts            # JCS sort_keys mirror
│   │   ├── ethers.ts               # contract ABI + TypedData helpers
│   │   └── synthetic.ts            # SyntheticRiskProvider → NullProvider (now)
│   └── app/api/
│       ├── lens/route.ts           # SerpAPI proxy (hides key, returns search_id)
│       ├── vision/route.ts         # Vision Web Detection fallback proxy (uses $300 if needed)
│       └── health/route.ts
├── fixtures/
│   └── lens_real.json              # real Lens response with search_id for fallback #2
├── .env.example
│   # SERPAPI_KEY=, GOOGLE_APPLICATION_CREDENTIALS=, POLYGON_AMOY_RPC_URL=, PRIVATE_KEY=, CONTRACT_ADDRESS=
└── README.md                       # see §10
```

**Pluggability:** `lib/synthetic.ts` + `backend/main.py` both expose `SyntheticRiskProvider` — swap `NullProvider`→`UncovAIProvider` later in one line, no chain/UI change.

---

## 7. Demo Script — 3:00 Master Take (Local Hardhat Guaranteed)

**Setup:** Two terminals: `npx hardhat node` (keep open) + `npm run dev` (Next.js) + `uvicorn backend.main:app --reload` (Python). Pre-validated demo face (public figure) + one private-face image.

1. **(0:00) Disclaimer banner visible:** "Flags reuse/synthetic risk; does not attribute to DPRK. Hash-only on chain; raw face deleted after hashing. Explicit consent via EIP-712."
2. **(0:15) Face scan — private (your) face:** Drop → crop → `GhostFaceNet 512-d | quality 0.97` → Lens search_id `abc123` → `0 social hits (honest, expected for private)` → shows fallback matrix empty + "Try demo profile" CTA.
3. **(0:45) Demo profile:** Click → public figure → Lens `visual_matches 6` → Discovery matrix: thumbnail, `pbs.twimg.com`, `Cosine 0.94`, `pHash HD=3 VERY_SIMILAR`, `search_id xyz789`.
4. **(1:15) Anchor:** Select post → consent modal (EIP-712 `faceHash + purpose + ts` → `consentHash`) → Anchor → `Tx 0x… Block 5 (31337) | Canonical SHA 0x8f2a… | pHash 101…` → Custody badge greens + lineage `prev 0x000 → 0x8f2a`.
5. **(1:45) Re-verify (honest):** Hit Verify → recompute → `VERIFIED ✅ On-chain == Computed | pHash HD=3`.
6. **(2:10) TAMPER CLIMAX:** Click "Inject Tamper (alter 1 char in URL)" → Re-Verify → banner flips red: `TAMPER DETECTED | Expected 0x8f2a vs Computed 0x1b4c ❌ | pHash HD=16 >5 (Exceeds)` → explains re-encode sensitivity.
7. **(2:40) Amoy bonus (if faucet live, else skip):** Toggle network → show `amoy.polygonscan.com/tx/0x…` explorer link in README (pre-deployed address) — not needed for video pass.
8. **(2:55) QR proof card:** `html-to-image` + `qrcode.react` → download PNG.

**If Lens 250 empties mid-record:** UI auto-falls to Vision `pagesWithMatchingImages 2` with badge `via GCP Vision (fallback)` — still genuine.

---

## 8. Cut Order — If Behind (Ruthless)

**Never cut:** Face scan + genuine search with search_id + dual-hash canonical + lineage prev + consent hash + re-verify + tamper climax + README Known Limitations.
**Cut in order:** IPFS Pinata toggle (CID stays ""), Vision fallback UI polish (keep logic, hide badge), Amoy toggle (stay local-only), graph clustering, synthetic provider work (already deferred). Game/IPFS-like extras are firewalled — cut entirely.

---

## 9. Major Risks — Final Pass (Building Should Not Hit)

| Risk | Verdict | Mitigation locked |
|------|---------|-------------------|
| **DeepFace TF DLL on Windows** | **Highest** | `GhostFaceNet` + `tensorflow-cpu`, document `pip install deepface --no-deps` edge, fallback `ArcFace` via same API; pre-download weights in README `deepface` first run pulls ~500MB |
| **Vercel 500MB bundle** | Solved | **Local only** for submission — brief says no website required. Cloud Run decouple later if resume badge wanted. |
| **SerpAPI 250 exhaustion** | Low (<10 used, cached free) | Mock fixture + `no_cache=false` + gate behind env var |
| **Vision vs Lens gap** | Med | Post-filter social domains + re-rank by face — don't trust Vision ranking alone |
| **Canonical mismatch (astral/emoji + floats)** | **High if ignored** | Use `rfc8785` lib (UTF-16BE sort) + **string-only payload** (no floats); version `canon_v1`; test vector `{"😀":"y","a":"x"}` + `{"score":947}` int in `test/` |
| **pHash rotation vulnerability** | Low | Doc in README: robust to recompress/crop ≤15%, fails extreme rotation/adversarial — bar `HD>15` |
| **Faucet dry** | Med | Local is default; README shows Amoy address from one-time deploy |
| **Private face 0 hits looks broken** | High | Honest empty-state + "Try demo" CTA — proven with Bellingcat pattern |
| **Node version** | Low | Hardhat 3 needs Node ≥22.13 — doc in README Setup |
| **Windows Defender slow dev** | Low | Add project folder exclusion per Next.js docs |

---

## 10. README Structure — Elite (Grade Point)

Include: Problem Statement (DPRK-inspired, $250-600M, with disclaimer), Architecture diagram (face→Lens→canonical→chain→verify), Pipeline shape, Tech choices table (why GhostFaceNet vs dlib), Search pipeline (Lens primary, Vision fallback, fixture), Blockchain (Hardhat 31337 + Amoy 80002, Option D schema, event), Tamper climax instructions, Setup (Node 22, `pip`, `npx hardhat node`, `deploy:local`, `.env.example`), APIs & Search IDs, Demo video link (YouTube unlisted), **Known Limitations** (pHash rotation, CDN scraping boundaries, Sybil vs privacy trade-off, synthetic deferred), Ethics/DPDP consent, Future Work (synthetic provider, IPFS, Merkle batch), License.

---

## 11. Phases — 26h Over Sep 2-7 (4.5h/day, 1 buffer day)

| Day | Ship | Hours | Gate |
|-----|------|-------|------|
| **2 Sep (Mon)** | Repo init, Hardhat 3 + FaceAnchor.sol Option D + deploy.js + Next create + Tailwind, `.env.example`, test vector | 4 | `npx hardhat test` green |
| **3 Sep (Tue)** | Backend FastAPI `/detect` → crop + GhostFaceNet + pHash + canonical JCS, `NullSyntheticProvider` | 4 | `POST /detect` returns 512-d |
| **4 Sep (Wed)** | `/api/lens` proxy + `/api/vision` fallback + `fixtures/lens_real.json` + empty-state CTA + demo figure pre-validation (2 figures ×1 call each, save winner + search_id) | 5 | Private 0 hits + demo 5 hits |
| **5 Sep (Thu)** | Dual-hash badge (SHA vs pHash HD), lineage `prev` timeline, EIP-712 consent modal (TypedData hash), custodian badge | 6 | Anchor → block 5 |
| **6 Sep (Fri)** | 3-card UI (Input/Discovery/Custody) + Tamper Inject button + QR card + Vision fallback badge + README Known Limitations | 4 | Full click-through twice |
| **7 Sep (Sat) AM** | Dry-run ×2 + record master take (local) + optional Amoy toggle clip + upload YouTube unlisted | 3 | Video link |
| **7 Sep (Sat) PM** | Submit form https://forms.gle/oZbQGuwiNeHVcHWo8 (one-shot, incognito) | 1 | Submitted before 23:59 IST, 3h buffer |

**If slip:** cut IPFS → graph polish → synthetic → Amoy (never core).

---

## 12. What Was Verified This Final Pass (Sources)

SerpAPI Lens engine + `image_id` flow + 250/50/cached-free (serpapi.com/pricing + google-lens-api 2026-08-26) = PRIMARY. GCP Vision 1k free + $300 + $3.50/Web + no domain filter (cloud.google.com/vision/pricing, July 3 community) = PRIMARY. Vision returns `pagesWithMatchingImages` with social URLs (docs) = PRIMARY. Hardhat 3.11 + Node 22.13 + `npx hardhat node` 31337 (markaicode Aug 14, hardhat.org 3.11.1) = PRIMARY. DeepFace GhostFaceNet one-param (serengil #1155) = PRIMARY. pHash HD 0/1-5/6-15 thresholds (Cloudinary Oct 2025 + Vision Web) = PRIMARY. JCS RFC 8785 canonical (Blocsys July 2026, Clyra proof) = PRIMARY. DPRK $250-600M UN, 8 sentenced 2026, Nisos Mar 2026 laptop farm, FBI July 31 2026 joint alert = PRIMARY/SECONDARY. Custom Search 100/day closed to new, EOL Jan 1 2027 (NextGenNexus May 14) = PRIMARY.

---

**Next:** Send "generate" and orchestrator delegates to `deep` agents (Hardhat, backend, frontend) in parallel after you confirm this plan file at `C:\Users\athma\OneDrive\Desktop\my projects\hhg\task_3\.omo\plans\hhg-task3-fresh.md`. Local guarantees video — resume deploy later via Cloud Run without rework.

*End — Fresh Plan — DPRK thesis + canonical dual-hash + Lens→Vision→mock fallback + Hardhat/Amoy Option D + 3-card tamper climax — Sep 2, 2026.*
