#!/bin/bash
#===============================================================================
# Phase 1: AWS Account & IAM Baseline
# Script 01: Verify Prerequisites
#
# Story 1.4: AWS CLI Configuration
# This script verifies that AWS CLI is properly configured and ready for use.
#
# Prerequisites:
#   - AWS CLI v2 installed
#   - AWS credentials configured (via aws configure or environment variables)
#   - Sufficient permissions to create resources
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 1: Verify Prerequisites"

#-------------------------------------------------------------------------------
# Check 1: AWS CLI Installation
#-------------------------------------------------------------------------------
print_step "Checking AWS CLI installation..."

if command_exists aws; then
    AWS_VERSION=$(aws --version 2>&1 | head -n1)
    print_success "AWS CLI installed: $AWS_VERSION"
else
    print_error "AWS CLI is not installed"
    echo ""
    echo "Install AWS CLI v2 from: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

#-------------------------------------------------------------------------------
# Check 2: AWS CLI Configuration
#-------------------------------------------------------------------------------
print_step "Checking AWS CLI configuration..."

if aws sts get-caller-identity >/dev/null 2>&1; then
    CALLER_IDENTITY=$(aws sts get-caller-identity --output json)
    CURRENT_ACCOUNT=$(echo "$CALLER_IDENTITY" | jq -r '.Account')
    CURRENT_USER=$(echo "$CALLER_IDENTITY" | jq -r '.Arn')

    print_success "AWS CLI configured successfully"
    echo "      Account ID: $CURRENT_ACCOUNT"
    echo "      User ARN:   $CURRENT_USER"

    # Verify account matches expected
    if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
        print_error "WARNING: Current account ($CURRENT_ACCOUNT) differs from expected ($AWS_ACCOUNT_ID)"
        echo "         Update AWS_ACCOUNT_ID in scripts/config.sh if using a different account"
    fi
else
    print_error "AWS CLI is not configured or credentials are invalid"
    echo ""
    echo "Configure AWS CLI with: aws configure"
    exit 1
fi

#-------------------------------------------------------------------------------
# Check 3: Required Tools
#-------------------------------------------------------------------------------
print_step "Checking required tools..."

MISSING_TOOLS=()

if command_exists jq; then
    JQ_VERSION=$(jq --version 2>&1)
    print_success "jq installed: $JQ_VERSION"
else
    print_error "jq is not installed"
    MISSING_TOOLS+=("jq")
fi

if command_exists curl; then
    CURL_VERSION=$(curl --version 2>&1 | head -n1)
    print_success "curl installed: $CURL_VERSION"
else
    print_error "curl is not installed"
    MISSING_TOOLS+=("curl")
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo ""
    echo "Missing required tools: ${MISSING_TOOLS[*]}"
    echo "Install them using your package manager (brew, apt, etc.)"
    exit 1
fi

#-------------------------------------------------------------------------------
# Check 4: Region Configuration
#-------------------------------------------------------------------------------
print_step "Checking AWS region configuration..."

CONFIGURED_REGION=$(aws configure get region 2>/dev/null || echo "not set")
if [ "$CONFIGURED_REGION" = "$AWS_REGION" ]; then
    print_success "Default region matches expected: $AWS_REGION"
elif [ "$CONFIGURED_REGION" = "not set" ]; then
    print_info "No default region set, scripts will use: $AWS_REGION"
else
    print_info "Default region ($CONFIGURED_REGION) differs from script region ($AWS_REGION)"
    echo "      Scripts will explicitly use: $AWS_REGION"
fi

#-------------------------------------------------------------------------------
# Check 5: Permissions Test
#-------------------------------------------------------------------------------
print_step "Testing basic AWS permissions..."

# Test S3 list (non-destructive)
if aws s3 ls --region "$AWS_REGION" >/dev/null 2>&1; then
    print_success "S3 list permission: OK"
else
    print_error "S3 list permission: FAILED"
fi

# Test IAM get-user (non-destructive)
if aws iam get-user >/dev/null 2>&1; then
    print_success "IAM read permission: OK"
else
    print_info "IAM read permission: Limited (may be using a role)"
fi

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "Prerequisites Check Complete"

echo "All prerequisites verified successfully!"
echo ""
echo "Current Configuration:"
echo "  AWS Account:  $CURRENT_ACCOUNT"
echo "  AWS Region:   $AWS_REGION"
echo "  Project Name: $PROJECT_NAME"
echo ""
echo "You can proceed with infrastructure setup."
