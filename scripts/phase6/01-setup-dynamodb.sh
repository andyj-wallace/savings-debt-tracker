#!/bin/bash
#===============================================================================
# Phase 6: DynamoDB Data Model
# Script 01: Setup DynamoDB Table
#
# Story 6.1: DynamoDB Table Creation
# Creates a DynamoDB table with single-table design:
#   - On-demand capacity (pay-per-request)
#   - Partition key: PK (String)
#   - Sort key: SK (String)
#   - Point-in-time recovery enabled
#   - Encryption at rest (default AWS-managed)
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 6: Setup DynamoDB Table"

#-------------------------------------------------------------------------------
# Step 1: Check for Existing Table
#-------------------------------------------------------------------------------
print_step "Checking for existing DynamoDB table..."

if aws dynamodb describe-table \
    --table-name "$DYNAMODB_TABLE_NAME" \
    --region "$AWS_REGION" >/dev/null 2>&1; then
    print_info "Table already exists: $DYNAMODB_TABLE_NAME"
    TABLE_EXISTS=true
else
    TABLE_EXISTS=false
fi

#-------------------------------------------------------------------------------
# Step 2: Create Table (if not exists)
#-------------------------------------------------------------------------------
if [ "$TABLE_EXISTS" = false ]; then
    print_step "Creating DynamoDB table: $DYNAMODB_TABLE_NAME"

    aws dynamodb create-table \
        --table-name "$DYNAMODB_TABLE_NAME" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --region "$AWS_REGION" \
        --tags \
            Key=Project,Value="$PROJECT_NAME" \
            Key=Phase,Value=6 \
        >/dev/null

    print_success "Table created: $DYNAMODB_TABLE_NAME"

    # Wait for table to become active
    print_step "Waiting for table to become active..."
    aws dynamodb wait table-exists \
        --table-name "$DYNAMODB_TABLE_NAME" \
        --region "$AWS_REGION"
    print_success "Table is now active"
fi

#-------------------------------------------------------------------------------
# Step 3: Enable Point-in-Time Recovery
#-------------------------------------------------------------------------------
print_step "Enabling Point-in-Time Recovery..."

PITR_STATUS=$(aws dynamodb describe-continuous-backups \
    --table-name "$DYNAMODB_TABLE_NAME" \
    --region "$AWS_REGION" \
    --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' \
    --output text 2>/dev/null || echo "DISABLED")

if [ "$PITR_STATUS" = "ENABLED" ]; then
    print_info "Point-in-Time Recovery already enabled"
else
    aws dynamodb update-continuous-backups \
        --table-name "$DYNAMODB_TABLE_NAME" \
        --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
        --region "$AWS_REGION" >/dev/null

    print_success "Point-in-Time Recovery enabled"
fi

#-------------------------------------------------------------------------------
# Step 4: Get Table Details
#-------------------------------------------------------------------------------
print_step "Getting table details..."

TABLE_DETAILS=$(aws dynamodb describe-table \
    --table-name "$DYNAMODB_TABLE_NAME" \
    --region "$AWS_REGION" \
    --output json)

TABLE_ARN=$(echo "$TABLE_DETAILS" | jq -r '.Table.TableArn')
TABLE_STATUS=$(echo "$TABLE_DETAILS" | jq -r '.Table.TableStatus')
ENCRYPTION=$(echo "$TABLE_DETAILS" | jq -r '.Table.SSEDescription.Status // "ENABLED (default)"')

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "DynamoDB Table Setup Complete"

echo "Table Configuration:"
echo "  Name:                 $DYNAMODB_TABLE_NAME"
echo "  ARN:                  $TABLE_ARN"
echo "  Status:               $TABLE_STATUS"
echo "  Region:               $AWS_REGION"
echo ""
echo "Key Schema:"
echo "  Partition Key (PK):   String - USER#<userId>"
echo "  Sort Key (SK):        String - TRACKER#<id>, ENTRY#<trackerId>#<ts>, SUMMARY#<id>"
echo ""
echo "Settings:"
echo "  Billing Mode:         On-Demand (PAY_PER_REQUEST)"
echo "  Point-in-Time Recovery: Enabled"
echo "  Encryption:           $ENCRYPTION"
echo ""
echo "Access Patterns:"
echo "  List Trackers:        Query PK=USER#<id>, SK begins_with TRACKER#"
echo "  Get Tracker:          GetItem PK=USER#<id>, SK=TRACKER#<trackerId>"
echo "  List Entries:         Query PK=USER#<id>, SK begins_with ENTRY#<trackerId>#"
echo "  Get Summary:          GetItem PK=USER#<id>, SK=SUMMARY#<trackerId>"

# Save DynamoDB config
DYNAMODB_CONFIG_FILE="$SCRIPT_DIR/../dynamodb-config.json"
cat > "$DYNAMODB_CONFIG_FILE" << EOF
{
    "tableName": "$DYNAMODB_TABLE_NAME",
    "tableArn": "$TABLE_ARN",
    "region": "$AWS_REGION",
    "keySchema": {
        "partitionKey": "PK",
        "sortKey": "SK"
    }
}
EOF

print_success "Configuration saved to: $DYNAMODB_CONFIG_FILE"
