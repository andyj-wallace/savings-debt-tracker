#!/bin/bash
#===============================================================================
# Debt Tracker - Shared Configuration
#
# This file contains all shared configuration values used across IaC scripts.
# Source this file in other scripts: source "$(dirname "$0")/config.sh"
#
# CONFIGURATION TYPES:
#   - INPUT CONFIG: Values you specify (project name, region, etc.)
#   - GENERATED CONFIG: Values AWS creates (IDs, domains) - loaded from JSON files
#
# IMPORTANT: Only modify INPUT CONFIG values. Generated values are automatically
# loaded from JSON config files created by the setup scripts.
#===============================================================================

# Get the scripts directory (where config files are stored)
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

#===============================================================================
# INPUT CONFIGURATION - Modify these for your environment
#===============================================================================

#-------------------------------------------------------------------------------
# AWS Account Configuration
#-------------------------------------------------------------------------------
export AWS_REGION="us-east-2"
export AWS_ACCOUNT_ID="345482189946"

#-------------------------------------------------------------------------------
# Project Naming Convention
#-------------------------------------------------------------------------------
export PROJECT_NAME="debt-tracker"

#-------------------------------------------------------------------------------
# Phase 2: S3 Configuration (Input)
#-------------------------------------------------------------------------------
export S3_BUCKET_NAME="${PROJECT_NAME}-frontend-${AWS_ACCOUNT_ID}"

#-------------------------------------------------------------------------------
# Phase 3: Cognito Configuration (Input)
#-------------------------------------------------------------------------------
export COGNITO_USER_POOL_NAME="${PROJECT_NAME}-user-pool"
export COGNITO_CLIENT_NAME="${PROJECT_NAME}-web-client"
# Preferred domain prefix (will use this or generate unique if taken)
export COGNITO_DOMAIN_PREFIX_PREFERRED="${PROJECT_NAME}-auth"

#-------------------------------------------------------------------------------
# Phase 4: API Gateway Configuration (Input)
#-------------------------------------------------------------------------------
export API_GATEWAY_NAME="${PROJECT_NAME}-api"
export API_GATEWAY_STAGE="prod"

#-------------------------------------------------------------------------------
# Phase 5/6: Lambda & DynamoDB Configuration (Input)
#-------------------------------------------------------------------------------
export LAMBDA_ROLE_PREFIX="${PROJECT_NAME}-lambda"
export DYNAMODB_TABLE_NAME="${PROJECT_NAME}-data"

#-------------------------------------------------------------------------------
# CloudWatch Configuration
#-------------------------------------------------------------------------------
export LOG_RETENTION_DAYS=30

#===============================================================================
# GENERATED CONFIGURATION - Loaded from JSON config files
# These are populated by running the setup scripts
#===============================================================================

#-------------------------------------------------------------------------------
# Load CloudFront config (created by phase2/02-setup-cloudfront.sh)
#-------------------------------------------------------------------------------
CLOUDFRONT_CONFIG_FILE="$SCRIPTS_DIR/generated/cloudfront-config.json"
if [ -f "$CLOUDFRONT_CONFIG_FILE" ]; then
    export CLOUDFRONT_DISTRIBUTION_ID=$(jq -r '.distributionId // empty' "$CLOUDFRONT_CONFIG_FILE" 2>/dev/null)
    export CLOUDFRONT_DOMAIN=$(jq -r '.distributionDomain // empty' "$CLOUDFRONT_CONFIG_FILE" 2>/dev/null)
    export CLOUDFRONT_URL=$(jq -r '.cloudFrontUrl // empty' "$CLOUDFRONT_CONFIG_FILE" 2>/dev/null)
fi

# Fallback for CloudFront URL if not yet created (used in Cognito callback URLs)
if [ -z "$CLOUDFRONT_URL" ]; then
    export CLOUDFRONT_URL="https://YOUR_CLOUDFRONT_DOMAIN"
fi

