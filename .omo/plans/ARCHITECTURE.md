# Architecture — DPRK-Inspired Stolen-Profile Detection
## HH Goa 2026 Task 3 — Local Hardhat + Dual-Canonical-Hash + Face-Ranked Lens

**Invariant:** Face → Genuine Social Find (search_id) → Canonical Dual-Hash → Chain Lineage → Re-verify + Tamper Climax.
**Chain:** Hardhat 31337 local default (instant, 0 gas, explorer) + Polygon Amoy 80002 toggle (public Polygonscan, gated faucet). No Vercel for submission.

```text
Input: suspect LinkedIn headshot (front, >200px)
  → Face Detection/Crop/Quality (DeepFace GhostFaceNet + retinaface, Windows pip, no cmake)
  → Embedding 512-d (cosine) + pHash-64 (DCT)
  → Discovery: Lens (engine=google_lens, image_id) — fallback Vision Web Detection — fallback mock fixture (search_id preserved)
  → Candidate Fetch: top 8, filter instagram|x|facebook|reddit, keep search_id + raw URLs
  → Re-rank: cosine vs HD (HD≤5 very similar)
  → Canonicalize: JCS RFC8785 via rfc8785 (Py) / JCS (JS) UTF-16BE sort {url_norm, image_bytes, ts_iso, platform, pHash, string-only} → manifest
  → Hash: SHA256(JCS) + pHash(canonical image) → manifestHash + pHashStr
  → SyntheticRisk: SyntheticRiskProvider.NullProvider (deferred, pluggable) → UNKNOWN badge
  → Consent: EIP-712 TypedData hash (faceHash+purpose+ts, chainId 31337, verifyingContract)
  → Anchor: FaceAnchor.sol Option D `anchor(sha, phash, url, cid, prev, consentHash)` event Anchored(sha, phash, url, prev)
  → Verify: recompute SHA + pHash, compare HD, walk prev lineage
  → UI: 3-Card (Input / Discovery / Custody) + Tamper Inject → Expected vs Computed + HD banner + QR
```

### Contract (FaceAnchor.sol ^0.8.28, optimizer 200)

```solidity
struct Anchor { bytes32 sha; uint64 phash; string url; string cid; bytes32 prev; uint64 ts; address consenter; bytes32 consentHash; }
mapping(bytes32 => Anchor) public anchors;
event Anchored(bytes32 indexed sha, uint64 phash, string url, bytes32 prev, address consenter);
function anchor(bytes32 sha,uint64 phash,string calldata url,string calldata cid,bytes32 prev,bytes32 consent) external {
  require(anchors[sha].ts==0,"exists");
  anchors[sha]=Anchor(sha,phash,url,cid,prev,uint64(block.timestamp),msg.sender,consent);
  emit Anchored(sha,phash,url,prev,msg.sender);
}
function verify(bytes32 sha) external view returns (bool exists, uint64 phash, string memory url, bytes32 prev, uint64 ts) { Anchor memory a=anchors[sha]; return (a.ts!=0,a.phash,a.url,a.prev,a.ts); }
```

### Data Flow: Canonical Is King (Context7 + Gemini audit: UTF-16 trap)

`image bytes` changes on every IG re-save (Blocsys 2026: 42% failures from near-duplicates). So never hash raw bytes. Build `manifest = {url: normalized, image: base64 of cropped face region (strip EXIF), retrievedAt: ISO, platform, search_id, canon_version:"canon_v1"}` with **string-only payload** (no floats — ECMA-262 vs C float→string divergence). Hash via `rfc8785.dumps(manifest)` in Python (UTF-16BE sort) and JCS in JS — not `json.dumps(sort_keys=True)` which sorts on code points not code units (😀 astral diverges). `SHA256(JCS) → 0x...` Stored. pHash is of the **cropped canonical image** only. Include test vector `{"😀":"y","a":"x"}`.

### Search Pipeline Detail

* SerpAPI Lens: `POST /search.json?engine=google_lens` with `image_id` (obtain via `https://serpapi.com/search?engine=google_lens` upload). Params: `type=visual_matches` + `q` optional. Response `visual_matches[] {title, link, source, thumbnail}` + `pages_with_matching_images`. Keep `search_metadata.id` as proof. Cost: <10 calls, cached 1h free, 50/hr.
* Vision Web Detection: `WEB_DETECTION` on base64 image → `pagesWithMatchingImages[] {url, pageTitle}` + `visuallySimilarImages[]`. No domain filter — `url.filter(social)` post. Cost: 1 unit/call, 1k free + $300.
* Mock fixture: `fixtures/lens_real.json` saved from a prior successful call — includes `search_id` — used only to demonstrate honest empty-state handling.

### 3-Card UI Contract (No Terminal Dump)

* **Card 1 Input:** Face crop preview, `GhostFaceNet 512-d`, `Quality 0.97 / Alignment OK`
* **Card 2 Discovery:** Ranked list (top 3), each: thumbnail, `pbs.twimg.com` tag, `Cosine 0.94`, `pHash HD=3 VERY_SIMILAR`, `Source X`, `search_id xyz789`, `provider: serpapi_lens|vision`
* **Card 3 Custody:** `Hardhat #31337 Block 5`, `Tx 0x…`, `Canonical SHA 0x8f2a…`, `pHash 101… (HD)`, `Prev 0x000→0x8f2a`, `Consent EIP-712 ✓`, `Status: VERIFIED` → after tamper: `TAMPER DETECTED (HD=16)` + `Expected vs Computed` copyable.

### Extension Seams

* `lib/synthetic.ts` `SyntheticRiskProvider` → `NullProvider` now. Future: `UncovAIProvider` (API, no bundle) or `HFViTProvider` (ONNX). Add without touching chain/UI.
* `lib/discovery.ts` `DiscoveryProvider` → `LensProvider` | `VisionProvider`.
* `lib/canonical.ts` JCS `canon_v1` — bump on policy change, old hashes retain version field. Backend `backend/requirements.txt` includes `rfc8785`; weights dir via `DEEPFACE_HOME=./backend/weights` + lazy `from deepface import DeepFace` inside endpoint + `uvicorn --workers 1` (not 4) avoids 4× RAM fork.

### Limits & Disclaimers (Wired to UI+README)

* HD≤5 very similar, >5 tamper per Zitler; rotation/adversarial beyond 15° will fail pHash — disclosed.
* Social scraping blocks handled via fallback, not bypass.
* Anchors prove *existence + lineage*, not ownership/attribution to DPRK — disclaimer banner mandatory.

*End — Architecture — Sep 2, 2026*
