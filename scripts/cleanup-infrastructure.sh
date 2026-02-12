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
CLEANUP_PHASES="6,5,4,3,2,1"  # Reverse order for dependencies
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
            echo "  6: DynamoDB Data Model"
            echo "  5: Lambda Functions"
            echo "  4: API Gateway"
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
# Phase 6 Cleanup: DynamoDB
#-------------------------------------------------------------------------------
if should_cleanup_phase 6; then
    print_header "Cleaning up Phase 6: DynamoDB"

    if [ "$DRY_RUN" = true ]; then
        echo "Would delete:"
        echo "  - DynamoDB table: $DYNAMODB_TABLE_NAME"
    else
        if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
            print_step "Deleting DynamoDB table: $DYNAMODB_TABLE_NAME"
            aws dynamodb delete-table \
                --table-name "$DYNAMODB_TABLE_NAME" \
                --region "$AWS_REGION" >/dev/null

            print_info "Waiting for table deletion..."
            aws dynamodb wait table-not-exists \
                --table-name "$DYNAMODB_TABLE_NAME" \
                --region "$AWS_REGION" 2>/dev/null || true
            print_success "DynamoDB table deleted"
        else
            print_info "No DynamoDB table found to delete"
        fi
    fi
fi

#-------------------------------------------------------------------------------
# Phase 5 Cleanup: Lambda Functions
#-------------------------------------------------------------------------------
if should_cleanup_phase 5; then
    print_header "Cleaning up Phase 5: Lambda Functions"

    # List of Lambda functions to delete
    LAMBDA_FUNCTIONS=(
        "${PROJECT_NAME}-create-tracker"
        "${PROJECT_NAME}-list-trackers"
        "${PROJECT_NAME}-get-tracker"
        "${PROJECT_NAME}-update-tracker"
        "${PROJECT_NAME}-delete-tracker"
        "${PROJECT_NAME}-create-entry"
        "${PROJECT_NAME}-list-entries"
    )

    if [ "$DRY_RUN" = true ]; then
        echo "Would delete:"
        for func in "${LAMBDA_FUNCTIONS[@]}"; do
            echo "  - Lambda function: $func"
        done
        echo "  - CloudWatch log groups for Lambda functions"
    else
        for func in "${LAMBDA_FUNCTIONS[@]}"; do
            if aws lambda get-function --function-name "$func" --region "$AWS_REGION" >/dev/null 2>&1; then
                print_step "Deleting Lambda function: $func"
                aws lambda delete-function \
                    --function-name "$func" \
                    --region "$AWS_REGION"
                print_success "Deleted: $func"

                # Delete associated log group
                LOG_GROUP="/aws/lambda/$func"
                if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --region "$AWS_REGION" --query "logGroups[?logGroupName=='$LOG_GROUP']" --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
                    aws logs delete-log-group --log-group-name "$LOG_GROUP" --region "$AWS_REGION" 2>/dev/null || true
                    print_info "Deleted log group: $LOG_GROUP"
                fi
            else
                print_info "Lambda not found: $func"
            fi
        done

        # Remove lambda config file
        rm -f "$SCRIPT_DIR/generated/lambda-config.json" 2>/dev/null || true
    fi
fi

