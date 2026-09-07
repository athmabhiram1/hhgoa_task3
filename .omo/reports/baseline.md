# Baseline Green Gate — HHG Task 3 (SybilWatch)

**Date:** 2026-09-07
**Workdir:** `C:\Users\athma\OneDrive\Desktop\my projects\hhg\task_3`
**Node:** v24.11.0 (>= 22.13 required for Hardhat 3 ESM — satisfied)
**npm:** 11.13.0
**Verdict: GREEN — no code changes made.**

## Gate results

| # | Command | Exit code | Result |
|---|---------|-----------|--------|
| 1 | `node --test "test/*.test.mjs"` | 0 | 7 pass / 0 fail (seal-receipt: 2, wire-pill: 5) |
| 2 | `npm test` (`npx hardhat test`) | 0 | 11 passing — 4 FaceAnchor Solidity tests + 7 node:test |
| 3 | `npx tsc --noEmit` | 0 | clean, no output |
| 4 | `npm run build` (`next build`) | 0 | Next.js 15.5.25 compiled in 4.5s; 4 routes + 4 API routes built |

## Key output lines

### 1. node --test
```
✔ Page writes and stores the real anchor receipt for custody
✔ Page exposes a real on-chain re-verification path
✔ Page shows the configured provider explicitly
✔ Page surfaces search_id in the discovery board
✔ Page keeps an honest empty-state for zero matches
✔ Page clears prior candidates before a new live search
✔ Page has a source board state for live results
ℹ tests 7  ℹ pass 7  ℹ fail 0
```

### 2. npm test (hardhat)
```
Running Solidity tests
  FaceAnchor
    ✔ deploys
    ✔ anchors and verifies
    ✔ prevents duplicate anchor
    ✔ tamper: altered URL fails verify
Running node:test tests
  ✔ (7 UI-wiring tests as above)
11 passing (11 nodejs)
```

### 3. npx tsc --noEmit
No output; exit 0.

### 4. npm run build
```
▲ Next.js 15.5.25
✓ Compiled successfully in 4.5s
✓ Generating static pages (4/4)
Route: / (static, 263 kB), /api/detect, /api/lens, /api/phash, /api/vision (dynamic)
```

## Harness quirk documented (NOT a repo failure)

The literal command `node --test test/` (and `node --test test`, `node --test ./test`)
exits 1 on this machine with:

```
Error: Cannot find module 'C:\...\task_3\test'   (MODULE_NOT_FOUND)
```

**Root cause:** Node 24.x treats `--test` positional arguments as glob patterns; a bare
directory argument resolves to the directory itself and is spawned as an entry module,
which fails. Verified as a CLI-level behavior, not a repo issue: reproduced identically
in a fresh temp dir containing one trivial passing `*.test.mjs` (`node --test <dir>` →
exit 1; `node --test "<dir>/*.test.mjs"` → exit 0).

**Correct invocation on Node 24.11 / Windows:** `node --test "test/*.test.mjs"` (exit 0,
7/7 green). Note `npm test` already covers all 11 tests (hardhat's node-test-runner picks
up the .mjs files too), so the node:test suite is green under both entry points.

No fix applied to repo files: nothing in package.json/README defines the failing
directory form, and the tests themselves pass — the failure was the harness, not an
assertion (per task rule: fix only assertion-red, document harness-red).

## Constraints honored

- Read-only + report: zero source/test/contract/config files modified.
- No SerpAPI calls made (spend: $0).
- `.env`, `fixtures/`, `*.jpg`, `public/contract.json` untouched.
- No daemons started (no hardhat node / uvicorn / next dev).
