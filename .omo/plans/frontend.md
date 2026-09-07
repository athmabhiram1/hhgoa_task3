# FRONTEND — Full Specification (OLED Forensics)
## HH Goa 2026 Task 3 — DPRK Sybil Defense / Face Verification

**Status:** Planning only — no code. Palette locked Sep 2: OLED `#030508` base, Forensic Green `#0B9534`, Neon Cyan `#00E5A0`, Tamper `#FF2E63`. Typography: Geist/Inter + JetBrains Mono. Layout: 33% / 42% / 25% 3-card investigator. This file is the build contract for local `npm run dev` + Hardhat `:8545` + FastAPI `:8000`. Also mirrored at `.omo/frontend/FRONTEND.md`.

---

## 1. Component Hierarchy & File Tree

```
app/
├── globals.css                      # Tailwind @theme + glass + scroll pipeline CSS
├── layout.tsx                       # <html dark> + Geist/Inter/JetBrains Mono + DisclaimerBanner sticky
├── page.tsx                         # Orchestrator: holds global state (see §4), renders Hero + 3-card grid + lineage rail
├── components/
│   ├── HeroSection.tsx              # Animated glowing pipeline beam (Face → Search → Blockchain) + scroll haze
│   ├── FaceInputCard.tsx            # Dropzone + KYC scan beam + crop preview + 512-d metrics + quality
│   ├── DiscoveryMatrixCard.tsx      # Empty-state toggle + provider pills + ranked match cards (cosine/pHash)
│   ├── CustodyCard.tsx              # Block badge + SHA/pHash breakdown + Re-Verify + Inject Tamper trigger + lineage
│   ├── TamperBanner.tsx             # Shake + 40px red glow + Expected vs Computed diff + HD bar
│   ├── DisclaimerBanner.tsx         # Sticky subtle DPDP & DPRK disclaimer (cream echo 4% + forest border, but OLED)
│   ├── LineageRail.tsx              # Vertical 1─2─3 glowing dots connecting cards (Hero beam echo)
│   ├── ProofCard.tsx                # QR + hash proof export (html-to-image + qrcode.react) — post-verify only
│   └── ui/
│       ├── Badge.tsx                # pill variants: neon / green / magenta / glass
│       ├── CopyButton.tsx           # hash/tx copy with Mono + toast
│       └── Shimmer.tsx              # skeleton for search_id / block loading
├── lib/
│   ├── canonical.ts                 # JCS RFC8785 mirror via rfc8785 semantics (UTF-16BE sort, string-only payload) — must match backend
│   ├── ethers.ts                    # Contract ABI + TypedDataEncoder.hash/verifyTypedData + Hardhat 31337 (ESM) + Amoy toggle
│   ├── synthetic.ts                 # SyntheticRiskProvider → NullProvider (pluggable, deferred)
│   ├── phash.ts                     # JS HD calc (bit_count XOR) for instant UI
│   ├── discovery.ts                 # DiscoveryProvider interface (LensProvider | VisionProvider)
│   └── cn.ts                        # shadcn cn()
└── api/
    ├── lens/route.ts                # SerpAPI proxy (hides SERPAPI_KEY, propagates search_id)
    ├── vision/route.ts              # GCP Vision Web Detection fallback proxy (uses GOOGLE_APPLICATION_CREDENTIALS)
    └── health/route.ts              # Hardhat + backend ping
```

### Component Contracts — What Each Renders and Owns

#### `HeroSection.tsx` — Animated Glowing Pipeline Beam

