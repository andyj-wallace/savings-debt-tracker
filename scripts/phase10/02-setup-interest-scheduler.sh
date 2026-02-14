#!/bin/bash
#===============================================================================
# Phase 10: Logging, Monitoring, Cleanup
# Script 02: Setup Interest Calculation Scheduler
#
# Story 10.6: Interest Calculation Scheduler
# Deploys the interest calculation Lambda and creates an EventBridge
# rule to trigger it daily.
#
# Prerequisites:
#   - Lambda deployment package built (scripts/phase5/01-build-lambda.sh)
#   - IAM role exists (scripts/phase1/02-setup-iam-roles.sh)
#   - DynamoDB table exists (scripts/phase6/01-setup-dynamodb.sh)
#   - Monitoring setup complete (scripts/phase10/01-setup-monitoring.sh)
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

LAMBDA_DIR="$SCRIPT_DIR/../../lambda"
DEPLOYMENT_PACKAGE="$LAMBDA_DIR/deployment.zip"

FUNCTION_NAME="${PROJECT_NAME}-calculate-interest"
RULE_NAME="${PROJECT_NAME}-daily-interest"
LOG_GROUP="/aws/lambda/${FUNCTION_NAME}"

print_header "Story 10.6: Setup Interest Calculation Scheduler"

#-------------------------------------------------------------------------------
# Verify Prerequisites
#-------------------------------------------------------------------------------
print_step "Verifying prerequisites..."

if [ ! -f "$DEPLOYMENT_PACKAGE" ]; then
    print_error "Deployment package not found: $DEPLOYMENT_PACKAGE"
    print_info "Run phase5/01-build-lambda.sh first"
    exit 1
fi

if [ -z "$LAMBDA_EXECUTION_ROLE_ARN" ]; then
    print_error "Lambda execution role ARN not found"
    exit 1
fi

print_success "Prerequisites verified"

#-------------------------------------------------------------------------------
# Load DLQ ARN from monitoring config (optional)
#-------------------------------------------------------------------------------
DLQ_ARN=""
MONITORING_CONFIG_FILE="$SCRIPT_DIR/../generated/monitoring-config.json"
if [ -f "$MONITORING_CONFIG_FILE" ]; then
    DLQ_ARN=$(jq -r '.dlqArn // empty' "$MONITORING_CONFIG_FILE" 2>/dev/null)
fi

#-------------------------------------------------------------------------------
# Deploy Lambda Function
#-------------------------------------------------------------------------------
print_step "Deploying Lambda: $FUNCTION_NAME"

DLQ_CONFIG=""
if [ -n "$DLQ_ARN" ]; then
    DLQ_CONFIG="--dead-letter-config TargetArn=${DLQ_ARN}"
fi

if aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" >/dev/null 2>&1; then

    # Update existing function
    print_info "Function exists, updating code..."

    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file "fileb://$DEPLOYMENT_PACKAGE" \
        --region "$AWS_REGION" \
        >/dev/null

    aws lambda wait function-updated \
        --function-name "$FUNCTION_NAME" \
        --region "$AWS_REGION"

    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --handler "handlers/calculateInterest.handler" \
        --environment "Variables={DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE_NAME}" \
        --timeout 300 \
        --memory-size 256 \
        ${DLQ_CONFIG} \
        --region "$AWS_REGION" \
        >/dev/null

    print_success "Updated: $FUNCTION_NAME"
else
    # Create new function
    print_info "Creating new function..."

    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime "nodejs18.x" \
        --role "$LAMBDA_EXECUTION_ROLE_ARN" \
        --handler "handlers/calculateInterest.handler" \
        --zip-file "fileb://$DEPLOYMENT_PACKAGE" \
        --description "Daily interest calculation for debt trackers" \
        --timeout 300 \
        --memory-size 256 \
        --environment "Variables={DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE_NAME}" \
        ${DLQ_CONFIG} \
        --tags "Project=$PROJECT_NAME,Phase=10" \
        --region "$AWS_REGION" \
        >/dev/null

    aws lambda wait function-active \
        --function-name "$FUNCTION_NAME" \
        --region "$AWS_REGION"

    print_success "Created: $FUNCTION_NAME"
