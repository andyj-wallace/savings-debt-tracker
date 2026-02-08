#!/bin/bash
#===============================================================================
# Phase 1: AWS Account & IAM Baseline
# Script 02: Setup IAM Roles
#
# Story 1.3: IAM Role Strategy Definition
# Creates IAM roles and policies for Lambda functions following least-privilege.
#
# Roles Created:
#   - debt-tracker-lambda-execution-role: Base Lambda execution role
#   - Attached policies for CloudWatch Logs and DynamoDB access
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 1: Setup IAM Roles for Lambda"

# Role and policy names
EXECUTION_ROLE_NAME="${LAMBDA_ROLE_PREFIX}-execution-role"
LOGS_POLICY_NAME="${LAMBDA_ROLE_PREFIX}-logs-policy"
DYNAMODB_POLICY_NAME="${LAMBDA_ROLE_PREFIX}-dynamodb-policy"

#-------------------------------------------------------------------------------
# Step 1: Create Lambda Execution Role
#-------------------------------------------------------------------------------
print_step "Creating Lambda execution role..."

# Trust policy allowing Lambda to assume this role
TRUST_POLICY=$(cat <<'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
)

# Check if role already exists
if aws iam get-role --role-name "$EXECUTION_ROLE_NAME" >/dev/null 2>&1; then
    print_info "Role already exists: $EXECUTION_ROLE_NAME"
    ROLE_ARN=$(aws iam get-role --role-name "$EXECUTION_ROLE_NAME" --query 'Role.Arn' --output text)
else
    # Create the role
    ROLE_RESPONSE=$(aws iam create-role \
        --role-name "$EXECUTION_ROLE_NAME" \
        --assume-role-policy-document "$TRUST_POLICY" \
        --description "Lambda execution role for $PROJECT_NAME" \
        --tags "Key=Project,Value=$PROJECT_NAME" \
        --output json)

    ROLE_ARN=$(echo "$ROLE_RESPONSE" | jq -r '.Role.Arn')
    print_success "Created role: $EXECUTION_ROLE_NAME"
fi

echo "      Role ARN: $ROLE_ARN"

#-------------------------------------------------------------------------------
# Step 2: Create CloudWatch Logs Policy
#-------------------------------------------------------------------------------
print_step "Creating CloudWatch Logs policy..."

# Policy for CloudWatch Logs access
LOGS_POLICY=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:${AWS_REGION}:${AWS_ACCOUNT_ID}:log-group:/aws/lambda/${PROJECT_NAME}-*:*"
            ]
        }
    ]
}
EOF
)

# Check if policy exists
LOGS_POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${LOGS_POLICY_NAME}"

if aws iam get-policy --policy-arn "$LOGS_POLICY_ARN" >/dev/null 2>&1; then
    print_info "Policy already exists: $LOGS_POLICY_NAME"
else
    aws iam create-policy \
        --policy-name "$LOGS_POLICY_NAME" \
        --policy-document "$LOGS_POLICY" \
        --description "CloudWatch Logs access for $PROJECT_NAME Lambda functions" \
        --tags "Key=Project,Value=$PROJECT_NAME" \
        >/dev/null

    print_success "Created policy: $LOGS_POLICY_NAME"
fi

# Attach policy to role (idempotent)
aws iam attach-role-policy \
    --role-name "$EXECUTION_ROLE_NAME" \
    --policy-arn "$LOGS_POLICY_ARN" 2>/dev/null || true

print_success "Attached CloudWatch Logs policy to role"

#-------------------------------------------------------------------------------
# Step 3: Create DynamoDB Policy (Scoped to Table)
#-------------------------------------------------------------------------------
print_step "Creating DynamoDB access policy..."

# Policy for DynamoDB access - scoped to single table
DYNAMODB_POLICY=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": [
                "arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/${DYNAMODB_TABLE_NAME}",
                "arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/${DYNAMODB_TABLE_NAME}/index/*"
            ]
        }
    ]
}
EOF
)

# Check if policy exists
DYNAMODB_POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${DYNAMODB_POLICY_NAME}"

if aws iam get-policy --policy-arn "$DYNAMODB_POLICY_ARN" >/dev/null 2>&1; then
    print_info "Policy already exists: $DYNAMODB_POLICY_NAME"
else
    aws iam create-policy \
        --policy-name "$DYNAMODB_POLICY_NAME" \
        --policy-document "$DYNAMODB_POLICY" \
        --description "DynamoDB access for $PROJECT_NAME Lambda functions" \
        --tags "Key=Project,Value=$PROJECT_NAME" \
        >/dev/null

    print_success "Created policy: $DYNAMODB_POLICY_NAME"
fi

# Attach policy to role (idempotent)
aws iam attach-role-policy \
    --role-name "$EXECUTION_ROLE_NAME" \
    --policy-arn "$DYNAMODB_POLICY_ARN" 2>/dev/null || true

print_success "Attached DynamoDB policy to role"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "IAM Role Setup Complete"

echo "Created Resources:"
echo "  Role:            $EXECUTION_ROLE_NAME"
echo "  Role ARN:        $ROLE_ARN"
echo "  Logs Policy:     $LOGS_POLICY_NAME"
echo "  DynamoDB Policy: $DYNAMODB_POLICY_NAME"
echo ""
echo "Permissions Summary:"
echo "  - CloudWatch Logs: Create log groups/streams, write log events"
echo "  - DynamoDB:        Full CRUD access to $DYNAMODB_TABLE_NAME table"
echo ""
echo "This role will be used by Lambda functions in Phase 5."

# Save role ARN to config file for other scripts
ROLE_CONFIG_FILE="$SCRIPT_DIR/../iam-config.json"
cat > "$ROLE_CONFIG_FILE" << EOF
{
    "executionRoleArn": "$ROLE_ARN",
    "executionRoleName": "$EXECUTION_ROLE_NAME",
    "logsPolicyArn": "$LOGS_POLICY_ARN",
    "dynamodbPolicyArn": "$DYNAMODB_POLICY_ARN"
}
EOF

print_success "Configuration saved to: $ROLE_CONFIG_FILE"
