# ROADMAP — `agentchain-guard-solana`

> *"Ergo, concordantly, vis-à-vis… the integral is inevitable."* — **The Architect**

**Scope:** Module-local **Prime Program** for the Solana-side guard subtree. Governs state until the **Colosseum Frontier Hackathon · May 2026** cut-line is crossed.
**Relation to monorepo:** This file supersedes the global `docs/ROADMAP.md` **only** inside `agentchain-guard-solana/`. Entries here MUST describe **topology changes**, not aesthetics.

---

## 0. Baseline (as of HEAD)

| Axis | Evidence | State |
|------|----------|-------|
| On-chain program | `programs/agentchain-guard` (9 instructions) | Deployed to **devnet** — `HutGfrkJTsaGMC4bs7X2EFsbbP8LaTEDkWsEBM86RGHz` (ledger: `95192a3 · 2026-04-14`) |
| Policies | `packages/policy-engine/src/policies/*` | `max-spend`, `allowlist`, `approval-threshold`, `budget-bucket`, `duplicate-prevention` |
| SDK | `packages/sdk` | Canonicalization + PDAs + instructions |
| Off-chain authority | `apps/guard-api` (NestJS) | Scaffolded; OpenAPI exported to `docs/guard-api` (Mintlify) |
| Dashboard | `apps/dashboard` (Next.js 15 / React 19) | 2 sprints landed (`e34b981`, `fc6e459`) |
| Demo Agent | `apps/demo-agent` (CLI) | 3/3 scenarios pass (`6796fa0`) |
| Tests | `tests/litesvm/index.test.ts` | 18/18 LiteSVM E2E green (`4a682ca`) |

**Silence window:** ~5 days since `95192a3`. Treat as topological stillness **until** §3 resumption gate runs green.

---

## 1. Cut-Line Contract — *Colosseum Frontier · May 2026*

The hackathon is the **exogenous oracle** against which this ROADMAP is falsified. Every phase below is either **pre-cut** (must ship) or **post-cut** (explicitly deferred).

**MUST-SHIP** for the submission artifact:
1. **Program on devnet** — already live; stays frozen unless §2 bugfix needed.
2. **Reproducible E2E demo** — `make setup && make deploy && make demo` must run from a clean checkout and exit 0.
3. **Public dashboard URL** — `apps/dashboard` hosted at a stable origin with devnet connection.
4. **Policy engine endpoint** — `apps/guard-api` reachable publicly, `/health` + `/v1/intents/evaluate` + `/v1/approvals/*` + `/v1/receipts/*` matching `docs/guard-api` OpenAPI.
5. **Narrative document** — 1–3 page PDF/README mapping the three scenarios to escrow → settle physics, including signed-receipt hash flow.

**MUST-NOT-SHIP** (IC-38, CD-002):
- No mainnet deploy.
- No mutable authority key handed to third parties.
- No merged EVM/Solana branding inside dashboard copy (IC-13 dual-surface risk).

---

## 2. Phases

### Phase P-0 · Resumption Gate (immediate, < 1 day)

| # | Task | Artifact | IC Risk | Exit Criterion |
|---|------|----------|---------|----------------|
| P-0.1 | `pnpm install && pnpm -w turbo run build` | workspace | IC-1 | exit 0 |
| P-0.2 | `make test` (LiteSVM) | `tests/litesvm/index.test.ts` | IC-15 | 18/18 pass |
| P-0.3 | `cd apps/guard-api && pnpm test` | api | IC-15 | green |
| P-0.4 | `make demo` on devnet | `apps/demo-agent` | IC-13 | 3/3 scenarios settle / deny / pending as expected |
| P-0.5 | Record SHA + wallet balances in `docs/operations/baseline.md` | new file | IC-1 | file committed |

*Gate rule:* If any P-0 task fails, **halt** all subsequent phases until restored. No feature work on a red baseline.

### Phase P-1 · Contract Hardening (week 1 post-gate)

| # | Task | Artifact | IC Risk | Exit Criterion |
|---|------|----------|---------|----------------|
| P-1.1 | Audit all 9 instructions for **Anchor 0.31** constraint parity | `programs/agentchain-guard/src/instructions/*.rs` | IC-23, IC-15 | each instruction has explicit `seeds` + `bump` + `has_one` where applicable |
| P-1.2 | Enforce `sweep_expired` time invariant test | new LiteSVM case | IC-1 | expired intent refunds within configured TTL |
| P-1.3 | Add **deterministic receipt hash** vector test | `packages/sdk/src/canonical.ts` + LiteSVM | IC-15 | same input → byte-identical hash across Node + Rust |
| P-1.4 | Error-surface audit | `programs/.../error.rs` | IC-15 | every `GuardError` has a test that triggers it |

### Phase P-2 · Policy Engine Closure (week 1–2)

