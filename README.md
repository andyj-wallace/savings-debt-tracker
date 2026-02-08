# Debt Tracker Web App

## Problem Statement
Personal finance tools often reduce savings and debt tracking to simple CRUD operations, ignoring time-based effects like interest, compounding, and behavioral patterns. This project addresses that gap by modeling financial progress as an event-driven system, with explicit support for interest-aware debt evolution and long-term tracking.
The goal of this project is not only to deliver a functional application, but to demonstrate systems-level architectural thinking aligned with AWS Solutions Architect – Associate (SAA) expectations.

Use Cases
Savings Mode
* Track progress toward a target savings goal
* Record deposits and adjustments
* Visualize progress over time
Debt Mode
* Track outstanding debt balances
* Apply interest using daily compounding rules
* Record payments as immutable financial events
* Show remaining balance, interest accrued, and payoff progress

Constraints & Assumptions
* Traffic profile: Low average usage with unpredictable spikes
* Consistency model: Eventual consistency acceptable for progress views
* Availability target: Single AWS region, multi-AZ via managed services
* Cost sensitivity: Must remain within AWS Free Tier at low usage
* Security posture: No long-lived credentials, least-privilege access
These constraints are explicitly chosen to reflect real-world tradeoffs rather than over-engineering.

Architecture Overview
Frontend
* React + TypeScript
* Initially uses localStorage for persistence
* Gradually migrated to backend-backed persistence
Backend (Serverless)
* Amazon API Gateway (HTTP API)
* AWS Lambda (stateless compute)
* Amazon DynamoDB (single-table design)
* Amazon Cognito (user authentication)
* Amazon EventBridge (scheduled jobs)
This architecture favors cost efficiency, automatic scaling, and operational simplicity for bursty workloads.

Key Design Decisions
Serverless-First Backend
* Eliminates idle compute costs
* Scales automatically with demand
* Encourages stateless, fault-tolerant design
Thin Lambdas
* One Lambda per bounded action (not per table)
* Business logic separated from infrastructure concerns
Backend as Source of Truth
* Frontend initially reads from localStorage
* Gradual migration to backend authority using feature flags
* Prevents data loss and supports rollback during transition

Data Model (DynamoDB Single-Table Design)
Partition Key: USER#<userId>
Sort Key Patterns:
* TRACKER#<trackerId> – Savings or debt tracker metadata
* ENTRY#<timestamp> – Financial events (payments, deposits, interest)
* SUMMARY#CURRENT – Cached current-state snapshot
Design Rationale
* Optimized for per-user access patterns
* Time-ordered event storage
* Supports auditability and recomputation
* Avoids read amplification
Balances are derived from events, not stored as mutable state.

Interest Calculation Flow
* Raw financial events (payments, deposits) are recorded immediately
* Interest is not calculated on every read
* EventBridge triggers scheduled Lambda executions (daily or monthly)
* Lambda computes accrued interest since last checkpoint
* Interest is written back as immutable event entries
This approach:
* Controls compute costs
* Improves determinism
* Avoids expensive recalculation during reads

Failure Scenarios & Resilience
* DynamoDB writes use retries with exponential backoff
* Interest calculation Lambda configured with a Dead Letter Queue (DLQ)
* CloudWatch alarms monitor:
    * Lambda error rates
    * DLQ depth
Failure example:If interest calculation fails for a day, the next successful run computes interest for the entire missed period using the last-applied timestamp.

Security Model
* Authentication via Amazon Cognito User Pools
* API Gateway JWT authorizer protects backend endpoints
* IAM roles scoped per Lambda function
* User identity propagated via JWT claims
* Data access constrained by partition key (USER#<id>)
Blast radius is intentionally limited: a compromised function cannot access other users’ data.

Cost Considerations
* DynamoDB on-demand capacity avoids over-provisioning
* Lambda and API Gateway scale to zero when idle
* Event-driven interest computation minimizes unnecessary compute
Primary cost drivers:
* Number of active users
* Number of financial events per user per month
This design remains viable within AWS Free Tier for low-to-moderate usage.

Rejected Alternatives
* Multi-region deployment: unnecessary complexity for current availability needs
* Amazon RDS: higher cost and poor fit for bursty traffic
* Real-time interest recalculation on reads: wasteful compute
* AWS Step Functions: overkill for simple scheduled workflows
These options were consciously rejected to preserve simplicity and cost efficiency.

Migration Strategy (Frontend → AWS Backend)
1. Backend introduced alongside existing frontend
2. Feature flag added to toggle backend usage
3. Backend integrated in read-only mode
4. Temporary dual-write to backend and localStorage
5. Backend promoted to source of truth
6. One-time import of existing localStorage data
This incremental approach avoids downtime and data loss.

## Deployment

### Infrastructure Setup (IaC)

All AWS infrastructure is provisioned via bash scripts in `scripts/`. To set up from scratch:

```bash
./scripts/setup-infrastructure.sh              # Run all phases
./scripts/setup-infrastructure.sh --phase 2,3  # Run specific phases
./scripts/setup-infrastructure.sh --dry-run    # Preview changes
```

| Phase | Resources Created |
|-------|-------------------|
| 1 | IAM roles for Lambda (CloudWatch Logs + DynamoDB policies) |
| 2 | S3 bucket + CloudFront distribution (HTTPS, SPA routing) |
| 3 | Cognito User Pool + App Client + Hosted UI |
| 4 | API Gateway HTTP API with JWT authorizer |
| 6 | DynamoDB table (single-table design with PK/SK) |

Configuration is split between **input** (project name, region in `config.sh`) and **generated** (AWS-created IDs stored in JSON files). See [docs/infrastructure-scripts.md](docs/infrastructure-scripts.md) for details.

To tear down: `./scripts/cleanup-infrastructure.sh`

### Frontend Deployment

Deploy the React app to S3/CloudFront:

```bash
./scripts/deploy.sh
```

Builds the app, syncs to S3, and invalidates CloudFront cache.

**Prerequisites:** AWS CLI configured, infrastructure provisioned via `setup-infrastructure.sh`

### Lambda Types

TypeScript type definitions for DynamoDB entities are in `lambda/src/types/`:
- `dynamodb.ts` - Entity interfaces (TrackerItem, EntryItem, SummaryItem)
- `keys.ts` - Key generation utilities for single-table design
- Schema documentation in `lambda/SCHEMA.md`

Summary
Debt Tracker is intentionally designed as a systems-focused serverless application, emphasizing tradeoffs, failure handling, and cost-aware architecture. The project demonstrates how time-based financial logic can be modeled using event-driven patterns on AWS, rather than as a simple CRUD application.


Appendix: "What I'd Do Next With More Scale"
If usage or funding increased, I'd focus on resilience, observability, and cost control:
* Migrate bash IaC scripts to Terraform/CDK for state management
* Add CI/CD (GitHub Actions → AWS)
* Introduce CloudWatch dashboards + alarms
* Add API caching (API Gateway / CloudFront)
* Evaluate Aurora Serverless v2 if relational access becomes necessary
* Implement rate limiting + WAF
* Move secrets to SSM Parameter Store
Key point: nothing above requires re-writing the core system—just layering.