#-------------------------------------------------------------------------------
# Load Cognito config (created by phase3 scripts)
#-------------------------------------------------------------------------------
COGNITO_CONFIG_FILE="$SCRIPTS_DIR/generated/cognito-config.json"
if [ -f "$COGNITO_CONFIG_FILE" ]; then
    export COGNITO_USER_POOL_ID=$(jq -r '.userPoolId // empty' "$COGNITO_CONFIG_FILE" 2>/dev/null)
    export COGNITO_CLIENT_ID=$(jq -r '.clientId // empty' "$COGNITO_CONFIG_FILE" 2>/dev/null)
    export COGNITO_DOMAIN_PREFIX=$(jq -r '.domainPrefix // empty' "$COGNITO_CONFIG_FILE" 2>/dev/null)
    export COGNITO_DOMAIN=$(jq -r '.hostedDomain // empty' "$COGNITO_CONFIG_FILE" 2>/dev/null)
fi

#-------------------------------------------------------------------------------
# Load API Gateway config (created by setup-api-gateway.sh)
#-------------------------------------------------------------------------------
API_GATEWAY_CONFIG_FILE="$SCRIPTS_DIR/generated/api-gateway-config.json"
if [ -f "$API_GATEWAY_CONFIG_FILE" ]; then
    export API_GATEWAY_ID=$(jq -r '.apiId // empty' "$API_GATEWAY_CONFIG_FILE" 2>/dev/null)
    export API_GATEWAY_ENDPOINT=$(jq -r '.apiEndpoint // empty' "$API_GATEWAY_CONFIG_FILE" 2>/dev/null)
fi

#-------------------------------------------------------------------------------
# Load IAM config (created by phase1/02-setup-iam-roles.sh)
#-------------------------------------------------------------------------------
IAM_CONFIG_FILE="$SCRIPTS_DIR/generated/iam-config.json"
if [ -f "$IAM_CONFIG_FILE" ]; then
    export LAMBDA_EXECUTION_ROLE_ARN=$(jq -r '.executionRoleArn // empty' "$IAM_CONFIG_FILE" 2>/dev/null)
fi

#-------------------------------------------------------------------------------
# Load DynamoDB config (created by phase6/01-setup-dynamodb.sh)
#-------------------------------------------------------------------------------
DYNAMODB_CONFIG_FILE="$SCRIPTS_DIR/generated/dynamodb-config.json"
if [ -f "$DYNAMODB_CONFIG_FILE" ]; then
    export DYNAMODB_TABLE_ARN=$(jq -r '.tableArn // empty' "$DYNAMODB_CONFIG_FILE" 2>/dev/null)
fi

#-------------------------------------------------------------------------------
# Cognito Callback URLs (depend on CloudFront URL)
#-------------------------------------------------------------------------------
export COGNITO_CALLBACK_URLS="http://localhost:3000/callback,${CLOUDFRONT_URL}/"
export COGNITO_LOGOUT_URLS="http://localhost:3000/logout,${CLOUDFRONT_URL}/logout"

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

# Print a section header
print_header() {
    echo ""
    echo "=============================================="
    echo "$1"
    echo "=============================================="
    echo ""
}

# Print a step description
print_step() {
    echo ">>> $1"
}

# Print success message
print_success() {
    echo "  ✓ $1"
}

# Print error message
print_error() {
    echo "  ✗ $1"
}

# Print info message
print_info() {
    echo "  ℹ $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify AWS CLI is configured
verify_aws_cli() {
    if ! command_exists aws; then
        print_error "AWS CLI is not installed"
        return 1
    fi

    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS CLI is not configured or credentials are invalid"
        return 1
    fi

    return 0
}

# Get current AWS account ID
get_aws_account_id() {
    aws sts get-caller-identity --query 'Account' --output text
}

# Wait for CloudFront distribution to deploy
wait_for_cloudfront() {
    local distribution_id=$1
    print_info "Waiting for CloudFront distribution to deploy (this may take 5-15 minutes)..."
    aws cloudfront wait distribution-deployed --id "$distribution_id" --region "$AWS_REGION"
}
