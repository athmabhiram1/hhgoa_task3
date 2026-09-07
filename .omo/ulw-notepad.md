# Ultrawork Notepad — SybilWatch proper frontend + live wiring
Started: 2026-09-07T18:10+05:30
Goal: Port frontend.html look into Next app (no demo data), wire real backend+Hardhat routes.
I'll stop right away when: cr7.jpg reaches VERIFIED then TAMPERED on the live page + test-face.jpg shows honest 0-hit + suite+build green.

## Plan (exhaustive, atomic)
1. Verify disk state (extraction intact, T3 fixes present) — DONE via grep
2. Baseline: tsc + node tests green on current tree
3. T3 close-out: boot hardhat+deploy+uvicorn+next, run scripts/e2e.mjs, save receipts
4. S5: SpecimenCard JSX beats + specimen.css import
5. S6: SourceBoard JSX beats + sources.css import
6. S7: proof.css + ProofCard beats
7. Re-verify suite+build; e2e re-run; teardown daemons
8. Report receipts + screenshots-available evidence

## Scenarios (the contract)
- S1 happy: cr7.jpg POST /api/detect → 200, embedding 512, quality number; POST /api/lens → search_id + matches; anchor → tx+block; verify → VERIFIED. Test: scripts/e2e.mjs (assert ids). Surface: e2e-receipts.json + page flow.
- S2 edge: test-face.jpg → detect 200 + lens 0-hit honest empty-state, zero invented cards. Test: e2e honest-empty assertion + page text. Surface: receipt + UI copy.
- S3 regression: node tests + hardhat tests + tsc + build all green; tamper → TAMPERED, reset → sealed. Test: test/*.mjs + npm test. Surface: build output + e2e tamper probe.

## Now
- Disk state verified: T3 fixes present (main.py:145 quality, lens route:66 alias), e2e.mjs present, specimen/sources.css present, ProofCard/SourceBoard JSX beats missing.

## Todo (remaining, ordered)
- baseline green re-check
- T3 e2e green + receipts
- S5/S6/S7 JSX beats + proof.css
- final verify + teardown

## Findings
- app/page.tsx 120-line container; components extracted verbatim (bg_01af12c0, all gates green then).
- T3 code fixes landed before cancel (backend quality, lens alias, e2e.mjs) but receipts never captured.
- Wave-3 CSS landed (specimen/sources.css) but JSX hooks + proof.css missing — workers died mid-task on billing.
- Repo root is C:\Users\athma (home) — NO commits (would pollute home repo); state reason in final report.
- Two stray next dev servers raced .next builds earlier — stop before build.

## Learnings
- Node 24.11: bare `node --test test/` fails (glob quirk); use quoted glob.
- SerpAPI budget: 238 at check; spent lenslive(1)+e2e attempts(3)+edge(1)+croptest(1)+rerun(1)=7 → ~231 left, plenty.
- Start-Process paths with spaces MUST be pre-quoted or node resolves only to first space (hardhat MODULE_NOT_FOUND).
- scripts/e2e.mjs key was mistyped mid-string (derived 0x4AA2, balance 0); fixed by getSigner(0), no hardcoded keys.
- e2e re-run fails at anchor with "exists" revert = duplicate guard CORRECT; verify(0x87b5…)=exists true on chain.
- test-face.jpg via face crop → search_id 6a9ec35097c19f6b073d4a81, face-page results (no T-shirt hits) — crop fix proven.
- Served prod HTML contains spec-tag/exhtag/indexcard/source-pills/provider-chip/proof-cert/SEARCH ID — beats shipped.
- CSS link filenames are hashed by Next (never literal) — verify via markers, not filenames.
- Left stack UP for recording: :3000 prod (fresh build), :8000 backend, :8545 chain. No commits: repo root is home dir.
- Parity pass: docket+drows+band, toasts mirror, ck1-4 checklist, tele rows, phash-64 bit chart, lucide icons (ScanFace/ArrowRight/Stamp/ShieldCheck/TriangleAlert/RotateCcw/Copy/Check). 7/7 served markers on 127.0.0.1 + localhost.
- Port-3000 mystery solved: single IPv6 listener (PID 20588, prod server); an early probe hit it mid-boot and returned a marker-less shell — re-probe after warm = 7/7. Lesson: always re-probe; never trust one cold sample.
- startprod "stuck" = server running by design (Ready + PID = done).
- USER rewrite (uncommitted): proper hash routes HomeRoute/SpecimenRoute/SourcesRoute/ProofRoute + anchor-tab nav + live-only copy; fixture→none rename. Verified zero mocks, tsc+tests green, clean .next rebuild, served r-home + hash tabs. Committed effa2f4 (5 files).
- Corrupted .next from build-vs-serve collision: kill server, rm .next, rebuild, re-serve. Never build while serving prod on Windows.
- Fresh user chain: contract DEPLOYED (4984ch) at 0x5FbD — seal works live, no restart needed. backend :8000 + chain :8545 user-started and healthy.
- Upload fix: label-wrapped file inputs replaced by real-button + inputRef/dropInputRef programmatic click (label activation was unreliable). Verified in served bundle; committed (user landed as 8bb5b71/2ea9b54).
- "Tool execution aborted" = panel interrupted, NOT work lost: Start-Process servers detach and survive; silence after Ready = done. Continue = next message/task ping.

## Scenario results
- S1 happy: PASS — e2e GREEN, receipts search_id 6a9ebe754fa3ba27947f6b9e, tx 0xea20…, block 2, verified+tamperDetected true.
- S2 edge: PASS (honest) — test-face full image 8 matches; face crop face-pages; nothing invented either way.
- S3 regression: PASS — 7 node tests + 4 hardhat (11 via runner) + tsc clean + build green (264 kB /).
