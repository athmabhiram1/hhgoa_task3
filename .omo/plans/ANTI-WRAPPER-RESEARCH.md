# ANTI-WRAPPER RESEARCH DOSSIER — HH Goa Task 3 (SybilWatch)
## Research-only. No code changed. Theme final (bench/paper/verm), layouts editable.

**Date:** Sep 4, 2026. **Deadline:** ~1–2 days. **Question:** is this an AI wrapper, and what makes it not one?
**Verdict up front:** The *architecture* is not a wrapper. The *demo as it runs today* looks like one — because every live branch currently falls through to mock (no `SERPAPI_KEY`, Vision billing disabled, seal button simulated with 1900ms timeout, hardcoded `CANDS`). Fixing that perception takes ~6–8h, not a rebuild. This dossier ranks exactly what to do.

Evidence: CodeGraph verbatim reads (`backend/main.py`, `app/Wire.tsx`, `app/api/lens/route.ts`, `contracts/FaceAnchor.sol`), live curl (512-d in 2.29s, `0xa5c5…`, chain `0x7a69`), Context7 (`/serengil/deepface`), Firecrawl/web (SerpAPI, Vision, IG/Reddit/X ToS, C2PA 2026 papers). Librarian lanes `bg_f59fe34d`/`bg_0764a1c6` still pending — this report uses direct-source fallback; fold their citations in if they return anything new.

---

## 1. WRAPPER AUDIT — layer by layer, honest

| Layer | Wrapper version (what judges fear) | What you actually built | Gap that makes it *look* like a wrapper today |
|---|---|---|---|
| Face | `DeepFace.verify(img1,img2)` one-liner, default VGG-Face | GhostFaceNet 512-d + retinaface + `align=True`, lazy import, `DEEPFACE_HOME` project-relative, `--workers 1`, Windows `tempfile`, quality gate — proven live `x92 y66 w91 h126, eyes 43px apart` | None in backend. But UI never shows *why* align matters — no side-by-side naive-crop vs aligned score. Judge sees a number, not a decision. |
| pHash | none (wrappers hash raw bytes) | DCT-64 via ImageHash, hex→64b binary, HD thresholds 0/1–5/6–15, survives JPEG re-encode where SHA shatters | UI shows HD but never *demonstrates* the shatter (no SHA-fails/pHash-holds split view). So pHash reads as "another hash". |
| Discovery | `requests.get(Lens)` top-1 blindly trusted | Lens `image_id` 2-step (500KB/10min), `visual_matches` top-8, `_is_social` tagging, cosine+pHash **re-rank**, Vision fallback, mock-with-real-`search_id` honest empty-state | **Biggest gap.** No `SERPAPI_KEY` set → every run returns `x-mock:1`. Vision → `502 BILLING_DISABLED #974927981415`. So Wire always keeps hardcoded `CANDS` (`@dev_candidate 0.06/3…`, `lens_live_71f49a`). Any face → same 5 cards. This single fact is 80% of the wrapper smell. |
| Canonical | `sha256(image_bytes)` (breaks on every re-save) | RFC 8785 JCS via `rfc8785` UTF-16BE sort, string-only payload, `😀` astral canary, `canon_v1` versioned | Correct, but invisible — manifest shown without the `sort_keys` divergence note. A judge can't tell it from naive hashing. |
| Chain | `mapping(string=>bool)` trophy tx | `FaceAnchor.sol` Option D (`sha,phash uint64,url,cid,prev,ts,consenter,consentHash`), `prev` lineage, `Anchored` event, EIP-712 off-chain hash (no `ecrecover` assembly — rational sprint call) | **Second-biggest gap.** UI Seal button is a 1900ms `setTimeout` that prints `txHash()` = `digest64('tx:'+id)` — a *fake* tx. No `ethers.Contract.anchor()` call, no `receipt.blockNumber`, no Polygonscan/local-explorer link. Tamper button mutates a local string, not a re-fetch vs chain. So custody is theater today. |
| Synthetic | wrapper adds "AI detector 98%" badge | `NullProvider → UNKNOWN` deferred, correctly (2022 ViT models miss SDXL/MJ5, 5–15% FP on compressed real photos) | Correct call. Keep deferred. |

