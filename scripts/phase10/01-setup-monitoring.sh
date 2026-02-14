#!/bin/bash
#===============================================================================
# Phase 10: Logging, Monitoring, Cleanup
# Script 01: Setup Monitoring Infrastructure
#
# Stories 10.1-10.5, 10.7:
#   - 10.1: CloudWatch Log Groups Organization
#   - 10.2: Lambda Error Alerting (SNS + CloudWatch Alarms)
#   - 10.3: API Gateway Latency Monitoring (Dashboard)
#   - 10.4: DynamoDB Capacity Monitoring (Dashboard)
#   - 10.5: Dead Letter Queue Setup (SQS DLQ)
#   - 10.7: Cost Budget Alert
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 10: Setup Monitoring Infrastructure"

# Prompt for alert email
ALERT_EMAIL="${ALERT_EMAIL:-}"
if [ -z "$ALERT_EMAIL" ]; then
    read -p "Enter email for alerts: " ALERT_EMAIL
fi

if [ -z "$ALERT_EMAIL" ]; then
    print_error "Alert email is required"
    exit 1
fi

#===============================================================================
# Story 10.1: CloudWatch Log Groups Organization
#===============================================================================
print_header "Story 10.1: CloudWatch Log Groups Organization"

LAMBDA_FUNCTIONS=(
    "create-tracker"
    "list-trackers"
    "get-tracker"
    "update-tracker"
    "delete-tracker"
    "create-entry"
    "list-entries"
)

for FUNC in "${LAMBDA_FUNCTIONS[@]}"; do
    LOG_GROUP="/aws/lambda/${PROJECT_NAME}-${FUNC}"

    # Create log group if it doesn't exist
    if ! aws logs describe-log-groups \
        --log-group-name-prefix "$LOG_GROUP" \
        --region "$AWS_REGION" \
        --query "logGroups[?logGroupName=='$LOG_GROUP'].logGroupName" \
        --output text 2>/dev/null | grep -q "$LOG_GROUP"; then

        aws logs create-log-group \
            --log-group-name "$LOG_GROUP" \
            --region "$AWS_REGION" 2>/dev/null || true

        print_success "Created log group: $LOG_GROUP"
    else
        print_info "Log group exists: $LOG_GROUP"
    fi

    # Set retention policy
    aws logs put-retention-policy \
        --log-group-name "$LOG_GROUP" \
        --retention-in-days "$LOG_RETENTION_DAYS" \
        --region "$AWS_REGION" 2>/dev/null || true

    # Tag log group
    LOG_GROUP_ARN="arn:aws:logs:${AWS_REGION}:${AWS_ACCOUNT_ID}:log-group:${LOG_GROUP}:*"
    aws logs tag-log-group \
        --log-group-name "$LOG_GROUP" \
        --tags "Project=${PROJECT_NAME},Phase=10" \
        --region "$AWS_REGION" 2>/dev/null || true
done

print_success "Log groups organized with ${LOG_RETENTION_DAYS}-day retention and project tags"

#===============================================================================
# Story 10.2: Lambda Error Alerting
#===============================================================================
print_header "Story 10.2: Lambda Error Alerting"

SNS_TOPIC_NAME="${PROJECT_NAME}-alerts"
SNS_TOPIC_ARN=""

# Create SNS topic
print_step "Creating SNS alert topic..."
SNS_TOPIC_ARN=$(aws sns create-topic \
    --name "$SNS_TOPIC_NAME" \
    --region "$AWS_REGION" \
    --tags "Key=Project,Value=${PROJECT_NAME}" \
    --query 'TopicArn' \
    --output text)

print_success "SNS topic: $SNS_TOPIC_ARN"

# Subscribe email
print_step "Subscribing $ALERT_EMAIL to alerts..."
aws sns subscribe \
    --topic-arn "$SNS_TOPIC_ARN" \
    --protocol email \
    --notification-endpoint "$ALERT_EMAIL" \
    --region "$AWS_REGION" \
    >/dev/null

print_info "Check your email to confirm the subscription"

# Create error alarms for each Lambda function
print_step "Creating Lambda error alarms..."

