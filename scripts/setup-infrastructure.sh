#!/bin/bash
#===============================================================================
# Debt Tracker - Infrastructure Setup Orchestrator
#
# This script orchestrates the setup of all AWS infrastructure for the
# Debt Tracker application. It runs all phase scripts in order.
#
# Phases:
#   Phase 1: AWS Account & IAM Baseline (verification + IAM roles)
#   Phase 2: Frontend Hosting (S3 + CloudFront)
#   Phase 3: Cognito Authentication
#   Phase 6: DynamoDB Data Model
#
# Usage:
#   ./setup-infrastructure.sh              # Run all phases
#   ./setup-infrastructure.sh --phase 1    # Run specific phase
#   ./setup-infrastructure.sh --phase 2,3  # Run multiple phases
#   ./setup-infrastructure.sh --skip 1     # Skip specific phase
#   ./setup-infrastructure.sh --dry-run    # Show what would run
#
# Note: Phase 2 CloudFront setup takes 5-15 minutes.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

#-------------------------------------------------------------------------------
# Parse Arguments
#-------------------------------------------------------------------------------
RUN_PHASES="1,2,3,6"
SKIP_PHASES=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --phase)
            RUN_PHASES="$2"
            shift 2
            ;;
        --skip)
            SKIP_PHASES="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --phase PHASES   Run specific phases (comma-separated, e.g., 1,2,3)"
            echo "  --skip PHASES    Skip specific phases (comma-separated)"
            echo "  --dry-run        Show what would be executed without running"
            echo "  --help           Show this help message"
            echo ""
            echo "Phases:"
            echo "  1: AWS Account & IAM Baseline"
            echo "  2: Frontend Hosting (S3 + CloudFront)"
            echo "  3: Cognito Authentication"
            echo "  6: DynamoDB Data Model"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

#-------------------------------------------------------------------------------
# Determine Which Phases to Run
#-------------------------------------------------------------------------------
should_run_phase() {
    local phase=$1

    # Check if phase is in run list
    if [[ ! ",$RUN_PHASES," =~ ",$phase," ]]; then
        return 1
    fi

    # Check if phase is in skip list
    if [[ ",$SKIP_PHASES," =~ ",$phase," ]]; then
        return 1
    fi

    return 0
}

#-------------------------------------------------------------------------------
# Header
#-------------------------------------------------------------------------------
print_header "Debt Tracker Infrastructure Setup"

echo "Project:     $PROJECT_NAME"
echo "AWS Region:  $AWS_REGION"
echo "Account ID:  $AWS_ACCOUNT_ID"
echo ""
echo "Phases to run: $RUN_PHASES"
if [ -n "$SKIP_PHASES" ]; then
    echo "Phases to skip: $SKIP_PHASES"
fi
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "=== DRY RUN MODE - No changes will be made ==="
    echo ""
fi

#-------------------------------------------------------------------------------
# Phase 1: AWS Account & IAM Baseline
#-------------------------------------------------------------------------------
if should_run_phase 1; then
    print_header "PHASE 1: AWS Account & IAM Baseline"

    if [ "$DRY_RUN" = true ]; then
        echo "Would run:"
        echo "  - phase1/01-verify-prerequisites.sh"
        echo "  - phase1/02-setup-iam-roles.sh"
    else
        echo "Running Phase 1 scripts..."
        echo ""

        # Verify prerequisites
        bash "$SCRIPT_DIR/phase1/01-verify-prerequisites.sh"

        # Setup IAM roles
        bash "$SCRIPT_DIR/phase1/02-setup-iam-roles.sh"
    fi
else
    echo "Skipping Phase 1: AWS Account & IAM Baseline"
fi