**Owns:** Nothing stateful — pure presentational, receives no props except `onScrollToInvestigate?: () => void`.
**Renders:**
* Full-viewport `min-h-[56vh]` `bg-[#030508]` with `radial-gradient(circle at 50% 0%, rgba(11,149,52,0.18) 0%, transparent 60%)` haze.
* Headline: `Stolen Faces. Re-encoded JPEGs. Immutable Proof.` `font-geist font-bold text-[40px] leading-[1.05] tracking-[-0.04em] text-[#F2F6F7]` — `F2F6F7` from Web3 Neon, not pure white.
* Sub: `Face → Search → Canonical Hash → Chain` `text-[#9CA3AF] text-[14px] tracking-[0.12em] uppercase`
* **Beam:** SVG path `M 0 32 L 100 32` (responsive) with 3 nodes (1 Face / 2 Search / 3 Chain). Nodes: `16px` circles `border-2 border-white/10 bg-[#0A1218]` with inner dot `bg-[#0B9534]` when active. Beam glow travels via Framer Motion (`see §3`).
* CTA: `Start Investigation ↓` `border border-white/10 bg-white/[0.04] backdrop-blur` — scrolls to `#investigator`.
**Does NOT do:** Any fetch — keeps Hero instant (50ms).

#### `FaceInputCard.tsx` — Dropzone, KYC Scan Beam, 512-d Metrics (Card 1 — 33%)

**Props:**
```ts
type Props = {
  onFaceReady: (args: { file: File; crop: string /* dataURL */; embedding: number[]; phash: string; quality: number }) => void
  backendUrl: string // http://localhost:8000
}
```
**Internal state:** `dragging: boolean`, `uploading: boolean`, `detecting: boolean`, `preview: string|null`, `error: string|null`.
**Renders:**
* Header: `01 · Face Input` `text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]` + `GhostFaceNet 512-d` mono tag `text-[11px] bg-white/5 px-2 py-1 rounded-full`.
* **Dropzone:** `rounded-[16px] border border-dashed border-white/10 bg-[#0A1218]` → `dragging: border-[#0B9534] bg-[#0B9534]/5` → child `<input type="file" accept="image/*">` hidden. Icon: `Scan` lucide with `shadow-[0_0_12px_#00E5A0]` on hover.
* **Preview:** `224×224 rounded-[16px] overflow-hidden relative` — image + **scan-beam** overlay (see §3) during `detecting`. Overlay + label `Scanning…`
* **Metrics bar (post-detect):** `512-d · Quality 0.97 · Alignment OK` — Quality = detector confidence, Alignment = eye distance / frontal check from backend. All `JetBrains Mono 11px`.
* **Validation:** Front-facing >200px eye distance; if fails → `Warn` amber banner (not red) — "Low eye distance — try front-facing crop."
**Calls:** `POST ${backendUrl}/detect` with `FormData file` → `{ embedding: number[512], phash, quality, crop_b64 }`. Keeps `image buffer` in parent `page.tsx` (see §4) — card owns only preview + quality.

#### `DiscoveryMatrixCard.tsx` — Empty State Toggle + Ranked Match Cards (Card 2 — 42%, widest)

**Props:**
```ts
type Props = {
  searchState: 'idle'|'searching'|'empty'|'hit'|'fallback'
  provider: 'serpapi_lens'|'vision'|'mock'
  searchId: string|null
  candidates: Array<{ thumb: string; url: string; source: string; cosine: number; phashHD: number; verdict: 'VERY_SIMILAR'|'SOMEWHAT'|'DIFFERENT' }>
  selectedIdx: number|null
  onSelect: (idx: number) => void
  onTryDemo: () => void // triggers demo-figure fetch
  onRetryVision: () => void
}
```
**Renders:**
* **Header bar:** `Genuine search: Lens xyz789` `font-mono text-[12px] text-[#F2F6F7]` + `CopyButton` + **provider pill:** `SerpAPI Lens` `bg-[#0B9534]/15 text-[#0B9534] border border-[#0B9534]/30 rounded-full text-[11px]` ; fallback shows `Vision (fallback)` `bg-amber-500/15 text-amber-400 border-amber-500/30` ; mock shows `Fixture (search_id preserved)` `bg-white/5`.
* **Empty state (private face):** Cream-echo callout but OLED-adapted: `bg-white/[0.04] border border-white/10 rounded-[16px] p-4` — text `0 social hits (expected — private faces not indexed)` `text-[#9CA3AF] text-[13px]` + CTA `Try demo profile →` `bg-[#0B9534] text-[#030508] rounded-full px-4 py-2 text-[13px] font-medium hover:bg-[#00E5A0] transition`.
* **Hit state:** Ranked list `space-y-2`, each row: `thumb 48×48 rounded` + `source pill` (`pbs.twimg.com` tag `bg-white/5 text-[#9CA3AF] text-[11px]`) + **primary numbers:** `Cosine 0.94` `font-mono text-[16px] font-bold text-[#F2F6F7]` and `HD=3` `font-mono text-[16px] font-bold` colored by threshold — `0-5 #0B9534`, `6-15 #EAB308`, `>15 #FF2E63` + `VERY_SIMILAR` pill `bg-[#0B9534]/15 text-[#0B9534]` . Shimmer while `searching`.
* **Interaction:** Row click selects → highlights `border-[#00E5A0] shadow-[0_0_16px_rgba(0,229,160,0.2)]` + parent fires `onSelect` → enables Card 3 Anchor.
**Does NOT rank:** Re-ranking is parent logic (cosine desc, HD asc) — card is pure view.

