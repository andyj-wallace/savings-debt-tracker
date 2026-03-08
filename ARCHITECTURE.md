# Debt Tracker — Architecture Overview as of Feb 14, 2026

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS (Browser)                                │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                    HTTPS (CloudFront CDN)
                                   │
         ┌─────────────────────────┼─────────────────────────────┐
         │                         │                             │
         ▼                         ▼                             ▼
┌─────────────────┐   ┌───────────────────────┐   ┌──────────────────────┐
│   CloudFront    │   │   Cognito Hosted UI   │   │   API Gateway v2     │
│   Distribution  │   │   (Login / Signup)    │   │   (HTTP API)         │
│                 │   │                       │   │                      │
│  Static React   │   │  OIDC Auth Code +     │   │  JWT Authorizer      │
│  SPA (S3)       │   │  PKCE Flow            │   │  (validates Cognito  │
│                 │   │                       │   │   access tokens)     │
└────────┬────────┘   └───────────┬───────────┘   └──────────┬───────────┘
         │                        │                          │
         │                        │                     Routes to
    Serves build/                 │                     Lambda fns
    from S3 bucket           Issues JWT                      │
                             (access_token)                  │
                                                             ▼
                                              ┌──────────────────────────┐
                                              │     AWS Lambda (x8)      │
                                              │                          │
                                              │  listTrackers            │
                                              │  createTracker           │
                                              │  getTracker              │
                                              │  updateTracker           │
                                              │  deleteTracker           │
                                              │  listEntries             │
                                              │  createEntry             │
                                              │  calculateInterest ←──── EventBridge
                                              │                    (daily schedule)
                                              └────────────┬─────────────┘
                                                           │
                                                      DynamoDB
                                                      Document Client
                                                           │
                                                           ▼
                                              ┌──────────────────────────┐
                                              │  DynamoDB Single Table   │
                                              │  "debt-tracker-data"     │
                                              │                          │
                                              │  PK: USER#<userId>       │
                                              │  SK: TRACKER#<id>        │
                                              │      ENTRY#<id>#<ts>     │
                                              │      SUMMARY#<id>       │
                                              └──────────────────────────┘
```

---

## Frontend Architecture

```
index.tsx
│
├── AuthProvider (react-oidc-context / Cognito OIDC)
│   └── ApiClientConfigurator (wires access_token → apiClient singleton)
│       └── App.tsx
│           └── ErrorBoundary
│               └── ProtectedRoute (auth gate)
│                   │
│                   ├── AuthHeader (user email + sign out)
│                   │
│                   ├─── [API Mode] ─────────────────────────────────────┐
│                   │    ├── OfflineBanner                               │
│                   │    ├── MigrationBanner (localStorage → cloud)      │
│                   │    │                                               │
│                   │    ├── TrackerList ←→ apiClient.listTrackers()     │
│                   │    ├── CreateTrackerForm ←→ apiClient.create...()  │
│                   │    └── TrackerDetail ←→ apiClient.get/update/...() │
│                   │         ├── Entry form + history                   │
│                   │         ├── StatsPanel → StatCard(s)               │
│                   │         └── Chart (Recharts)                       │
│                   │                                                    │
│                   └─── [localStorage Mode] ────────────────────────────┐
│                        └── TrackerProvider (React Context)             │
│                            └── DebtSavingsThermometer                  │
│                                 ├── ModeSelector                      │
│                                 ├── GoalInput                         │
│                                 ├── InterestSettings                  │
│                                 ├── ThermometerDisplay                │
│                                 ├── ProgressUpdater                   │
│                                 ├── StatsPanel → StatCard(s)          │
│                                 ├── Chart (Recharts)                  │
│                                 └── TransactionHistory                │
```

---

## Backend Lambda Architecture

```
API Gateway Request
        │
        ▼
┌──────────────────────────────────────────┐
│             Lambda Handler               │
│                                          │
│  1. getUserId(event)                     │  ← extracts JWT claims.sub
│  2. parseBody(event) + validate()        │  ← input validation
│  3. repository.operation()               │  ← DynamoDB call
│  4. return success() / created()         │  ← consistent JSON envelope
│                                          │
│  catch → handleError()                   │  ← error hierarchy → HTTP status
└──────────────────────────────────────────┘

Error Hierarchy:
  AppError
  ├── ValidationError     → 400
  ├── AuthenticationError → 401
  ├── AuthorizationError  → 403
  ├── NotFoundError       → 404
  ├── ConflictError       → 409
  └── InternalError       → 500

Response Envelope:
  ✓ { success: true,  data: {...}, message: "..." }
  ✗ { success: false, error: { code, message, details, correlationId } }
