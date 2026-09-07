# VIDEO SCRIPT — SybilWatch 3:00 Master Take (read this, press record, follow it)

**Setup before recording (5 min, terminals visible on screen):**
- Terminal 1: `npx hardhat node` (keep open — chain 31337)
- Terminal 2: `npm run deploy:local` (fresh contract → clean seal on camera), then `npm run dev`
- Terminal 3: `uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1 --reload`
- Browser: `http://localhost:3000` (incognito, 100% zoom). Have `cr7.jpg` + one clear front-facing photo of yourself in Downloads.
- WHY fresh chain: `anchor()` rejects duplicates by design — a restarted node guarantees the seal lands live. If seal ever says "exists", that IS the tamper-guard working; say so, switch photos.

**Say + do (total ~3:00):**

**(0:00) Disclaimer + thesis (15s)**
> "SybilWatch. Given a face scan, it finds where that face appears on the public web, then seals the evidence on a blockchain so tampering is detectable. It flags image reuse — it does not identify people or attribute intent."
- Show the classification bar + scope note.

**(0:15) Face scan — your photo (30s)**
- Drag your photo in.
> "Local model first: GhostFaceNet 512-number fingerprint, quality score, pHash bit pattern — all computed on this machine, nothing uploaded except the Lens query."
- Point at: 512-d, quality, checklist ck1–ck4 going green, bit chart.
- Lens returns `search_id` + honest result.
> "A private face returns little or nothing. That is the honest result — the app never invents matches."

**(0:45) Genuine find — Ronaldo (40s)**
- Drop `cr7.jpg`.
> "Same pipeline, public figure: the face crop goes to SerpAPI Lens — a genuine reverse-image call, this search ID proves it — and returns ranked public sources with provider chips."
- Click a card.
> "I pull one source into the case."

**(1:15) Seal (30s)**
- Click SEAL EVIDENCE.
> "The canonical manifest — URL, fingerprint, search ID — is hashed with SHA-256 and anchored to local Hardhat chain 31337."
- Point at: Tx hash, block number, FILED stamp, notary seal, manifest block.

**(1:45) Re-verify (20s)**
- Click RE-VERIFY.
> "Recomputed locally, compared against the chain record: VERIFIED, digest match."

**(2:10) Tamper climax (35s)**
- Click SIMULATE TAMPER.
> "Now I change one character of the evidence. The fingerprint avalanches — TAMPER DETECTED, expected versus computed diverge."
- Let the shake + red wash play. Click RESET.
> "Restore, and parity is back. That is the whole product: evidence that cannot be quietly rewritten."

**(2:45) Close (15s)**
> "Face scan, genuine web find, blockchain custody — receipts for every step in the repo. Every face leaves a paper trail."

**If something breaks on camera (say it, don't cut):**
- Lens 429/empty → "Quota edge — the amber Vision fallback carries the same search honestly."
- Seal refuses → "The duplicate guard just proved itself — one record per fingerprint. Switching photos."
- Backend cold (~30s first detect on CPU) → "First model load is the slow one; it caches warm." Start recording AFTER one warm-up detect.

**After recording:** upload unlisted (YouTube/Drive/Loom) → paste link into README Video line + submit https://forms.gle/oZbQGuwiNeHVcHWo8 (one-shot) → THEN `git push -u origin main`.