fi

FUNCTION_ARN=$(aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query 'Configuration.FunctionArn' \
    --output text)

echo "  ARN: $FUNCTION_ARN"

#-------------------------------------------------------------------------------
# Setup CloudWatch Log Group
#-------------------------------------------------------------------------------
print_step "Configuring log group..."

if ! aws logs describe-log-groups \
    --log-group-name-prefix "$LOG_GROUP" \
    --region "$AWS_REGION" \
    --query "logGroups[?logGroupName=='$LOG_GROUP'].logGroupName" \
    --output text 2>/dev/null | grep -q "$LOG_GROUP"; then

    aws logs create-log-group \
        --log-group-name "$LOG_GROUP" \
        --region "$AWS_REGION" 2>/dev/null || true
fi

aws logs put-retention-policy \
    --log-group-name "$LOG_GROUP" \
    --retention-in-days "$LOG_RETENTION_DAYS" \
    --region "$AWS_REGION" 2>/dev/null || true

print_success "Log group configured: $LOG_GROUP"

#-------------------------------------------------------------------------------
# Create EventBridge Rule (Daily at 2 AM UTC)
#-------------------------------------------------------------------------------
print_step "Creating EventBridge daily schedule..."

RULE_ARN=$(aws events put-rule \
    --name "$RULE_NAME" \
    --schedule-expression "cron(0 2 * * ? *)" \
    --state ENABLED \
    --description "Trigger daily interest calculation at 2 AM UTC" \
    --tags "Key=Project,Value=${PROJECT_NAME}" \
    --region "$AWS_REGION" \
    --query 'RuleArn' \
    --output text)

print_success "EventBridge rule created: $RULE_NAME"
echo "  Schedule: Daily at 2:00 AM UTC"
echo "  ARN: $RULE_ARN"

#-------------------------------------------------------------------------------
# Add Lambda Permission for EventBridge
#-------------------------------------------------------------------------------
print_step "Adding EventBridge invoke permission..."

# Remove existing permission if it exists (idempotent)
aws lambda remove-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "eventbridge-daily-interest" \
    --region "$AWS_REGION" 2>/dev/null || true

aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "eventbridge-daily-interest" \
    --action "lambda:InvokeFunction" \
    --principal "events.amazonaws.com" \
    --source-arn "$RULE_ARN" \
    --region "$AWS_REGION" \
    >/dev/null

print_success "Lambda permission added for EventBridge"

#-------------------------------------------------------------------------------
# Add Lambda as Target for EventBridge Rule
#-------------------------------------------------------------------------------
print_step "Adding Lambda as EventBridge target..."

aws events put-targets \
    --rule "$RULE_NAME" \
    --targets "Id=interest-calculator,Arn=${FUNCTION_ARN}" \
    --region "$AWS_REGION" \
    >/dev/null

print_success "Lambda target configured"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "Interest Scheduler Setup Complete"

echo "Lambda Function:"
echo "  Name:     $FUNCTION_NAME"
echo "  Handler:  handlers/calculateInterest.handler"
echo "  Timeout:  300 seconds (5 minutes)"
echo "  Memory:   256 MB"
if [ -n "$DLQ_ARN" ]; then
echo "  DLQ:      $DLQ_ARN"
fi
echo ""
echo "EventBridge Rule:"
echo "  Name:     $RULE_NAME"
echo "  Schedule: Daily at 2:00 AM UTC"
echo "  State:    ENABLED"
echo ""
echo "The interest calculator will:"
echo "  1. Scan all trackers with an interestRate > 0"
echo "  2. Calculate daily interest since lastInterestDate"
echo "  3. Create interest entries and update tracker balances"
echo "  4. Log results to CloudWatch"