for FUNC in "${LAMBDA_FUNCTIONS[@]}"; do
    FULL_NAME="${PROJECT_NAME}-${FUNC}"
    ALARM_NAME="${FULL_NAME}-errors"

    aws cloudwatch put-metric-alarm \
        --alarm-name "$ALARM_NAME" \
        --alarm-description "Alert when ${FULL_NAME} error rate exceeds threshold" \
        --namespace "AWS/Lambda" \
        --metric-name "Errors" \
        --dimensions "Name=FunctionName,Value=${FULL_NAME}" \
        --statistic Sum \
        --period 300 \
        --evaluation-periods 1 \
        --threshold 1 \
        --comparison-operator GreaterThanOrEqualToThreshold \
        --alarm-actions "$SNS_TOPIC_ARN" \
        --tags "Key=Project,Value=${PROJECT_NAME}" \
        --region "$AWS_REGION"

    print_success "Alarm created: $ALARM_NAME"
done

#===============================================================================
# Story 10.3 & 10.4: CloudWatch Dashboard
#===============================================================================
print_header "Stories 10.3 & 10.4: CloudWatch Dashboard"

DASHBOARD_NAME="${PROJECT_NAME}-dashboard"

# Build Lambda error widgets
LAMBDA_ERROR_METRICS=""
LAMBDA_DURATION_METRICS=""
for FUNC in "${LAMBDA_FUNCTIONS[@]}"; do
    FULL_NAME="${PROJECT_NAME}-${FUNC}"
    LAMBDA_ERROR_METRICS+="[ \"AWS/Lambda\", \"Errors\", \"FunctionName\", \"${FULL_NAME}\" ],"
    LAMBDA_DURATION_METRICS+="[ \"AWS/Lambda\", \"Duration\", \"FunctionName\", \"${FULL_NAME}\" ],"
done
# Remove trailing commas
LAMBDA_ERROR_METRICS="${LAMBDA_ERROR_METRICS%,}"
LAMBDA_DURATION_METRICS="${LAMBDA_DURATION_METRICS%,}"