#-------------------------------------------------------------------------------
# Phase 2: Frontend Hosting (S3 + CloudFront)
#-------------------------------------------------------------------------------
if should_run_phase 2; then
    print_header "PHASE 2: Frontend Hosting (S3 + CloudFront)"

    if [ "$DRY_RUN" = true ]; then
        echo "Would run:"
        echo "  - phase2/01-setup-s3.sh"
        echo "  - phase2/02-setup-cloudfront.sh (takes 5-15 min)"
        echo "  - phase2/03-setup-bucket-policy.sh"
    else
        echo "Running Phase 2 scripts..."
        echo ""
        echo "NOTE: CloudFront distribution creation takes 5-15 minutes."
        echo ""

        # Setup S3 bucket
        bash "$SCRIPT_DIR/phase2/01-setup-s3.sh"

        # Setup CloudFront distribution
        bash "$SCRIPT_DIR/phase2/02-setup-cloudfront.sh"

        # Setup bucket policy for CloudFront
        bash "$SCRIPT_DIR/phase2/03-setup-bucket-policy.sh"
    fi
else
    echo "Skipping Phase 2: Frontend Hosting"
fi

#-------------------------------------------------------------------------------
# Phase 3: Cognito Authentication
#-------------------------------------------------------------------------------
if should_run_phase 3; then
    print_header "PHASE 3: Cognito Authentication"

    if [ "$DRY_RUN" = true ]; then
        echo "Would run:"
        echo "  - phase3/01-setup-cognito-user-pool.sh"
        echo "  - phase3/02-setup-cognito-app-client.sh"
        echo "  - phase3/03-setup-cognito-domain.sh"
    else
        echo "Running Phase 3 scripts..."
        echo ""

        # Setup Cognito User Pool
        bash "$SCRIPT_DIR/phase3/01-setup-cognito-user-pool.sh"

        # Setup App Client
        bash "$SCRIPT_DIR/phase3/02-setup-cognito-app-client.sh"

        # Setup Hosted UI domain
        bash "$SCRIPT_DIR/phase3/03-setup-cognito-domain.sh"
    fi
else
    echo "Skipping Phase 3: Cognito Authentication"
fi

#-------------------------------------------------------------------------------
# Phase 6: DynamoDB Data Model
#-------------------------------------------------------------------------------
if should_run_phase 6; then
    print_header "PHASE 6: DynamoDB Data Model"

    if [ "$DRY_RUN" = true ]; then
        echo "Would run:"
        echo "  - phase6/01-setup-dynamodb.sh"
    else
        echo "Running Phase 6 scripts..."
        echo ""

        # Setup DynamoDB table
        bash "$SCRIPT_DIR/phase6/01-setup-dynamodb.sh"
    fi
else
    echo "Skipping Phase 6: DynamoDB Data Model"
fi

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "Infrastructure Setup Complete"

if [ "$DRY_RUN" = true ]; then
    echo "Dry run complete. No changes were made."
    echo ""
    echo "Run without --dry-run to execute the setup."
else
    echo "All selected phases completed successfully!"
    echo ""
    echo "Configuration files created in scripts/:"

    # List generated config files
    ls -la "$SCRIPT_DIR"/*.json 2>/dev/null | while read line; do
        echo "  $(basename $(echo $line | awk '{print $NF}'))"
    done

    echo ""
    echo "Next Steps:"
    echo "  1. Deploy frontend:    ./scripts/deploy.sh"
    echo "  2. Verify S3/CF:       ./scripts/verify-s3-cloudfront.sh"
    echo "  3. Setup API Gateway:  ./scripts/setup-api-gateway.sh"
    echo ""
    echo "Frontend URL: $CLOUDFRONT_URL"

    # Show Cognito config if Phase 3 was run
    if [ -f "$SCRIPT_DIR/cognito-config.json" ]; then
        COGNITO_HOSTED=$(jq -r '.hostedDomain // empty' "$SCRIPT_DIR/cognito-config.json" 2>/dev/null)
        if [ -n "$COGNITO_HOSTED" ]; then
            echo "Cognito Hosted UI: https://$COGNITO_HOSTED"
        fi
    fi
fi
