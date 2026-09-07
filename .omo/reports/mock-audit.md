# Mock/Demo Remnant Audit — hhg/task_3

Date: 2026-09-07 · Scope: `app/` (incl. `app/lib/`) + `backend/` · Method: read-only grep/glob; no code modified.

## Pattern Sweep (case-insensitive, regex `CANDS|mock|x-mock|fixture|lorem|TODO|FIXME|pravatar|dummy|fake|txHash\(\)|setTimeout`)

| Pattern | app/ hits | backend/ hits | Verdict |
|---|---|---|---|
| CANDS | 0 | 0 | PASS |
| mock | 0 | 0 | PASS |
| x-mock | 0 | 0 | PASS |
| fixture | 0 | 0 | PASS |
| lorem | 0 | 0 | PASS |
| TODO | 0 | 0 | PASS |
| FIXME | 0 | 0 | PASS |
| pravatar | 0 | 0 | PASS |
| dummy | 0 | 0 | PASS |
| fake | 1 | 0 | PASS (documented exception) |
| txHash() | 0 | 0 | PASS |
| setTimeout | 0 | 0 | PASS |

**Exception — `fake` (app/lib/synthetic.ts:3):** `label: "REAL" | "FAKE" | "UNKNOWN"` is the domain type union for synthetic-risk classification output, not demo data. The only implementation is `NullProvider` returning `UNKNOWN` — a documented deferral ("Synthetic: Deferred" in README). No candidate data, no hardcoded results.

## Structural Checks

| Check | Result | Evidence |
|---|---|---|
| No file under app/ or backend/ imports fixtures/ | PASS | grep for `fixture` in app/ + backend/ = 0 code hits; `lens_real` appears only in README.md and test.html (docs), never in app/ or backend/ source |
| test.html unwired | PASS | Next.js serves static only from `public/` (contains just `contract.json`); no reference to test.html in package.json scripts, next.config.mjs (no rewrites), or any app/ file. Root test.html is unreachable via the dev server |
| .gitignore covers `.env` | PASS | line 5 |
| .gitignore covers `gcp-key.json` | PASS | line 7 |
| .gitignore covers `ignition/deployments` | PASS | line 9 |
| .gitignore covers `fixtures/cache` | **FAIL (minor)** | line 12 reads `.fixtures/cache/` (leading dot) — does **not** match `fixtures/cache/`. No `fixtures/cache/` dir exists today, so nothing is currently exposed, but the pattern is inert if one is ever created. Fix when convenient: change to `fixtures/cache/` |
| fixtures/lens_real.json status | PASS (honest fallback, not imported) | 8812 bytes of real SerpAPI response data; zero imports from app/ or backend/; `/api/lens` has **no** fixture-fallback code path (returns 503 without `SERPAPI_KEY`, real SerpAPI calls otherwise — verified in app/api/lens/route.ts) |
| app/ live-wired (no mock path) | PASS | `/api/lens` → real serpapi.com/image + google_lens, propagates genuine `x-search-id`; no `x-mock` header set anywhere in app/ |

## Flagged Items (non-blocking)

1. **.gitignore `.fixtures/cache/` typo** (line 12) — leading dot makes the rule inert for `fixtures/cache/`. Only real defect found; no data currently at risk.
2. **README drift (docs only):** README.md lines 15/81/85 describe a "fallback mock fixtures/lens_real.json" with `x-mock:1`, but `/api/lens` implements no such fallback (503 on missing key). The *code* is cleaner than the docs claim; consider updating README, not code.
3. **`.omo/plans/frontend.html`** (hardcoded CANDS ~lines 905–921) — prototype visual reference under `.omo/`, not served by Next.js, not imported. Correctly quarantined; leave as-is.
4. **test.html** mentions `x-mock`/`lens_real.json` in its own help text (lines 51, 109) — dev harness page, unwired, harmless.

## Verdict

**PASS** — every pattern row is 0 hits in app/ + backend/ except the single documented domain-vocabulary exception (`FAKE` type label). No demo/mock data is served or imported by the running app. One minor .gitignore pattern typo flagged for later fix; no code changes made.