**Bottom line:** 4 of 6 layers have real engineering; 2 (discovery-live, chain-live) are currently simulated. Un-simulate those two and the wrapper charge collapses.

---

## 2. PHOTO RETRIEVAL REALITY — Instagram / Reddit / Web (researched Sep 4, 2026)

**Do NOT build direct Instagram/Reddit scrapers. Lens already indexes them — that is the legal path.**

* **Instagram:** Basic Display API **dead Dec 4, 2024**. Graph API v22+ = own Business/Creator accounts only + Meta App Review (screencast, verification); hashtag search + business discovery need Facebook Login path. Python self-scraping = TLS-fingerprint + IP-reputation war, ~40h maintenance, account-ban risk. Managed scrapers work but cost per-1k profiles. Sources: SocialCrawl Aug 2026, HashScraper Mar 2026, KeyAPI Apr 2026, Meta docs.
* **Reddit:** Free tier 100 QPM OAuth / 10 QPM anon, non-commercial only. Commercial = ~$0.24/1k calls + manual 2–4 week approval + polling infra (no webhooks). Aggregation APIs ($159+/mo) exist because direct is painful. Sources: Octolens Mar 2026, Techloy 2026.
* **X/Twitter:** API paid tiers only; scraping violates ToS, needs residential proxies.
* **SerpAPI Lens (your primary):** `POST /image` (field `image`, ≤500KB) → `image_id` (10min) → `GET /search?engine=google_lens&image_id=` → `visual_matches[] {title,link,source,thumbnail,image}` + `search_metadata.id`. `type=visual_matches|exact_matches`, `no_cache=false` = cached free 1h, only successful count. Free 250/mo, 50/hr. Lens ranking uses Search contextual data Vision lacks — that's why Lens is primary, Vision is fallback. Sources: serpapi.com/google-lens-api, /google-lens-upload-an-image, pricing (250 free verified Aug 2026).
* **GCP Vision WEB_DETECTION (your fallback):** `POST v1/images:annotate` → `pagesWithMatchingImages[] {url,pageTitle}` + `visuallySimilarImages[]` (+ `pbs.twimg.com` proven in docs). **No domain filter** — post-filter `instagram|x|twitter|facebook|reddit` yourself. 1k free/mo + $300 credit, but **billing must be linked even for free** — your exact error (`BILLING_DISABLED #974927981415`). Sources: Google docs + July 2025 community answer.

**What this means for "get photos from Instagram/Reddit":** you don't. You query Lens/Vision (which crawl them legally under SerpAPI's shield), then fetch the returned `thumbnail/image` URLs for local re-embedding. Direct platform scraping = ToS violation + demo fragility. Your fallback chain (Lens → Vision → mock-with-real-`search_id`) is already the right design — it just needs keys + billing, not new code.

---

## 3. WHAT TO DO DIFFERENTLY — ranked for 1–2 days, theme untouched

**P0 — kills the wrapper charge (4–5h total):**
1. **One real Lens call (30 min, 1 of 250 free).** Set `SERPAPI_KEY`, restart `npm run dev`, `curl -F file=@demo-face.jpg /api/lens`, save `search_metadata.id` + `visual_matches` into `fixtures/lens_real.json` (replace `REPLACE_WITH_REAL…`). Demo face = Virat Kohli 480px (Indian judges recognise instantly, IG 270M footprint → 5–8 hits). Keep stock face as Control A (expect `[]` → honest `0 hits` toast). Cost: 1 search. Proof: `x-search-id` header (not `x-mock:1`).
2. **Real chain write from Seal button (2h).** Today: 1900ms fake `txHash()`. Change to: `ethers.JsonRpcProvider(127.0.0.1:8545) → Contract.anchor(canonicalSha, phashInt, url, "", prev, consentHash) → receipt.blockNumber/tx.hash` rendered in `dTx/txBlk` + `sealWrap`. Keep `prev` lineage (`prev = last anchor sha`). Proof: `Block 5, gas 0, 1 confirmation` becomes a real receipt. Needs `npm i @nomicfoundation/hardhat-ignition` for `npx hardhat test` (contract compiles; JS suite not picked up without it).
3. **Honest DEMO vs LIVE labeling (1h, layouts editable, theme final).** Add two pills in existing paper style: provider pill (`SerpAPI Lens` green / `Vision` amber / `Fixture` neutral) + `search_id` chip (copyable mono). When mock: banner "Private face: 0 social hits — honest empty-state" (already in Wire, just never triggers live). Judges forgive empty; they punish fake-full.

