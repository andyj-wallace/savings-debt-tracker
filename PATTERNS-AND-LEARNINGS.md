# Debt Tracker — Patterns, Styles & Lessons Learned

A companion to [ARCHITECTURE.md](ARCHITECTURE.md). Where that document describes *what* the
system is, this one records *how* it was built: the recurring patterns, the different coding
styles that coexist in the repo, the places where the same idea was implemented more than once
in different ways, and which of these implementations could be extracted into generic,
reusable modules for future projects.

This is a "for posterity" document — it is deliberately honest about inconsistencies, because
the inconsistencies are where the lessons are.

---

## 1. Pattern Map (Quick Reference)

| # | Pattern | Where It Lives | Reuse Potential |
|---|---------|----------------|-----------------|
| 1 | Result-object error handling (3 dialects) | `src/services/*`, `src/services/storage/*`, `src/types` | ★★★ unify into one `Result<T>` |
| 2 | Typed error hierarchy + boundary handler | `lambda/src/utils/errors.ts`, `response.ts` | ★★★ fully portable |
| 3 | Response envelope + pagination tokens | `lambda/src/utils/response.ts` | ★★★ fully portable |
| 4 | The 4-step Lambda handler recipe | `lambda/src/handlers/*` | ★★★ extract a handler wrapper |
| 5 | Throw-based validators + error collection | `lambda/src/utils/validation.ts` | ★★☆ replace with shared schema |
| 6 | Single-table key factory | `lambda/src/types/keys.ts` | ★★★ generalize per-entity |
| 7 | Repository layer over Document Client | `lambda/src/repository/*` | ★★☆ pattern reusable as-is |
| 8 | Abstract StorageAdapter (adapter pattern) | `src/services/storage/*` | ★☆☆ see lesson #3 below |
| 9 | Feature flag + dual data source (strangler fig) | `src/hooks/useDataSource.ts`, `src/config/app.config.ts`, `src/services/migrationService.ts` | ★★★ the migration playbook is the reusable artifact |
| 10 | Layered config with deep merge + dot-path access | `src/config/app.config.ts` | ★★☆ with caveats (lesson #4) |
| 11 | Singleton clients with late dependency injection | `src/services/apiClient.ts`, `lambda/src/utils/dynamodb.ts` | ★★★ |
| 12 | Tailwind style maps (proto-CVA) | `src/styles/*.ts`, `src/constants/index.ts` | ★★☆ or adopt `class-variance-authority` |
| 13 | Scoped error boundaries | `src/components/ErrorBoundary.tsx`, `ChartErrorBoundary.tsx` | ★★★ |
| 14 | Bash IaC framework (input vs generated config) | `scripts/config.sh`, `scripts/setup-infrastructure.sh`, `scripts/phase*/` | ★★★ extractable as a template |
| 15 | Tenant isolation via partition key + JWT claims | `lambda/src/utils/auth.ts`, key design | ★★★ |
| 16 | Story-numbered file headers (traceability) | most `.ts` file headers | ★★☆ convention, not code |

---

## 2. The Patterns in Detail

### 2.1 Result Objects — One Idea, Three Dialects

The codebase converged on "don't throw across module boundaries, return a discriminated
result" — but arrived at three different shapes at three different times:

```
Dialect A — ServiceResult<T>          (apiClient, migrationService, API-mode code)
  { success: boolean, data?: T, error?: string, metadata?: {...} }

Dialect B — StorageResult             (StorageAdapter family)
  { success: boolean, data: unknown, error: string|null, errorCode: string|null }

Dialect C — ad-hoc service results    (TransactionService, InterestService)
  { success: boolean, error?: string, errorCode?: TRANSACTION_SERVICE_ERROR_CODES.* , ...payload }
```

Each dialect also invented its own error-code constant object
(`STORAGE_ERROR_CODES`, `TRANSACTION_SERVICE_ERROR_CODES`, and the Lambda `code` strings).

**Learning:** the *instinct* was right and consistent; the *shape* was reinvented per layer.
Callers must remember which dialect they are talking to.

**Generic version:** one shared type, used everywhere:

```typescript
type Result<T, E = AppErrorInfo> =
  | { ok: true; value: T }
  | { ok: false; error: E };   // E carries { code, message, details? }
```

Put it in a shared package (see §5) so frontend, Lambda, and any future service speak the
same envelope. Error-code objects become one enum namespace instead of three.

### 2.2 Typed Error Hierarchy with a Boundary Handler (Backend)

The Lambda side takes the *opposite* philosophy from the frontend: throw domain-typed errors
freely, catch exactly once at the handler boundary
([errors.ts](lambda/src/utils/errors.ts), [response.ts](lambda/src/utils/response.ts)):

- `AppError` base carries `statusCode`, `code`, and `isOperational` (expected vs bug).
- Subclasses map 1:1 to HTTP semantics (`ValidationError`→400 … `InternalError`→500).
- `normalizeError()` adapts *vendor* exceptions into domain errors — e.g. DynamoDB
  `ConditionalCheckFailedException` → `ConflictError`. This is the key move: vendor error
  names never leak past the utils layer.
- `handleError()` logs operational errors at `info`, unexpected ones at `error` with a
  correlation ID, and only 5xx responses expose the correlation ID to clients.
- Security nuance encoded in the type itself: `NotFoundError`'s doc comment records the
  decision to return 404 (not 403) for cross-tenant access, so existence isn't leaked.

**Reuse:** this trio (`errors.ts` + `response.ts` + the `normalizeError` adapter idea) is
project-agnostic. Only the vendor-mapping table inside `normalizeError` changes per stack.

**Learning:** two error philosophies coexist in one repo — return-based (frontend) and
throw-with-boundary (backend). Both work; the boundary-handler style produced the smaller,
more uniform call sites. Pick one per tier and write it down.

### 2.3 The 4-Step Handler Recipe

Every API handler ([createTracker.ts](lambda/src/handlers/createTracker.ts) is the cleanest
example) follows the same mechanical shape:

```
1. getUserId(event)            // auth: JWT claims → userId
2. parseBody(event) + validate // input
3. repository.operation(...)   // data
4. success()/created(...)      // output
catch → handleError(err, { requestId })
```

**Learning:** the discipline made every handler ~40 lines and instantly readable, but steps
1, 2, and the try/catch are copy-pasted eight times.

**Generic version:** a higher-order wrapper (hand-rolled or middy-style):

```typescript
export const handler = withApi(
  { validate: validateCreateTrackerInput },
  async ({ userId, input }) => created(toResponse(await createTracker({ ...input, userId })))
);
```

The wrapper owns auth extraction, body parsing, validation, error handling, and logging.
Handlers shrink to pure business intent. This is the single highest-leverage refactor on the
backend.

### 2.4 Validation — Two Styles, Duplicated Rules

- **Backend** ([validation.ts](lambda/src/utils/validation.ts)): small throwing validators
  (`validateAmount`, `validateInterestRate`, …) composed into per-endpoint functions that
  *collect* field errors into a `Record<string, string>` before throwing one
  `ValidationError('Validation failed', details)`. Good UX: the client gets all field errors
  at once, not just the first.
- **Frontend** ([validators.ts](src/utils/validators.ts), [useValidation.ts](src/hooks/useValidation.ts)):
  returning validators (`{ isValid, error, value }`) plus a hook managing
  `errors`/`touched` state.

The actual *rules* (amount is a positive number, interest rate 0–100, mode ∈ {savings, debt})
exist in both codebases with no shared source.

**Generic version:** define each request/entity once as a schema (zod or similar) in a shared
package; derive backend validation, frontend form validation, *and* the TypeScript types from
it. The try/catch-per-field error-collection pattern in `validateCreateTrackerInput` is
exactly what schema libraries give you for free.

### 2.5 Single-Table DynamoDB Key Factory

[keys.ts](lambda/src/types/keys.ts) is the most immediately reusable module in the repo:

- `KEY_PREFIXES` as a single `as const` source of truth.
- Builders (`userPK`, `trackerSK`, `entrySK`, `entryPrefix`) — note `entryPrefix()` exists
  *specifically* to make `begins_with` queries typo-proof.
- Extractors (`extractTrackerId`, `extractEntryTimestamp`) and a discriminator
  (`getEntityType`) so parsing keys is centralized too. Round-tripping keys through one
  module means the SK format can change in one place.
- Entries embed a **timestamp in the sort key** (`ENTRY#<trackerId>#<iso>`), which buys
  chronological ordering, range queries, and "latest N" for free — documented with the full
  access-pattern table in [lambda/SCHEMA.md](lambda/SCHEMA.md).

**Generic version:** the shape generalizes to any single-table design:

```typescript
const Entity = <P extends string>(prefix: P) => ({
  key: (...ids: string[]) => `${prefix}#${ids.join('#')}`,
  prefix: (...ids: string[]) => `${prefix}#${ids.join('#')}#`,
  parse: (sk: string) => sk.startsWith(`${prefix}#`) ? sk.slice(prefix.length + 1).split('#') : null,
});
```

Also worth keeping: SCHEMA.md's **"GSI Evaluation" section that concludes "no GSI"** — writing
down why you *didn't* add infrastructure is as valuable as documenting what you did.

### 2.6 Repository Layer

[trackerRepository.ts](lambda/src/repository/trackerRepository.ts) /
[entryRepository.ts](lambda/src/repository/entryRepository.ts): plain exported async
functions (not classes) over the Document Client, with `getTableName()` reading the env var
lazily and throwing loudly if unset, and `ConditionExpression: 'attribute_not_exists(PK)'`
guarding creates. Handlers never see DynamoDB commands. Style note: functions-as-module beats
a class here — there's no state to encapsulate, and tests import exactly what they mock.

### 2.7 The Singleton-with-Late-Configuration Trick

[apiClient.ts](src/services/apiClient.ts) solves a real problem neatly: the HTTP client is a
module-level singleton (importable anywhere, including non-React code), but the JWT lives in
React context. The bridge is `apiClient.configure(getAccessToken)` called once at startup by
an `ApiClientConfigurator` component — the client stores a *getter*, not a token, so it always
reads the current token at request time and never holds a stale one.

The same idea appears twice more: the shared `LocalStorageAdapter` instance in
[useLocalStorage.ts](src/hooks/useLocalStorage.ts) and the module-level `docClient` in
[lambda/src/utils/dynamodb.ts](lambda/src/utils/dynamodb.ts) (which in Lambda doubles as a
warm-start optimization).

**Reuse:** "singleton + injected getter" is the generic recipe for wiring React-context
values into non-React modules. Also portable: the `request<T>()` core of ApiClient
(envelope unwrapping, 204 handling, network-error translation to friendly messages) is
app-agnostic — only the endpoint methods are domain-specific.

### 2.8 Feature Flag + Strangler-Fig Migration

The localStorage→cloud migration is the repo's best end-to-end pattern:

1. Config-driven flag: `features.useApiBackend` from `REACT_APP_USE_API_BACKEND`
   ([app.config.ts](src/config/app.config.ts)).
2. One tiny selector hook, [useDataSource.ts](src/hooks/useDataSource.ts), so components ask
   "which mode?" in exactly one way.
3. Two parallel component trees in App.tsx (API mode vs localStorage mode) — coexisting, not
   replaced.
4. A one-time importer ([migrationService.ts](src/services/migrationService.ts)) that
   snapshots localStorage, replays it through the public API in chronological order, and
   reports `{ entriesMigrated, entriesFailed, errors }` per item rather than all-or-nothing.
5. A `MigrationBanner` to let the user trigger it.

The staged rollout plan (read-only → dual-write → promote → import) is written down in
[README.md](README.md) under "Migration Strategy".

**Reuse:** this five-piece kit (flag → selector hook → parallel paths → replayer → UI prompt)
is the reusable migration playbook for any client-side-storage-to-backend move.

### 2.9 Bash IaC Framework

The `scripts/` tree amounts to a small homegrown IaC framework worth extracting as a template:

- **Input vs generated config split** ([config.sh](scripts/config.sh)): humans edit only the
  input section (project name, region); every AWS-generated ID is written by setup scripts to
  `scripts/generated/*.json` and re-hydrated by `config.sh` via `jq`. The JSON files are a
  poor-man's Terraform state — explicit, diffable, git-ignorable.
- **Derived naming convention**: every resource name derives from `PROJECT_NAME`
  (`${PROJECT_NAME}-frontend-${AWS_ACCOUNT_ID}`, `${PROJECT_NAME}-user-pool`, …), so the whole
  stack is re-brandable by changing one variable.
- **Phased orchestrator**: `setup-infrastructure.sh --phase 2,3 --dry-run`, with numbered
  `phaseN/NN-*.sh` scripts, matching `verify-*.sh` smoke tests, and matching cleanup scripts
  (through to `nuclear-cleanup.sh`).
- **Shared print helpers** (`print_header/step/success/error/info`, `verify_aws_cli`,
  `wait_for_cloudfront`) giving every script the same UX.
- [deploy.sh](scripts/deploy.sh) is the payoff: because config.sh resolves everything, the
  entire frontend deploy is three lines (build → s3 sync → CloudFront invalidation).

**Reuse:** copy `config.sh` + the orchestrator + the generated-state convention into any
CLI-provisioned project; only the input block and phase contents change. (The README already
notes the graduation path: Terraform/CDK once state management matters.)

### 2.10 Frontend Style Systems

- [buttonStyles.ts](src/styles/buttonStyles.ts) / `inputStyles` / `cardStyles`: Tailwind
  class strings organized as `base + sizes + variants{base,disabled}` maps. This is a
  hand-rolled precursor of `class-variance-authority` — if reused, either extract the
  `getButtonStyles(variant, size, state)` composer generically or just adopt CVA.
- [constants/index.ts](src/constants/index.ts) `COLORS.SAVINGS/DEBT`: mode-keyed color
  palettes so "green means savings, red means debt" is decided in one place, including chart
  hex values alongside Tailwind classes.
- Scoped error boundaries: a general `ErrorBoundary` at the app root plus a dedicated
  `ChartErrorBoundary` wrapping the riskiest third-party surface (Recharts) — the generic
  lesson being *put a boundary around each third-party visualization, not just the root*.

### 2.11 Tenant Isolation as a Data-Model Property

Security is structural, not procedural: every query key starts with
`USER#<sub-from-JWT>` ([auth.ts](lambda/src/utils/auth.ts) extracts it, the repositories bake
it into `PK`), so a handler *cannot* express a cross-tenant read. Combined with the JWT
authorizer at the gateway (Lambdas never validate tokens themselves) and the 404-for-403
convention, this is a compact, reusable multi-tenant recipe. There is even a dedicated test
file for it: `lambda/src/handlers/__tests__/dataIsolation.test.ts`.

The one deliberate exception: `calculateInterest.ts` uses a cross-partition **Scan** (it must
touch all users' trackers). It's acceptable at this scale and documented as such — but note
it is the only code path not covered by the partition-key guarantee, and the first candidate
for a sparse GSI if tracker counts grow.

---

## 3. Style Archaeology — Three Generations of Code

The repo visibly contains three coding eras. Knowing which era a file belongs to explains
most style inconsistencies:

| Generation | Tell-tale signs | Representative files |
|------------|-----------------|----------------------|
| **Gen 1: JS-with-JSDoc, renamed to .ts** | `@param {string}` JSDoc types, untyped function params, `class` with throwing method stubs as "abstract", default exports | `StorageAdapter.ts`, `LocalStorageAdapter.ts`, `app.config.ts`, `useLocalStorage.ts`, `TransactionService.ts` |
| **Gen 2: idiomatic frontend TS** | typed `ServiceResult<T>`, `import type`, discriminated unions, named exports | `apiClient.ts`, `migrationService.ts`, `useDataSource.ts`, `auth.config.ts` |
| **Gen 3: strict backend TS** | full generics, `as const`, typed error hierarchy, exhaustive interfaces | everything under `lambda/src/` |

Observations for posterity:

- **Gen 1 "abstract classes" predate TypeScript**: `StorageAdapter` simulates abstractness
  with `throw new Error('must be implemented by subclass')` — in Gen 3 style this would be an
  `interface` (or `abstract class`) and the compiler would do the enforcing.
- **File-header convention**: nearly every file carries a block comment with a summary,
  `@fileoverview`, and often a **story number** (`Story 5.9: Lambda Error Handling Pattern`).
  The story numbers are a cheap, effective traceability convention — grep a story number and
  find every file it touched. Worth keeping in future projects.
- **Class services vs function modules**: the frontend wraps stateless logic in classes with
  static methods (`TransactionService.createTransaction`); the Lambda side uses plain exported
  functions. The function style won on readability and testability — the classes hold no state.

---

## 4. Divergence Hazards — Where Duplication Already Bit (or Will)

These are the concrete "lessons learned" — same concept, two implementations, subtle drift.

### Lesson 1: Duplicated math *diverges*. Interest & day-counting exist twice.

| | Frontend [interestCalculator.ts](src/utils/interestCalculator.ts) | Lambda [calculateInterest.ts](lambda/src/handlers/calculateInterest.ts) |
|---|---|---|
| Units | **dollars** (floats) | **cents** (integers) |
| Compounding | configurable (daily/monthly/yearly) via config | fixed daily |
| Rounding | configurable round/floor/ceil at `precision` | `Math.round` to a cent |
| `daysBetween` | `Math.ceil(diff / day)` | `Math.floor(diff / day)` |

The `daysBetween` discrepancy means the two sides can legitimately disagree by a full day of
interest for the same pair of timestamps. Nothing enforces agreement; nothing tests it.

**Fix / generic version:** one shared financial-math module (cents-only, pure functions,
exhaustively unit-tested) consumed by both tiers. If tiers can't share code, at minimum share
*test vectors* (a JSON file of input/expected pairs both test suites must pass).

### Lesson 2: Unit conventions must be global, not per-tier.

The API/DynamoDB world is strictly integer **cents** (enforced by `validateAmount`, documented
in SCHEMA.md). The legacy localStorage world is float **dollars**. The boundary conversion
lives implicitly in migration/display code. Future projects: pick the integer representation
on day one, everywhere, and make the display layer the *only* place that formats
([formatCurrency.ts](src/utils/formatCurrency.ts) with `Intl.NumberFormat` is the right
shape for that layer — locale- and config-driven, no math).

### Lesson 3: Abstractions at the wrong altitude don't get reused.

`StorageAdapter` promised "swap localStorage for IndexedDB *or an API* without changing app
logic." When the API arrived, it did **not** slot in as an adapter — because the adapter
abstracts *key-value storage*, while the API is *entity-shaped* (trackers, entries,
pagination, auth). The migration instead forked at the top (`useDataSource` + parallel
component trees), and the adapter's extra surface (`getStorageInfo`, `testStorage`, retries)
went largely unused.

**Learning:** abstract at the level of *domain operations* (`TrackerStore.list/create/…`),
not the level of *storage mechanics*, if the goal is backend-swapping. A
`TrackerStore` interface with `LocalStorageTrackerStore` and `ApiTrackerStore`
implementations would have made the feature flag a one-line provider swap instead of a
duplicated component tree.

### Lesson 4: Speculative configuration is dead weight.

[app.config.ts](src/config/app.config.ts) defines ~25 feature flags (`bankAccountSync`,
`communityGoals`, `investmentTracking`, …) that no code reads, plus config blocks
(`performance.virtualScrolling`, `storage.encryptData`) that are aspirational. The *machinery*
(deep-merged env overlays, `config.get('dot.path', default)`, `isFeatureEnabled`) is genuinely
reusable; the *content* shows the failure mode: flags added "for later" become documentation
that lies. Add a flag when the first `isFeatureEnabled` call for it lands.

### Lesson 5: Three result dialects = three sets of caller idioms.

Covered in §2.1 — the cost isn't correctness, it's that every new contributor must learn
which `success`/`error` shape each layer returns. Standardize the envelope before the second
dialect appears, not after the third.

---

## 5. Reuse Roadmap — What to Extract, in Order of Leverage

If this codebase were the seed of a template or a second product, extract in this order:

1. **`shared/core` package** (used by both `src/` and `lambda/`):
   - `Result<T>` type (§2.1) and the `AppError` taxonomy (§2.2)
   - Money utilities: cents-integer type, arithmetic, `formatCurrency`
   - Financial math: `calculateInterest`, `daysBetween` — single source (§4, Lesson 1)
   - Domain types + validation schemas (`Tracker`, `Entry`, request shapes) so FE forms,
     BE validation, and TS types derive from one definition (§2.4)
   - Domain constants (`MODES`, `TRANSACTION_TYPES`) — currently defined independently in
     `src/constants` and `lambda/src/types`
2. **Lambda kit**: `withApi` handler wrapper (§2.3) + `response.ts` envelope/pagination +
   `auth.ts` claims extraction + `normalizeError` vendor adapter. Roughly 90% of
   `lambda/src/utils/` is project-agnostic already.
3. **Single-table toolkit**: generic entity key factory (§2.5) + the repository conventions
   (§2.6) + the SCHEMA.md documentation format (entities → access patterns → GSI evaluation).
4. **Bash IaC template**: `config.sh` input/generated split, phase orchestrator,
   verify/cleanup script pairing, print helpers (§2.9).
5. **Frontend kit**: `request<T>` HTTP core with token-getter injection (§2.7),
   `useDataSource`-style flag selector + migration replayer playbook (§2.8), error-boundary
   pair (§2.10), CVA-style style maps or CVA itself.
6. **Conventions doc**: story-numbered file headers, `@fileoverview` blocks, cents-everywhere
   rule, 404-for-403 tenant rule, "document rejected alternatives" (README's Rejected
   Alternatives section and SCHEMA.md's GSI evaluation are the exemplars).

---

## 6. Documentation Patterns Worth Repeating

The docs themselves follow patterns worth carrying forward:

- **ASCII diagrams in ARCHITECTURE.md** — renders everywhere, diffs cleanly in git, no
  external tooling. Ages better than image exports.
- **Access-pattern tables before schema** ([lambda/SCHEMA.md](lambda/SCHEMA.md)) — the
  DynamoDB doc lists every query the app makes *and* evaluates the GSI it chose not to build.
- **Rejected alternatives sections** ([README.md](README.md)) — RDS, Step Functions,
  multi-region: each named with the reason it lost. Prevents relitigating.
- **"What I'd do next with more scale" appendix** — separates deliberate simplifications
  from oversights, which is exactly the distinction a future reader needs.
- **Per-concern docs in `docs/`** (security review, IAM strategy, production readiness,
  infrastructure scripts) rather than one monolith.
