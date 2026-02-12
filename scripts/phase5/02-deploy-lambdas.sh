#!/bin/bash
#===============================================================================
# Phase 5: Lambda Service Layer
# Script 02: Deploy Lambda Functions
#
# Stories 5.2-5.8: Lambda Function Deployment
# Creates and configures Lambda functions for all API endpoints.
#
# Functions Created:
#   - debt-tracker-create-tracker
#   - debt-tracker-list-trackers
#   - debt-tracker-get-tracker
#   - debt-tracker-update-tracker
#   - debt-tracker-delete-tracker
#   - debt-tracker-create-entry
#   - debt-tracker-list-entries
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

LAMBDA_DIR="$SCRIPT_DIR/../../lambda"
DEPLOYMENT_PACKAGE="$LAMBDA_DIR/deployment.zip"

print_header "Phase 5: Deploy Lambda Functions"

#-------------------------------------------------------------------------------
# Verify Prerequisites
#-------------------------------------------------------------------------------
print_step "Verifying prerequisites..."

# Check for deployment package
if [ ! -f "$DEPLOYMENT_PACKAGE" ]; then
    print_error "Deployment package not found: $DEPLOYMENT_PACKAGE"
    print_info "Run 01-build-lambda.sh first"
    exit 1
fi

# Check for IAM role
if [ -z "$LAMBDA_EXECUTION_ROLE_ARN" ]; then
    print_error "Lambda execution role ARN not found"
    print_info "Run phase1/02-setup-iam-roles.sh first"
    exit 1
fi

print_success "Prerequisites verified"
echo "  Deployment package: $DEPLOYMENT_PACKAGE"
echo "  Execution role: $LAMBDA_EXECUTION_ROLE_ARN"

#-------------------------------------------------------------------------------
# Function to create or update a Lambda function
#-------------------------------------------------------------------------------
deploy_lambda() {
    local FUNCTION_NAME="$1"
    local HANDLER="$2"
    local DESCRIPTION="$3"

    local FULL_NAME="${PROJECT_NAME}-${FUNCTION_NAME}"

    print_step "Deploying Lambda: $FULL_NAME"

    # Check if function exists
    if aws lambda get-function \
        --function-name "$FULL_NAME" \
        --region "$AWS_REGION" >/dev/null 2>&1; then

        # Update existing function
        print_info "Function exists, updating code..."

        aws lambda update-function-code \
            --function-name "$FULL_NAME" \
            --zip-file "fileb://$DEPLOYMENT_PACKAGE" \
            --region "$AWS_REGION" \
            >/dev/null

        # Wait for update to complete
        aws lambda wait function-updated \
            --function-name "$FULL_NAME" \
            --region "$AWS_REGION"

        # Update configuration
        aws lambda update-function-configuration \
            --function-name "$FULL_NAME" \
            --handler "$HANDLER" \
            --environment "Variables={DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE_NAME}" \
            --timeout 30 \
            --memory-size 256 \
            --region "$AWS_REGION" \
            >/dev/null

        print_success "Updated: $FULL_NAME"
    else
        # Create new function
        print_info "Creating new function..."

        aws lambda create-function \
            --function-name "$FULL_NAME" \
            --runtime "nodejs18.x" \
            --role "$LAMBDA_EXECUTION_ROLE_ARN" \
            --handler "$HANDLER" \
            --zip-file "fileb://$DEPLOYMENT_PACKAGE" \
            --description "$DESCRIPTION" \
            --timeout 30 \
            --memory-size 256 \
            --environment "Variables={DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE_NAME}" \
            --tags "Project=$PROJECT_NAME,Phase=5" \
            --region "$AWS_REGION" \
            >/dev/null

        # Wait for function to be active
        aws lambda wait function-active \
            --function-name "$FULL_NAME" \
            --region "$AWS_REGION"

        print_success "Created: $FULL_NAME"
    fi

    # Get function ARN
    local FUNCTION_ARN=$(aws lambda get-function \
        --function-name "$FULL_NAME" \
        --region "$AWS_REGION" \
        --query 'Configuration.FunctionArn' \
        --output text)

    echo "      ARN: $FUNCTION_ARN"

    # Store ARN for API Gateway integration
    echo "$FULL_NAME:$FUNCTION_ARN" >> "$SCRIPT_DIR/../lambda-arns.txt"
}

#-------------------------------------------------------------------------------
# Deploy All Lambda Functions
#-------------------------------------------------------------------------------

# Clear previous ARN file
> "$SCRIPT_DIR/../lambda-arns.txt"

