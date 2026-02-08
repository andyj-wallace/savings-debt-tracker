#!/bin/bash
#===============================================================================
# Debt Tracker - Infrastructure Cleanup Orchestrator
#
# This script removes all AWS infrastructure created by setup-infrastructure.sh.
# USE WITH CAUTION - this will delete resources and data!
#
# Usage:
#   ./cleanup-infrastructure.sh              # Interactive cleanup (with confirmations)
#   ./cleanup-infrastructure.sh --phase 2    # Cleanup specific phase
#   ./cleanup-infrastructure.sh --force      # Skip confirmations (dangerous!)
#   ./cleanup-infrastructure.sh --dry-run    # Show what would be deleted
#
# Note: Some resources have dependencies (e.g., CloudFront must be disabled
# before deletion, S3 must be empty before deletion).
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

#-------------------------------------------------------------------------------
# Parse Arguments
#-------------------------------------------------------------------------------
CLEANUP_PHASES="3,2,1"  # Reverse order for dependencies
FORCE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --phase)
            CLEANUP_PHASES="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --phase PHASES   Cleanup specific phases (comma-separated)"
            echo "  --force          Skip confirmation prompts (DANGEROUS!)"
            echo "  --dry-run        Show what would be deleted without executing"
            echo "  --help           Show this help message"
            echo ""
            echo "Phases (cleaned in reverse order):"
            echo "  3: Cognito Authentication"
            echo "  2: Frontend Hosting (S3 + CloudFront)"
            echo "  1: IAM Roles"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

#-------------------------------------------------------------------------------
# Confirmation Function
#-------------------------------------------------------------------------------
confirm() {
    local message=$1
    if [ "$FORCE" = true ]; then
        return 0
    fi

    echo ""
    read -p "$message (y/N): " response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

should_cleanup_phase() {
    local phase=$1
    [[ ",$CLEANUP_PHASES," =~ ",$phase," ]]
}

#-------------------------------------------------------------------------------
# Header
#-------------------------------------------------------------------------------
print_header "Debt Tracker Infrastructure Cleanup"

echo "WARNING: This will DELETE AWS resources!"
echo ""
echo "Project:     $PROJECT_NAME"
echo "AWS Region:  $AWS_REGION"
echo "Account ID:  $AWS_ACCOUNT_ID"
echo ""
echo "Phases to cleanup: $CLEANUP_PHASES"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "=== DRY RUN MODE - No changes will be made ==="
    echo ""
fi

if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
    if ! confirm "Are you sure you want to continue?"; then
        echo "Cleanup cancelled."
        exit 0
    fi
fi

#-------------------------------------------------------------------------------
# Phase 3 Cleanup: Cognito
#-------------------------------------------------------------------------------
if should_cleanup_phase 3; then
    print_header "Cleaning up Phase 3: Cognito"

    if [ "$DRY_RUN" = true ]; then
        echo "Would delete:"
        echo "  - Cognito domain: $COGNITO_DOMAIN_PREFIX"
        echo "  - App Client: $COGNITO_CLIENT_NAME"
        echo "  - User Pool: $COGNITO_USER_POOL_NAME"
    else
        # Get User Pool ID
        USER_POOL_ID=$(aws cognito-idp list-user-pools \
            --max-results 60 \
            --region "$AWS_REGION" \
            --query "UserPools[?Name=='$COGNITO_USER_POOL_NAME'].Id" \
            --output text 2>/dev/null || echo "")

        if [ -n "$USER_POOL_ID" ] && [ "$USER_POOL_ID" != "None" ]; then
            # Delete domain first
            DOMAIN=$(aws cognito-idp describe-user-pool \
                --user-pool-id "$USER_POOL_ID" \
                --region "$AWS_REGION" \
                --query 'UserPool.Domain' \
                --output text 2>/dev/null || echo "")

            if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "None" ]; then
                print_step "Deleting Cognito domain: $DOMAIN"
                aws cognito-idp delete-user-pool-domain \
                    --domain "$DOMAIN" \
                    --user-pool-id "$USER_POOL_ID" \
                    --region "$AWS_REGION" 2>/dev/null || true
                print_success "Domain deleted"
            fi

            # Delete User Pool (this also deletes app clients)
            print_step "Deleting User Pool: $USER_POOL_ID"
            aws cognito-idp delete-user-pool \
                --user-pool-id "$USER_POOL_ID" \
                --region "$AWS_REGION"
            print_success "User Pool deleted"
        else
            print_info "No User Pool found to delete"
        fi
    fi
fi