#### `CustodyCard.tsx` — Block Badge, SHA/pHash Breakdown, Re-Verify, Inject Tamper (Card 3 — 25%)

**Props:**
```ts
type Props = {
  anchor: { block: number; tx: string; canonicalSha: string; phash: string; phashHD: number; prev: string; chainId: 31337|80002; explorerUrl?: string }|null
  verifyState: 'idle'|'pending'|'verified'|'tampered'
  expectedSha: string|null
  computedSha: string|null
  onVerify: () => void
  onInjectTamper: () => void
  onResetTamper: () => void
}
```
**Renders:**
* **Top badges:** `Hardhat #31337 Block 5` `bg-white/5 border border-white/10 rounded-full text-[11px] mono` + `Tx 0x1234…` `font-mono text-[12px] truncate` + `CopyButton` + if `chainId 80002` shows `amoy.polygonscan.com/tx/0x…` external link `text-[#00E5A0]`.
* **Hash blocks:** Two rows:
  * `Canonical SHA` `0x8f2a… (full on hover/copy)` `font-mono text-[12px] text-[#F2F6F7] bg-[#0A1218] border border-white/5 rounded-lg px-3 py-2 break-all`
  * `pHash 101… (HD=3/64)` `font-mono text-[12px]` + verdict pill `VERY_SIMILAR` same as Card 2.
* **Prev rail:** `Prev 0x000 → 0x8f2a` `text-[11px] mono text-[#9CA3AF]` with chevron `→` in `#00E5A0`, connecting to `LineageRail`.
* **Consent line:** `Consent: EIP-712 HHGoa-Face v1 ✓` `text-[11px] text-[#9CA3AF]` + `Consenter 0xf39F…` mono — collapsible.
* **Actions:** `Anchor` (first time, green solid) → after anchor becomes `Re-Verify` `border border-white/10 bg-white/5 hover:bg-white/10` + `Inject Tamper` `border border-[#FF2E63]/30 text-[#FF2E63] hover:bg-[#FF2E63]/10`. Placing both side-by-side proves custody vs tamper at a glance.
* **Child:** Conditionally renders `<TamperBanner expectedSha computedSha phashHD />` when `verifyState === 'tampered'` — full width below hash blocks.

#### `TamperBanner.tsx` — Shake + 40px Red Glow + Expected vs Computed Diff