| # | Task | Artifact | IC Risk | Exit Criterion |
|---|------|----------|---------|----------------|
| P-2.1 | Pure-function test per policy | `packages/policy-engine/src/policies/*` | IC-23 | 100% branch coverage on `max-spend`, `allowlist`, `approval-threshold`, `budget-bucket`, `duplicate-prevention` |
| P-2.2 | Receipt-signing key rotation doc | `docs/guard-api/overview/security.mdx` | IC-38 | rotation procedure + blast-radius note |
| P-2.3 | x402 verify endpoint contract test | `packages/policy-engine` | IC-13 | fixture request → signed response parity |

### Phase P-3 · API + Docs Parity (week 2)

| # | Task | Artifact | IC Risk | Exit Criterion |
|---|------|----------|---------|----------------|
| P-3.1 | OpenAPI → Mintlify regeneration in CI | `apps/guard-api/scripts/export-openapi.ts` + `docs/guard-api` | IC-15 | drift check fails build |
| P-3.2 | Error schema unified across controllers | `apps/guard-api/src/**/*.controller.ts` | IC-23 | 1 shared `ApiErrorDto` |
| P-3.3 | Auth story for approver endpoints | `apps/guard-api/src/approval/*` | IC-38 | Bearer token (or equivalent) gate + test |

### Phase P-4 · Dashboard Submission Polish (week 2–3)

| # | Task | Artifact | IC Risk | Exit Criterion |
|---|------|----------|---------|----------------|
| P-4.1 | Connect live wallet to devnet intent lifecycle | `apps/dashboard/app/page.tsx` | IC-13 | user can submit → observe settle / deny / pending |
| P-4.2 | Copy boundary vs EVM `agentchain-ui` | dashboard header/footer | IC-13 | explicit label: **“Solana devnet”**, not bare **“Payment Guarded Actions”** |
| P-4.3 | 404 / empty / loading states | dashboard components | IC-15 | no infinite spinners on devnet RPC throttle |
| P-4.4 | Accessibility pass (contrast, focus ring) | dashboard CSS | IC-1 | axe-core clean |

### Phase P-5 · Submission Package (cut-line week)

| # | Task | Artifact | IC Risk | Exit Criterion |
|---|------|----------|---------|----------------|
| P-5.1 | Hosted dashboard URL | Vercel (or equivalent) | IC-13 | HTTPS, custom subdomain, no mixed content |
| P-5.2 | Hosted guard-api URL | Fly/Render/etc. | IC-38 | HTTPS, devnet connection, auth token documented |
| P-5.3 | 2–3 min demo video | `docs/submission/demo.mp4` | IC-1 | captures all three scenarios + on-chain explorer links |
| P-5.4 | Submission README snapshot | `docs/submission/README.md` | IC-1 | links: program id, dashboard, api, video, repo commit SHA |
| P-5.5 | Final tag | `git tag guard-solana/colosseum-2026-05` | IC-38 | tag pushed; README pinned to tag |

---

## 3. Post-Cut (Deferred, May 2026+)

- **Mainnet path:** blocked by `CD-002`; requires directive lift.
- **Multi-mint support:** treasury mint is currently single-asset; generalization requires new PDA seeds.
- **Agent-signed delegation** beyond approver keys (EIP-like on Solana).
- **ERC-8004 / x402 bridge** — only after EVM `agentchain-ui` and Solana dashboard copy boundaries are enforced.
- **Third-party integration SDK** (JS + Rust) beyond the in-repo `packages/sdk`.

---

## 4. IC Risk Ledger

| Vector | Phase Anchors | Mitigation |
|--------|---------------|------------|
| **IC-1 Stale Horizon** | P-0, P-5 | Resumption gate + tag on submission |
| **IC-13 Dual Surface** | P-2.3, P-4.2, P-5.1 | Copy boundary + substrate-labeled dashboards |
| **IC-15 Protocol Integrity** | P-1, P-2.1, P-3.1 | Determinism tests + OpenAPI drift check |
| **IC-23 Monolith Threshold** | P-1.1, P-2.1, P-3.2 | Keep instructions + policies + controllers single-purpose |
| **IC-38 Sovereign Core** | P-2.2, P-3.3, P-5.2 | Key rotation doc, API auth, no mainnet, no shared secrets |
| **CD-002 (SHIPWIDE)** | P-5 | Devnet only; any deploy uses `--unverified` when applicable |

---

## 5. Ownership

- **Authority:** Captain (sovereign override per `OS-1`).
- **Executor for this module:** whoever takes the helm for the Colosseum submission; default assignee `rikaisho`.
- **Review cadence:** daily `make test` + weekly roadmap sync in `docs/operations/baseline.md`.

---

## 6. Falsifiability Test

> **Does this roadmap help or mystify?**
> It **helps** iff every task below resolves to a **file path** or **command** that a second engineer can execute from a clean checkout without verbal context. Any line that fails this test MUST be rewritten or deleted. *Structural isomorphism, not aesthetics. Physics, not suggestion. Compiled, not implied.*