```

---

## DynamoDB Single-Table Design

```
┌──────────────────┬──────────────────────────────┬────────────────────────┐
│   PK             │   SK                         │   Entity               │
├──────────────────┼──────────────────────────────┼────────────────────────┤
│ USER#<userId>    │ TRACKER#<trackerId>           │ Tracker metadata       │
│                  │   name, mode, goalAmount,     │   (savings or debt)    │
│                  │   currentAmount, interestRate │                        │
├──────────────────┼──────────────────────────────┼────────────────────────┤
│ USER#<userId>    │ ENTRY#<trackerId>#<timestamp> │ Financial event        │
│                  │   amount, type, note,         │   (transaction or      │
│                  │   runningTotal                │    interest accrual)   │
├──────────────────┼──────────────────────────────┼────────────────────────┤
│ USER#<userId>    │ SUMMARY#<trackerId>           │ Pre-computed stats     │
│                  │   totalDeposits, totalWith-   │   (updated on each     │
│                  │   drawals, totalInterest      │    entry creation)     │
└──────────────────┴──────────────────────────────┴────────────────────────┘

All monetary values stored in CENTS (integers).
All queries scoped to USER# partition → automatic tenant isolation.
```

---

## Authentication Flow

```
  Browser                    Cognito                   API Gateway        Lambda
    │                          │                           │                │
    │──── signinRedirect() ───▶│                           │                │
    │                          │── Login page ────▶ User   │                │
    │◀── auth code (PKCE) ─────│                           │                │
    │──── exchange code ──────▶│                           │                │
    │◀── access_token (JWT) ───│                           │                │
    │                          │                           │                │
    │──── GET /trackers ──────────────────────────────────▶│                │
    │     Authorization: Bearer <token>                    │                │
    │                          │     validate JWT ─────────│                │
    │                          │◀──── JWKS ────────────────│                │
    │                          │                           │──── invoke ───▶│
    │                          │                           │                │── userId
    │                          │                           │                │   from
    │                          │                           │◀── response ───│   claims
    │◀── JSON response  ───────────────────────────────────┤                │   .sub
    │                          │                           │                │
```

---

## Infrastructure Setup Pipeline (Shell Scripts)

```
scripts/setup-infrastructure.sh
        │
        ├── Phase 1: Prerequisites
        │   ├── 01-verify-prerequisites.sh    (AWS CLI, credentials)
        │   └── 02-setup-iam-roles.sh         (Lambda execution role)
        │
        ├── Phase 2: Frontend Hosting
        │   ├── 01-setup-s3.sh                (S3 bucket)
        │   ├── 02-setup-cloudfront.sh         (CDN distribution)
        │   └── 03-setup-bucket-policy.sh      (OAC policy)
        │
        ├── Phase 3: Authentication
        │   ├── 01-setup-cognito-user-pool.sh
        │   ├── 02-setup-cognito-app-client.sh
        │   └── 03-setup-cognito-domain.sh
        │
        ├── Phase 4: API Layer
        │   └── 01-setup-api-gateway.sh        (HTTP API + JWT authorizer)
        │
        ├── Phase 5: Compute
        │   ├── 01-build-lambda.sh             (TypeScript → JS)
        │   ├── 02-deploy-lambdas.sh           (zip + upload)
        │   └── 03-integrate-api-gateway.sh    (route → Lambda wiring)
        │
        ├── Phase 6: Database
        │   └── 01-setup-dynamodb.sh           (single table)
        │
        └── Phase 10: Operations
            ├── 01-setup-monitoring.sh         (CloudWatch alarms)
            └── 02-setup-interest-scheduler.sh (EventBridge daily cron)

scripts/deploy.sh                              (rebuild + S3 sync + CDN invalidation)
scripts/nuclear-cleanup.sh                     (tear down everything)
```

---

## Tech Stack Summary

| Layer             | Technology                                    |
|-------------------|-----------------------------------------------|
| Frontend          | React 19, TypeScript 5, Tailwind CSS 3        |
| Charts            | Recharts                                      |
| Icons             | Lucide React                                  |
| Auth (Client)     | react-oidc-context + oidc-client-ts           |
| Auth (Server)     | Amazon Cognito (OIDC + PKCE)                  |
| API               | API Gateway HTTP API v2 + JWT Authorizer      |
| Compute           | AWS Lambda (Node.js 18+)                      |
| Database          | DynamoDB (single-table design)                |
| Hosting           | S3 + CloudFront CDN                           |
| Scheduling        | Amazon EventBridge (daily interest calc)      |
| Monitoring        | CloudWatch Alarms                             |
| IaC               | Shell scripts (phased AWS CLI)                |
| Build             | Create React App (frontend), tsc (Lambda)     |
| Region            | us-east-2                                     |

---

## Key Design Decisions

1. **Dual-mode data source** — Feature flag switches between localStorage (offline/demo) and API-backed (production) modes, enabling progressive migration
2. **Single-table DynamoDB** — All entities share one table with composite keys for efficient queries and tenant isolation via `USER#` partition
3. **Cents-based currency** — All monetary values stored as integers (cents) to avoid floating-point precision errors
4. **Serverless-only** — No servers to manage; Lambda + DynamoDB + S3/CloudFront scales to zero cost at idle
5. **Shell-script IaC** — Infrastructure provisioned via phased bash scripts calling AWS CLI directly (no Terraform/CDK)
6. **Daily interest accrual** — EventBridge triggers a Lambda that scans all trackers with interest rates and posts compound interest entries