#-------------------------------------------------------------------------------
# Phase 4 Cleanup: API Gateway
#-------------------------------------------------------------------------------
if should_cleanup_phase 4; then
    print_header "Cleaning up Phase 4: API Gateway"

    if [ "$DRY_RUN" = true ]; then
        echo "Would delete:"
        echo "  - API Gateway: $API_GATEWAY_NAME"
        echo "  - CloudWatch log group: /aws/apigateway/$API_GATEWAY_NAME"
    else
        # Find API Gateway by name
        API_ID=$(aws apigatewayv2 get-apis \
            --region "$AWS_REGION" \
            --query "Items[?Name=='$API_GATEWAY_NAME'].ApiId" \
            --output text 2>/dev/null || echo "")

        if [ -n "$API_ID" ] && [ "$API_ID" != "None" ]; then
            print_step "Deleting API Gateway: $API_GATEWAY_NAME (ID: $API_ID)"
            aws apigatewayv2 delete-api \
                --api-id "$API_ID" \
                --region "$AWS_REGION"
            print_success "API Gateway deleted"

            # Delete associated log group
            LOG_GROUP="/aws/apigateway/$API_GATEWAY_NAME"
            if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --region "$AWS_REGION" --query "logGroups[?logGroupName=='$LOG_GROUP']" --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
                aws logs delete-log-group --log-group-name "$LOG_GROUP" --region "$AWS_REGION" 2>/dev/null || true
                print_info "Deleted log group: $LOG_GROUP"
            fi
        else
            print_info "No API Gateway found to delete"
        fi

        # Remove api gateway config file
        rm -f "$SCRIPT_DIR/generated/api-gateway-config.json" 2>/dev/null || true
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

        # Remove cognito config file
        rm -f "$SCRIPT_DIR/generated/cognito-config.json" 2>/dev/null || true
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
            # Check if distribution has a pricing plan (WAF WebACL indicates Security Bundle)
            WEBACL_ID=$(aws cloudfront get-distribution \
                --id "$DIST_ID" \
                --query "Distribution.DistributionConfig.WebACLId" \
                --output text 2>/dev/null || echo "")

            # Check if distribution is already disabled
            IS_ENABLED=$(aws cloudfront get-distribution \
                --id "$DIST_ID" \
                --query "Distribution.DistributionConfig.Enabled" \
                --output text 2>/dev/null || echo "true")

            if [ "$IS_ENABLED" = "true" ]; then
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
                print_success "Distribution disabled"
            else
                print_info "Distribution already disabled"
            fi

            # Attempt to delete distribution
            print_step "Attempting to delete CloudFront distribution: $DIST_ID"
            NEW_ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --query 'ETag' --output text)

            DELETE_OUTPUT=$(aws cloudfront delete-distribution --id "$DIST_ID" --if-match "$NEW_ETAG" 2>&1) && {
                print_success "CloudFront distribution deleted"
            } || {
                if echo "$DELETE_OUTPUT" | grep -q "pricing plan"; then
                    print_info "Distribution is subscribed to a pricing plan (CloudFront Security Bundle)"
                    print_info "The distribution has been disabled but cannot be deleted until:"
                    print_info "  1. Cancel the pricing plan in AWS Console"
                    print_info "  2. Wait until end of billing cycle"
                    print_info ""
                    print_info "CloudFront Console: https://console.aws.amazon.com/cloudfront/v4/home#/savings-bundle"
                    print_info ""
                    print_info "Distribution ID: $DIST_ID"
                    if [ -n "$WEBACL_ID" ] && [ "$WEBACL_ID" != "None" ] && [ "$WEBACL_ID" != "" ]; then
                        print_info "WAF WebACL attached (may incur charges): $WEBACL_ID"
                    fi
                    print_info ""
                    print_info "Continuing with remaining cleanup..."
                else
                    print_error "Failed to delete distribution: $DELETE_OUTPUT"
                fi
            }
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
        if aws s3api head-bucket --bucket "$S3_BUCKET_NAME" >/dev/null 2>&1; then
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

        # Remove cloudfront config files
        rm -f "$SCRIPT_DIR/generated/cloudfront-config.json" 2>/dev/null || true
        rm -f "$SCRIPT_DIR/generated/cloudfront-bucket-policy.json" 2>/dev/null || true
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

        # Remove iam config file
        rm -f "$SCRIPT_DIR/generated/iam-config.json" 2>/dev/null || true
    fi
fi

#-------------------------------------------------------------------------------
# Cleanup Config Files
#-------------------------------------------------------------------------------
if [ "$DRY_RUN" != true ]; then
    print_step "Removing remaining configuration files..."
    rm -f "$SCRIPT_DIR/generated/dynamodb-config.json" 2>/dev/null || true
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