**Props:** `{ expectedSha: string; computedSha: string; phashHD: number; }`
**Renders:**
```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠ TAMPER DETECTED / INTEGRITY BREACH                              │
│ `bg-[#FF2E63]/10 border border-[#FF2E63] rounded-[12px] p-3` +  │
│ `shadow-[0_0_40px_rgba(255,46,99,0.5)]` outer glow +              │
│ `animate-[shake_400ms_ease]` (see §3) + `HD=16 >5 (Exceeds)`     │
│ pill red                                                           │
│ ───────────────────────────────────────────────────────────────   │
│ Expected: 0x8f2a… (copy)  |  dim `expected` row                    │
│ Computed: 0x1b4c… (copy)  |  bold `computed` row with red ring     │
│ [Reset Tamper] ghost button                                        │
└──────────────────────────────────────────────────────────────────┘
```
**Copyable diff:** Both hashes `font-mono text-[12px]` with `CopyButton`. HD bar: `w-full h-2 rounded-full bg-white/10` fill `bg-[#FF2E63] width = HD/64*100%` animated `width 400ms ease`.

#### `DisclaimerBanner.tsx` — Sticky Subtle DPDP & DPRK

**Renders:** Sticky top `position: sticky; top: 0; z-40` `bg-[#030508]/80 backdrop-blur border-b border-white/5 px-4 py-2` `text-[11px] leading-[1.4] text-[#9CA3AF]` :

> **System flags profile image reuse & synthetic risk · Does not attribute to DPRK · Hash-only on-chain, raw face deleted after hashing · Consent revoked via EIP-712 · Private faces often return 0 hits (expected).**

Links to README `Known Limitations` anchor. Never red — neutral, so tamper red stays shocking.

#### `LineageRail.tsx` — Vertical 1─2─3 Connecting Cards

**Props:** `{ activeStep: 1|2|3 }`
**Renders:** Absolute left of 3-card grid `-left-6 top-0 bottom-0 w-[2px] bg-white/5` with `motion.div` green fill `height: activeStep/3*100%` + 3 dots `12px` `bg-[#0A1218] border-2 border-white/10` → `active: border-[#0B9534] bg-[#0B9534] shadow-[0_0_12px_#0B9534]` + label `01 Face` etc. Reinforces Hero beam.

---

## 2. Exact Tailwind Config & Theme Tokens (OLED, Surfaces, Glass, Borders)

```css
/* app/globals.css — Tailwind v4 @theme (no tailwind.config.js) */
@import "tailwindcss";

@theme {
  /* OLED Forensics */
  --color-oled: #030508;
  --color-surface: #0A1218;
  --color-surface-2: #1A2332;
  --color-ink: #F2F6F7;
  --color-muted: #9CA3AF;
  --color-border: rgba(255,255,255,0.08);
  --color-border-strong: rgba(255,255,255,0.14);
  /* Accents */
  --color-forensic: #0B9534;      /* primary CTA, verified */
  --color-neon: #00E5A0;          /* glow, beam, underline */
  --color-tamper: #FF2E63;        /* shake, HD exceed */
  --color-amber: #EAB308;         /* 6-15 HD warn */
  /* HH Goa echo retained as accent only */
  --color-neon-goa: #F9D923;      /* tiny search_id pill alt if needed */
  --color-magenta-goa: #E91E8C;   /* fallback tamper alt */
  /* Type */
  --font-geist: "Geist Sans", Inter, sans-serif;
  --font-inter: Inter, sans-serif;
  --font-mono: "JetBrains Mono", "Geist Mono", monospace;
  --radius-card: 16px;
  --radius-pill: 9999px;
}

/* Global */
html { color-scheme: dark; }
body { background: var(--color-oled); color: var(--color-ink); font-family: var(--font-inter); }

/* Utilities */
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); }
.card-glass { background: rgba(26,35,50,0.8); backdrop-filter: blur(16px); border: 1px solid var(--color-border); }
.dot-grid { background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0); background-size: 24px 24px; }

/* Scrollbar for investigator */
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 9999px; }

/* Keyframes — shake + beam are here so Framer can also drive them */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  15%, 45%, 75% { transform: translateX(2px); }
  30%, 60% { transform: translateX(-2px); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

**Shimmer for `Shimmer.tsx`:** `bg-gradient: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)` + `background-size: 200% 100%` + `animation: shimmer 1.2s infinite linear`.

**Glass rule (from SuperDesign):** `glass on chrome, opaque under dense tables` — so `CustodyCard` hash rows stay `bg-[#0A1218]` opaque (dense mono), not glass — otherwise video moiré.

---

## 3. Framer Motion Specs — Exact Variants

**Install:** `framer-motion` (client components `"use client"`). All transforms are `transform + opacity` only for 60fps on local `next dev`.

### A. Hero Pipeline Beam

```tsx
// HeroSection.tsx
const beamVariants = {
  initial: { x: "-100%", opacity: 0 },
  animate: { x: "100%", opacity: [0,1,1,0], transition: { duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 0.4 } },
}
const nodeVariants = {
  idle: { scale: 1, borderColor: "rgba(255,255,255,0.1)" },
  active: { scale: 1.15, borderColor: "#0B9534", boxShadow: "0 0 12px #0B9534", transition: { type: "spring", stiffness: 400, damping: 12 } },
}
// Layout: motion.div absolute `h-[2px] w-[120px] bg-gradient(to-r, transparent, #00E5A0, transparent) blur-[0.5px]` inside `overflow-hidden` svg container
// Trigger: scroll-driven `whileInView` also — `viewport: { once: true, amount: 0.6 }` so beam fires when Hero enters.
// Fallback if framer missing: CSS `animation: shimmer` on beam + node `pulse`.
```

### B. KYC Scan Beam (FaceInputCard)

```tsx
// FaceInputCard.tsx — overlay during detecting
const scanVariants = {
  initial: { y: 0 },
  animate: { y: [0, 224, 0], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } },
}
// Render: <motion.div variants={scanVariants} initial="initial" animate={detecting ? "animate" : "initial"}
//   className="absolute inset-x-0 h-[2px] bg-[#00E5A0] shadow-[0_0_8px_#00E5A0] pointer-events-none" />
// Copy: <motion.p animate={{ opacity: [0.5,1,0.5] }} transition={{ duration: 1.2, repeat: Infinity }}>Scanning…</motion.p>
```

### C. Tamper Climax Shake (TamperBanner)

```tsx
// TamperBanner.tsx — only mounts when tampered
const bannerVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 18 },
  },
  shake: {
    x: [0, 2, -2, 2, -2, 0],
    transition: { duration: 0.4, ease: "easeInOut" },
  },
}
// Usage: <motion.div variants={bannerVariants} initial="hidden" animate={["visible","shake"]} className="shadow-[0_0_40px_rgba(255,46,99,0.5)] border border-[#FF2E63] bg-[#FF2E63]/10" />
// HD bar fill:
const hdFill = { width: `${(phashHD/64)*100}%`, transition: { duration: 0.4, ease: "easeOut" } }
// Number tick:
const numberTick = { scale: [0.9,1.05,1], transition: { duration: 0.2 } }
// LineageRail glow:
const railFill = { height: `${(activeStep/3)*100}%`, transition: { duration: 0.6, ease: "easeOut" } }
// 3-card stagger:
const containerStagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }
const cardEnter = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }
```

**Accessibility:** `prefers-reduced-motion: reduce` disables beam/scan loops (via `useReducedMotion()` guard).

---

## 4. State Flow — How Frontend Stores Buffers and Talks to FastAPI + Hardhat Locally

**Single source of truth:** `app/page.tsx` (orchestrator, `"use client"`) holds all investigator state — children are stateless views. This mirrors SOC pattern (single drawer keeps search context).

```ts
// app/page.tsx — state (localOnly build, no Vercel)
type InvestigatorState = {
  // Input
  imageBuffer: ArrayBuffer | null      // held in memory, hash-only on chain, deleted on unmount per DPDP
  previewUrl: string | null           // dataURL for Card 1
  embedding: number[] | null          // 512-d GhostFaceNet, kept for cosine
  phash: string | null                // 64-char binary
  quality: number | null

  // Discovery
  searchState: 'idle'|'searching'|'empty'|'hit'|'fallback'
  provider: 'serpapi_lens'|'vision'|'mock'
  searchId: string | null             // genuine-call proof, display + README
  candidates: Candidate[]             // re-ranked already (cosine desc, HD asc)
  selectedIdx: number | null          // which candidate is being anchored/verified

  // Custody
  anchor: { block: number; tx: string; canonicalSha: string; phash: string; prev: string; chainId: 31337|80002 } | null
  verifyState: 'idle'|'pending'|'verified'|'tampered'
  expectedSha: string | null
  computedSha: string | null
  phashHD: number | null               // recomputed HD for banner
  tampered: boolean                    // local boolean toggled by Inject Tamper
}