# Tracker functions
deploy_lambda "create-tracker" \
    "handlers/createTracker.handler" \
    "Create a new tracker"

deploy_lambda "list-trackers" \
    "handlers/listTrackers.handler" \
    "List all trackers for a user"

deploy_lambda "get-tracker" \
    "handlers/getTracker.handler" \
    "Get a specific tracker"

deploy_lambda "update-tracker" \
    "handlers/updateTracker.handler" \
    "Update a tracker"

deploy_lambda "delete-tracker" \
    "handlers/deleteTracker.handler" \
    "Delete a tracker and its entries"

# Entry functions
deploy_lambda "create-entry" \
    "handlers/createEntry.handler" \
    "Create a new entry for a tracker"

deploy_lambda "list-entries" \
    "handlers/listEntries.handler" \
    "List entries for a tracker"

#-------------------------------------------------------------------------------
# Create CloudWatch Log Groups with Retention
#-------------------------------------------------------------------------------
print_step "Configuring CloudWatch Log Groups..."

FUNCTIONS=(
    "create-tracker"
    "list-trackers"
    "get-tracker"
    "update-tracker"
    "delete-tracker"
    "create-entry"
    "list-entries"
)

for FUNC in "${FUNCTIONS[@]}"; do
    LOG_GROUP="/aws/lambda/${PROJECT_NAME}-${FUNC}"

    # Check if log group exists
    if ! aws logs describe-log-groups \
        --log-group-name-prefix "$LOG_GROUP" \
        --region "$AWS_REGION" \
        --query "logGroups[?logGroupName=='$LOG_GROUP'].logGroupName" \
        --output text | grep -q "$LOG_GROUP"; then

        aws logs create-log-group \
            --log-group-name "$LOG_GROUP" \
            --region "$AWS_REGION" \
            --tags "Project=$PROJECT_NAME" 2>/dev/null || true
    fi

    # Set retention policy
    aws logs put-retention-policy \
        --log-group-name "$LOG_GROUP" \
        --retention-in-days "$LOG_RETENTION_DAYS" \
        --region "$AWS_REGION" 2>/dev/null || true
done

print_success "Log groups configured with $LOG_RETENTION_DAYS day retention"

#-------------------------------------------------------------------------------
# Save Lambda Configuration
#-------------------------------------------------------------------------------
print_step "Saving Lambda configuration..."

LAMBDA_CONFIG_FILE="$SCRIPT_DIR/../generated/lambda-config.json"

# Build JSON with all function ARNs
LAMBDA_ARNS_JSON="{"
while IFS=: read -r name arn; do
    if [ -n "$name" ] && [ -n "$arn" ]; then
        LAMBDA_ARNS_JSON+="\"$name\": \"$arn\","
    fi
done < "$SCRIPT_DIR/../lambda-arns.txt"
LAMBDA_ARNS_JSON="${LAMBDA_ARNS_JSON%,}}"

cat > "$LAMBDA_CONFIG_FILE" << EOF
{
    "region": "$AWS_REGION",
    "executionRoleArn": "$LAMBDA_EXECUTION_ROLE_ARN",
    "tableName": "$DYNAMODB_TABLE_NAME",
    "runtime": "nodejs18.x",
    "timeout": 30,
    "memorySize": 256,
    "functions": $LAMBDA_ARNS_JSON
}
EOF

print_success "Configuration saved to: $LAMBDA_CONFIG_FILE"

# Clean up temp file
rm -f "$SCRIPT_DIR/../lambda-arns.txt"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "Lambda Deployment Complete"

echo "Deployed Functions:"
echo "  ${PROJECT_NAME}-create-tracker   - POST /trackers"
echo "  ${PROJECT_NAME}-list-trackers    - GET /trackers"
echo "  ${PROJECT_NAME}-get-tracker      - GET /trackers/{id}"
echo "  ${PROJECT_NAME}-update-tracker   - PUT /trackers/{id}"
echo "  ${PROJECT_NAME}-delete-tracker   - DELETE /trackers/{id}"
echo "  ${PROJECT_NAME}-create-entry     - POST /trackers/{id}/entries"
echo "  ${PROJECT_NAME}-list-entries     - GET /trackers/{id}/entries"
echo ""
echo "Configuration:"
echo "  Runtime:    nodejs18.x"
echo "  Timeout:    30 seconds"
echo "  Memory:     256 MB"
echo "  Log Retention: $LOG_RETENTION_DAYS days"
echo ""
echo "Next: Run 03-integrate-api-gateway.sh to connect to API Gateway"