#-------------------------------------------------------------------------------
# Phase 2 Cleanup: CloudFront + S3
#-------------------------------------------------------------------------------
if should_cleanup_phase 2; then
    print_header "Cleaning up Phase 2: CloudFront + S3"

    if [ "$DRY_RUN" = true ]; then
        echo "Would delete:"
        echo "  - CloudFront distribution for: $S3_BUCKET_NAME"
        echo "  - S3 bucket: $S3_BUCKET_NAME"
        echo "  - Origin Access Control: ${PROJECT_NAME}-s3-oac"
    else
        # Find CloudFront distribution
        S3_ORIGIN_DOMAIN="${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com"
        DIST_ID=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?Origins.Items[?DomainName=='$S3_ORIGIN_DOMAIN']].Id" \
            --output text 2>/dev/null || echo "")

        if [ -n "$DIST_ID" ] && [ "$DIST_ID" != "None" ]; then
            print_step "Disabling CloudFront distribution: $DIST_ID"

            # Get current config
            ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --query 'ETag' --output text)
            CONFIG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --query 'DistributionConfig' --output json)

            # Disable distribution
            DISABLED_CONFIG=$(echo "$CONFIG" | jq '.Enabled = false')
            aws cloudfront update-distribution \
                --id "$DIST_ID" \
                --if-match "$ETAG" \
                --distribution-config "$DISABLED_CONFIG" >/dev/null

            print_info "Waiting for distribution to disable (this takes several minutes)..."
            aws cloudfront wait distribution-deployed --id "$DIST_ID"

            # Delete distribution
            NEW_ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --query 'ETag' --output text)
            aws cloudfront delete-distribution --id "$DIST_ID" --if-match "$NEW_ETAG"
            print_success "CloudFront distribution deleted"
        else
            print_info "No CloudFront distribution found to delete"
        fi

        # Delete OAC
        OAC_ID=$(aws cloudfront list-origin-access-controls \
            --query "OriginAccessControlList.Items[?Name=='${PROJECT_NAME}-s3-oac'].Id" \
            --output text 2>/dev/null || echo "")

        if [ -n "$OAC_ID" ] && [ "$OAC_ID" != "None" ]; then
            print_step "Deleting Origin Access Control: $OAC_ID"
            aws cloudfront delete-origin-access-control --id "$OAC_ID" 2>/dev/null || true
            print_success "OAC deleted"
        fi

        # Empty and delete S3 bucket
        if aws s3api head-bucket --bucket "$S3_BUCKET_NAME" 2>/dev/null; then
            print_step "Emptying S3 bucket: $S3_BUCKET_NAME"
            aws s3 rm "s3://$S3_BUCKET_NAME" --recursive 2>/dev/null || true

            # Also delete versions if versioning was enabled
            aws s3api list-object-versions --bucket "$S3_BUCKET_NAME" --output json 2>/dev/null | \
                jq -r '.Versions[]? | "--key \"\(.Key)\" --version-id \(.VersionId)"' | \
                while read args; do
                    if [ -n "$args" ]; then
                        eval "aws s3api delete-object --bucket $S3_BUCKET_NAME $args" 2>/dev/null || true
                    fi
                done

            # Delete delete markers too
            aws s3api list-object-versions --bucket "$S3_BUCKET_NAME" --output json 2>/dev/null | \
                jq -r '.DeleteMarkers[]? | "--key \"\(.Key)\" --version-id \(.VersionId)"' | \
                while read args; do
                    if [ -n "$args" ]; then
                        eval "aws s3api delete-object --bucket $S3_BUCKET_NAME $args" 2>/dev/null || true
                    fi
                done

            print_step "Deleting S3 bucket: $S3_BUCKET_NAME"
            aws s3api delete-bucket --bucket "$S3_BUCKET_NAME" --region "$AWS_REGION"
            print_success "S3 bucket deleted"
        else
            print_info "No S3 bucket found to delete"
        fi
    fi
fi

#-------------------------------------------------------------------------------
# Phase 1 Cleanup: IAM Roles
#-------------------------------------------------------------------------------
if should_cleanup_phase 1; then
    print_header "Cleaning up Phase 1: IAM Roles"

    EXECUTION_ROLE_NAME="${LAMBDA_ROLE_PREFIX}-execution-role"
    LOGS_POLICY_NAME="${LAMBDA_ROLE_PREFIX}-logs-policy"
    DYNAMODB_POLICY_NAME="${LAMBDA_ROLE_PREFIX}-dynamodb-policy"

    if [ "$DRY_RUN" = true ]; then
        echo "Would delete:"
        echo "  - IAM Role: $EXECUTION_ROLE_NAME"
        echo "  - IAM Policy: $LOGS_POLICY_NAME"
        echo "  - IAM Policy: $DYNAMODB_POLICY_NAME"
    else
        # Detach and delete policies from role
        if aws iam get-role --role-name "$EXECUTION_ROLE_NAME" >/dev/null 2>&1; then
            print_step "Detaching policies from role..."

            # Detach all policies
            ATTACHED_POLICIES=$(aws iam list-attached-role-policies \
                --role-name "$EXECUTION_ROLE_NAME" \
                --query 'AttachedPolicies[].PolicyArn' \
                --output text 2>/dev/null || echo "")

            for policy_arn in $ATTACHED_POLICIES; do
                aws iam detach-role-policy \
                    --role-name "$EXECUTION_ROLE_NAME" \
                    --policy-arn "$policy_arn" 2>/dev/null || true
            done

            # Delete role
            print_step "Deleting IAM role: $EXECUTION_ROLE_NAME"
            aws iam delete-role --role-name "$EXECUTION_ROLE_NAME"
            print_success "Role deleted"
        else
            print_info "No IAM role found to delete"
        fi

        # Delete policies
        for policy_name in "$LOGS_POLICY_NAME" "$DYNAMODB_POLICY_NAME"; do
            POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${policy_name}"
            if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
                print_step "Deleting IAM policy: $policy_name"
                aws iam delete-policy --policy-arn "$POLICY_ARN"
                print_success "Policy deleted"
            fi
        done
    fi
fi

#-------------------------------------------------------------------------------
# Cleanup Config Files
#-------------------------------------------------------------------------------
if [ "$DRY_RUN" != true ]; then
    print_step "Removing configuration files..."
    rm -f "$SCRIPT_DIR"/*.json "$SCRIPT_DIR"/cloudfront-bucket-policy.json 2>/dev/null || true
    print_success "Configuration files removed"
fi

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "Cleanup Complete"

if [ "$DRY_RUN" = true ]; then
    echo "Dry run complete. No changes were made."
else
    echo "All selected resources have been deleted."
    echo ""
    echo "Note: Some resources (like CloudFront) may take a few minutes"
    echo "to fully propagate the deletion across AWS."
fi