// Providers
const BACKEND = "http://localhost:8000" // FastAPI — Python, no bundle limit
const HARDHAT_RPC = "http://127.0.0.1:8545" // ethers JsonRpcProvider — Hardhat local
const LENS_PROXY = "/api/lens"        // Next.js Route Handler (hides SERPAPI_KEY)
const VISION_PROXY = "/api/vision"    // Next.js Route Handler (hides GOOGLE_APPLICATION_CREDENTIALS)
```

**Flow — step-by-step with triggers:**

1. **Drop → Card 1 `onFaceReady`:** `FaceInputCard` POSTs `FormData file` to `BACKEND /detect` → receives `{ embedding, phash, quality, crop_b64 }` → calls `onFaceReady` → parent sets `imageBuffer = await file.arrayBuffer()` + `previewUrl = crop_b64` + `embedding/phash`. Buffer is **never persisted**, only in `State` and cleared on refresh — README DPDP.

2. **Auto-search → Card 2:** `useEffect([imageBuffer])` triggers:
   ```ts
   setSearchState('searching')
   try {
     const res = await fetch(LENS_PROXY, { method: 'POST', body: fd /* file */ })
     // lens/route.ts does SerpAPI image_id upload flow → engine=google_lens type=visual_matches
     const { search_id, visual_matches, pages } = await res.json()
     const candidates = await Promise.all(visual_matches.slice(0,8).map(async c => {
       const fetched = await fetch(c.image) // via proxy to avoid CORS, optional
       const buf = await fetched.arrayBuffer().catch(()=>null)
       const local = buf ? await fetch(`${BACKEND}/pHash`, {method:'POST', body: buf}).then(r=>r.json()) : {phash: c.phash || phash}
       const cosine = embedding ? cosineSimilarity(embedding, await embedThumb(c.thumb)) : 0.9 // or backend re-embed
       return { thumb:c.thumbnail, url:c.link, source:new URL(c.link).hostname, cosine, phashHD: hammingDistance(phash, local.phash), verdict: hdLabel(local) }
     }))
     // re-rank
     candidates.sort((a,b)=> b.cosine - a.cosine || a.phashHD - b.phashHD)
     setCandidates(candidates.filter(c=> ['instagram.com','x.com','twitter.com','facebook.com','reddit.com'].some(d=>c.url.includes(d)) || true )) // post-filter per Google docs (Vision has no filter)
     setSearchId(search_id); setProvider('serpapi_lens'); setSearchState(candidates.length? 'hit':'empty')
   } catch (e) {
     // Fallback #1
     const v = await fetch(VISION_PROXY, {method:'POST', body: JSON.stringify({imageBase64: bufferToB64(imageBuffer)})})
     // Vision returns pagesWithMatchingImages
     // map similarly, set provider 'vision', searchId `vision_${Date.now()}`
     // if still empty → set provider 'mock', load fixtures/lens_real.json with real search_id, state 'fallback'
   }
   ```
   **Local tamper note:** Hardhat not involved yet — search is pure Lens/Vision.

3. **Select → Enable Anchor (Card 2 → Card 3):** `onSelect(idx)` sets `selectedIdx` → `CustodyCard` enables `Anchor` button (disabled until selected + embedding ready).

4. **Anchor → Hardhat `:8545` via ethers:**
   ```ts
   // lib/ethers.ts
   const provider = new JsonRpcProvider(HARDHAT_RPC) // 31337
   const signer = await provider.getSigner(0) // Hardhat account #0 0xf39Fd...
   const contract = new Contract(CONTRACT_ADDRESS, abi, signer)
    // Canonical manifest built client via canonical.ts JCS (RFC 8785, string-only, UTF-16BE sort; test vector {"😀":"y"}):
    const manifest = { url: canonicalUrl(candidates[selectedIdx].url), imageSha: await sha256(canonicalImageBytes), ts: new Date().toISOString(), platform, searchId, phash: String(candidates[selectedIdx].phashHD), canon_version: "canon_v1" }
    const canonicalBytes = JCS(manifest) // rfc8785 semantics — not JSON.stringify sort_keys
    const canonicalSha = ethers.keccak256(ethers.toUtf8Bytes(canonicalBytes)) // or ethers.sha256
   const phashInt = BigInt('0b'+candidates[selectedIdx].phash) // to uint64
   const consentHash = ethers.TypedDataEncoder.hash(
     { name:"HHGoa-Face", version:"1", chainId: 31337, verifyingContract: CONTRACT_ADDRESS },
     { Consent:[{name:"faceHash",type:"bytes32"},{name:"purpose",type:"string"},{name:"ts",type:"uint64"}] },
     { faceHash: canonicalSha, purpose:"HHGoa demo search", ts: BigInt(Date.now()) }
   ) // or signer.signTypedData if wallet connected
   const tx = await contract.anchor(canonicalSha, phashInt, candidates[selectedIdx].url, "" /*cid*/, prev, consentHash)
   const receipt = await tx.wait()
   setAnchor({ block: receipt.blockNumber, tx: receipt.hash, canonicalSha, phash: candidates[selectedIdx].phash, prev, chainId:31337 })
   ```
   **Amoy toggle:** If `POLYGON_AMOY_RPC_URL` set, `getProvider('amoy')` swaps RPC + `chainId 80002` + `signer` from `PRIVATE_KEY` — same contract call, receipt shows `amoy.polygonscan.com/tx/...` link.

5. **Re-Verify → Local recompute, no RPC:**
   ```ts
   const recomputed = ethers.keccak256(ethers.toUtf8Bytes(JCS(manifestForSelected)))
   const recomputedPhashHD = hammingDistance(phash, await fetchAndPhash(candidates[selectedIdx].url))
   const onChain = await contract.verify(canonicalSha) // view call, no gas
   setVerifyState(recomputed === onChain.sha && recomputedPhashHD <=5 ? 'verified' : 'tampered')
   setExpectedSha(onChain.sha); setComputedSha(recomputed); setPhashHD(recomputedPhashHD)
   ```

6. **Inject Tamper → Local state only:**
   ```ts
   const onInjectTamper = () => {
     const tamperedUrl = candidates[selectedIdx].url.replace('a','b') // or flip one buffer byte
     const tamperedManifest = { ...manifest, url: tamperedUrl }
     const tamperedSha = ethers.keccak256(ethers.toUtf8Bytes(JCS(tamperedManifest)))
     setComputedSha(tamperedSha); setVerifyState('tampered'); setPhashHD(16) // force >5 to show red
   }
   // Reset restores recomputed == expected
   ```

**Storage:** `imageBuffer` lives only in `page.tsx` `useRef` + `useState`; never `localStorage`. On `beforeunload` clear. `searchId` persisted in URL `?search=xyz` for README proof + copy.

**Error boundaries:** If `BACKEND` down → `FaceInputCard` shows `Start backend: uvicorn main:app --reload` magenta hint; if Hardhat down → `CustodyCard` shows `Start terminal 1: npx hardhat node`; if Lens 429 → auto Vision fallback with amber pill (no red).

---

**Status:** Spec locked, planning only. This is `.omo/plans/frontend.md` build contract — generate code only after your "build" go.

*End — Frontend — OLED Forensics — Sep 2, 2026*