# Build dashboard body
DASHBOARD_BODY=$(cat <<DASHBOARD_EOF
{
    "widgets": [
        {
            "type": "text",
            "x": 0, "y": 0, "width": 24, "height": 1,
            "properties": {
                "markdown": "# Debt Tracker - Operations Dashboard"
            }
        },
        {
            "type": "metric",
            "x": 0, "y": 1, "width": 12, "height": 6,
            "properties": {
                "title": "Lambda Errors",
                "metrics": [ ${LAMBDA_ERROR_METRICS} ],
                "period": 300,
                "stat": "Sum",
                "region": "${AWS_REGION}",
                "view": "timeSeries"
            }
        },
        {
            "type": "metric",
            "x": 12, "y": 1, "width": 12, "height": 6,
            "properties": {
                "title": "Lambda Duration (p99)",
                "metrics": [ ${LAMBDA_DURATION_METRICS} ],
                "period": 300,
                "stat": "p99",
                "region": "${AWS_REGION}",
                "view": "timeSeries"
            }
        },
        {
            "type": "metric",
            "x": 0, "y": 7, "width": 12, "height": 6,
            "properties": {
                "title": "API Gateway Latency",
                "metrics": [
                    [ "AWS/ApiGateway", "Latency", "ApiId", "${API_GATEWAY_ID}", { "stat": "p99" } ],
                    [ "AWS/ApiGateway", "Latency", "ApiId", "${API_GATEWAY_ID}", { "stat": "Average" } ]
                ],
                "period": 300,
                "region": "${AWS_REGION}",
                "view": "timeSeries"
            }
        },
        {
            "type": "metric",
            "x": 12, "y": 7, "width": 12, "height": 6,
            "properties": {
                "title": "API Gateway Request Count",
                "metrics": [
                    [ "AWS/ApiGateway", "Count", "ApiId", "${API_GATEWAY_ID}" ],
                    [ "AWS/ApiGateway", "4xx", "ApiId", "${API_GATEWAY_ID}" ],
                    [ "AWS/ApiGateway", "5xx", "ApiId", "${API_GATEWAY_ID}" ]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "${AWS_REGION}",
                "view": "timeSeries"
            }
        },
        {
            "type": "metric",
            "x": 0, "y": 13, "width": 12, "height": 6,
            "properties": {
                "title": "DynamoDB Read/Write Capacity",
                "metrics": [
                    [ "AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "${DYNAMODB_TABLE_NAME}" ],
                    [ "AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", "${DYNAMODB_TABLE_NAME}" ]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "${AWS_REGION}",
                "view": "timeSeries"
            }
        },
        {
            "type": "metric",
            "x": 12, "y": 13, "width": 12, "height": 6,
            "properties": {
                "title": "DynamoDB Throttled Requests",
                "metrics": [
                    [ "AWS/DynamoDB", "ReadThrottleEvents", "TableName", "${DYNAMODB_TABLE_NAME}" ],
                    [ "AWS/DynamoDB", "WriteThrottleEvents", "TableName", "${DYNAMODB_TABLE_NAME}" ]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "${AWS_REGION}",
                "view": "timeSeries"
            }
        }
    ]
}
DASHBOARD_EOF
)

aws cloudwatch put-dashboard \
    --dashboard-name "$DASHBOARD_NAME" \
    --dashboard-body "$DASHBOARD_BODY" \
    --region "$AWS_REGION"

print_success "Dashboard created: $DASHBOARD_NAME"
print_info "View at: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${DASHBOARD_NAME}"

# Story 10.3: API Gateway p99 latency alarm
print_step "Creating API Gateway latency alarm..."
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-api-latency-p99" \
    --alarm-description "Alert when API p99 latency exceeds 5 seconds" \
    --namespace "AWS/ApiGateway" \
    --metric-name "Latency" \
    --dimensions "Name=ApiId,Value=${API_GATEWAY_ID}" \
    --extended-statistic "p99" \
    --period 300 \
    --evaluation-periods 3 \
    --threshold 5000 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --region "$AWS_REGION"

print_success "API latency alarm created (p99 > 5s)"

# Story 10.4: DynamoDB throttling alarm
print_step "Creating DynamoDB throttling alarm..."
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-dynamodb-throttles" \
    --alarm-description "Alert when DynamoDB requests are throttled" \
    --namespace "AWS/DynamoDB" \
    --metric-name "ReadThrottleEvents" \
    --dimensions "Name=TableName,Value=${DYNAMODB_TABLE_NAME}" \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --region "$AWS_REGION"

print_success "DynamoDB throttle alarm created"

#===============================================================================
# Story 10.5: Dead Letter Queue Setup
#===============================================================================
print_header "Story 10.5: Dead Letter Queue Setup"

DLQ_NAME="${PROJECT_NAME}-dlq"

print_step "Creating SQS Dead Letter Queue..."
DLQ_URL=$(aws sqs create-queue \
    --queue-name "$DLQ_NAME" \
    --attributes '{"MessageRetentionPeriod":"1209600"}' \
    --tags "Project=${PROJECT_NAME}" \
    --region "$AWS_REGION" \
    --query 'QueueUrl' \
    --output text)

DLQ_ARN=$(aws sqs get-queue-attributes \
    --queue-url "$DLQ_URL" \
    --attribute-names QueueArn \
    --region "$AWS_REGION" \
    --query 'Attributes.QueueArn' \
    --output text)

print_success "DLQ created: $DLQ_ARN"

# Create alarm for DLQ messages
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-dlq-messages" \
    --alarm-description "Alert when messages appear in the DLQ" \
    --namespace "AWS/SQS" \
    --metric-name "ApproximateNumberOfMessagesVisible" \
    --dimensions "Name=QueueName,Value=${DLQ_NAME}" \
    --statistic Sum \
    --period 60 \
    --evaluation-periods 1 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --region "$AWS_REGION"

print_success "DLQ alarm created (messages > 0)"

#===============================================================================
# Story 10.7: Cost Budget Alert
#===============================================================================
print_header "Story 10.7: Cost Budget Alert"

BUDGET_NAME="${PROJECT_NAME}-monthly-budget"

print_step "Creating monthly budget with alerts..."

# Create budget JSON
BUDGET_JSON=$(cat <<BUDGET_EOF
{
    "BudgetName": "${BUDGET_NAME}",
    "BudgetLimit": {
        "Amount": "10",
        "Unit": "USD"
    },
    "BudgetType": "COST",
    "TimeUnit": "MONTHLY",
    "CostFilters": {},
    "CostTypes": {
        "IncludeTax": true,
        "IncludeSubscription": true,
        "UseBlended": false,
        "IncludeRefund": false,
        "IncludeCredit": false,
        "IncludeUpfront": true,
        "IncludeRecurring": true,
        "IncludeOtherSubscription": true,
        "IncludeSupport": true,
        "IncludeDiscount": true,
        "UseAmortized": false
    }
}
BUDGET_EOF
)

NOTIFICATIONS_JSON=$(cat <<NOTIF_EOF
[
    {
        "Notification": {
            "NotificationType": "ACTUAL",
            "ComparisonOperator": "GREATER_THAN",
            "Threshold": 50,
            "ThresholdType": "PERCENTAGE"
        },
        "Subscribers": [
            {
                "SubscriptionType": "EMAIL",
                "Address": "${ALERT_EMAIL}"
            }
        ]
    },
    {
        "Notification": {
            "NotificationType": "ACTUAL",
            "ComparisonOperator": "GREATER_THAN",
            "Threshold": 80,
            "ThresholdType": "PERCENTAGE"
        },
        "Subscribers": [
            {
                "SubscriptionType": "EMAIL",
                "Address": "${ALERT_EMAIL}"
            }
        ]
    },
    {
        "Notification": {
            "NotificationType": "ACTUAL",
            "ComparisonOperator": "GREATER_THAN",
            "Threshold": 100,
            "ThresholdType": "PERCENTAGE"
        },
        "Subscribers": [
            {
                "SubscriptionType": "EMAIL",
                "Address": "${ALERT_EMAIL}"
            }
        ]
    }
]
NOTIF_EOF
)

# Delete existing budget if it exists (budgets API doesn't have create-or-update)
aws budgets delete-budget \
    --account-id "$AWS_ACCOUNT_ID" \
    --budget-name "$BUDGET_NAME" 2>/dev/null || true

aws budgets create-budget \
    --account-id "$AWS_ACCOUNT_ID" \
    --budget "$BUDGET_JSON" \
    --notifications-with-subscribers "$NOTIFICATIONS_JSON" \
    --region "$AWS_REGION"

print_success "Budget created: \$10/month with alerts at 50%, 80%, 100%"

#===============================================================================
# Save Monitoring Configuration
#===============================================================================
print_step "Saving monitoring configuration..."

MONITORING_CONFIG_FILE="$SCRIPT_DIR/../generated/monitoring-config.json"

cat > "$MONITORING_CONFIG_FILE" <<EOF
{
    "snsTopicArn": "${SNS_TOPIC_ARN}",
    "snsTopicName": "${SNS_TOPIC_NAME}",
    "alertEmail": "${ALERT_EMAIL}",
    "dashboardName": "${DASHBOARD_NAME}",
    "dlqUrl": "${DLQ_URL}",
    "dlqArn": "${DLQ_ARN}",
    "budgetName": "${BUDGET_NAME}",
    "region": "${AWS_REGION}"
}
EOF

print_success "Configuration saved to: $MONITORING_CONFIG_FILE"

#===============================================================================
# Summary
#===============================================================================
print_header "Phase 10 Monitoring Setup Complete"

echo "Resources Created:"
echo "  SNS Topic:       $SNS_TOPIC_NAME"
echo "  Dashboard:       $DASHBOARD_NAME"
echo "  DLQ:             $DLQ_NAME"
echo "  Budget:          $BUDGET_NAME (\$10/month)"
echo ""
echo "Alarms Created:"
for FUNC in "${LAMBDA_FUNCTIONS[@]}"; do
    echo "  ${PROJECT_NAME}-${FUNC}-errors"
done
echo "  ${PROJECT_NAME}-api-latency-p99"
echo "  ${PROJECT_NAME}-dynamodb-throttles"
echo "  ${PROJECT_NAME}-dlq-messages"
echo ""
echo "IMPORTANT: Confirm the SNS email subscription in your inbox!"
echo ""
echo "Next: Run 02-setup-interest-scheduler.sh to deploy the interest calculation Lambda"