**P1 — makes depth visible (2–3h):**
4. **SHA-shatters/pHash-holds split view (1h).** In Proof cert, show both digests side-by-side on tamper: `SHA Expected vs Computed (diverge)` + `pHash HD=16>5`. Today only computed mutates. This single visual proves dual-hash isn't decoration.
5. **C2PA read-only check (1h, free, no upload).** `c2patool photo.jpg --info` or ContentCredentials.org on the *candidate* image → show "manifest: present/absent" line. C2PA proves origin-not-truth and strips on re-encode (UMBC 2026 audit: specs flawed/incomplete — cite it); your chain survives stripping. Positions you as knowing the standard, not ignoring it. Never write C2PA — only read.
6. **Cosine next to HD on every card (30 min).** Cards show HD today; Wire already computes `cos` but several paths leave `cos=0.4` default when thumb fetch fails (CORS `pravatar`/`randomuser` + hotlink blocks). Show `Cosine —` (em-dash, not fake number) when re-embed fails. Fake precision is wrapper behavior; honest gaps are forensic behavior.

**P2 — only if time (1h):**
7. **Evidence export = manifest JSON download** (you have QR canvas already). Include `search_id, provider, canon_version, HD, block, tx`. Judges screenshot this.

**Explicitly DO NOT (scope control):** train custom ArcFace, FAISS for ≤8 candidates (`O(8)` loop is nanoseconds), on-chain `ecrecover` assembly, synthetic AI-face gate in core path (2022 ViTs miss modern generators; keep `NullProvider`), IPFS/Pinata, multi-chain, direct IG/Reddit scrapers, Vercel for video (TF bundle trap — local only per plan).

---

## 4. UX NOTES — theme final, layouts editable

Keep bench `#0E0D0B`/paper `#E9E4D4`/verm `#E8492E`, Instrument Serif/Archivo/IBM Plex Mono, sticky-note board, red string, stamps, `TAMPERED` slam. Change only:
* `QUERY` chip: real `search_id` (14 chars) + provider pill — replaces fixed `lens_live_71f49a`.
* Card metric rows: `Cosine 0.06` + `HD 3/64` both large mono; `—` when uncomputable (never `0.00` placeholder).
* Proof cert: `EXPECTED (ledger)` vs `COMPUTED (local)` parity block already exists — feed it real `verify(sha)` values instead of `digest64` PRNG.
* Empty-state: keep demo 5 as *control samples* but badge them `CONTROL` when live returns 0 — honest, still useful.

---

## 5. TOMORROW'S PLAN (1–2 days)

1. Keys+billing (30m): `SERPAPI_KEY` + Vision billing link → verify `x-search-id` + `pagesWithMatchingImages` via `test.html`.
2. Real Seal (2h): wire `anchor()` → receipt → `dTx/txBlk/sealWrap`; `npm i hardhat-ignition`; `npx hardhat test` green incl `😀` canary.
3. Labels (1h): provider pill + search_id chip + `—` gaps + control badges.
4. Split-view tamper (1h) + C2PA read line (1h).
5. Two dry runs (stock→0-hits, Kohli→3 SAME FACE) + record 3:00 (tamper climax last) + submit one-shot.

**Judging translation:** brief asks face-encode + genuine search (not hardcoded) + chain re-verify. After P0, every line is provable: embedding (512-d response), search (`x-search-id`), chain (`Block 5, tx 0x…`). That's a system with receipts — the opposite of a wrapper.

*End — research-only, no files changed except this report.*
