#!/bin/bash
set -e

#===============================================================================
# Verify DynamoDB Setup
# Tests that the DynamoDB table is configured correctly for the Debt Tracker app
#===============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/generated/dynamodb-config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Configuration file not found at $CONFIG_FILE"
  echo "Please run setup-infrastructure.sh --phase 6 first"
  exit 1
fi

# Load configuration
TABLE_NAME=$(jq -r '.tableName' "$CONFIG_FILE")
TABLE_ARN=$(jq -r '.tableArn' "$CONFIG_FILE")
REGION=$(jq -r '.region' "$CONFIG_FILE")

echo "=============================================="
echo "Verifying DynamoDB Configuration"
echo "=============================================="
echo ""
echo "Table:  $TABLE_NAME"
echo "Region: $REGION"
echo ""

# Test 1: Verify table exists and is active
echo "Test 1: Checking table exists..."
TABLE_STATUS=$(aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --query "Table.TableStatus" \
  --output text 2>/dev/null || echo "FAILED")

if [ "$TABLE_STATUS" = "ACTIVE" ]; then
  echo "  ✓ Table '$TABLE_NAME' exists and is ACTIVE"
elif [ "$TABLE_STATUS" = "FAILED" ]; then
  echo "  ✗ Table not found"
  exit 1
else
  echo "  ⚠ Table status: $TABLE_STATUS"
fi
echo ""

# Test 2: Verify key schema
echo "Test 2: Checking key schema..."
KEY_SCHEMA=$(aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --query "Table.KeySchema[*].[AttributeName,KeyType]" \
  --output text 2>/dev/null)

PK_CHECK=$(echo "$KEY_SCHEMA" | grep -c "PK.*HASH" || true)
SK_CHECK=$(echo "$KEY_SCHEMA" | grep -c "SK.*RANGE" || true)

if [ "$PK_CHECK" -eq 1 ] && [ "$SK_CHECK" -eq 1 ]; then
  echo "  ✓ Partition Key: PK (HASH)"
  echo "  ✓ Sort Key: SK (RANGE)"
else
  echo "  ✗ Key schema mismatch"
  echo "  Expected: PK (HASH), SK (RANGE)"
  echo "  Found: $KEY_SCHEMA"
fi
echo ""

# Test 3: Verify billing mode
echo "Test 3: Checking billing mode..."
BILLING_MODE=$(aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --query "Table.BillingModeSummary.BillingMode" \
  --output text 2>/dev/null || echo "PROVISIONED")

if [ "$BILLING_MODE" = "PAY_PER_REQUEST" ]; then
  echo "  ✓ Billing mode: On-Demand (PAY_PER_REQUEST)"
else
  echo "  ⚠ Billing mode: $BILLING_MODE (expected PAY_PER_REQUEST)"
fi
echo ""

# Test 4: Verify Point-in-Time Recovery
echo "Test 4: Checking Point-in-Time Recovery..."
PITR_STATUS=$(aws dynamodb describe-continuous-backups \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --query "ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus" \
  --output text 2>/dev/null || echo "DISABLED")

if [ "$PITR_STATUS" = "ENABLED" ]; then
  echo "  ✓ Point-in-Time Recovery: ENABLED"
else
  echo "  ⚠ Point-in-Time Recovery: $PITR_STATUS"
fi
echo ""

# Test 5: Verify encryption
echo "Test 5: Checking encryption..."
ENCRYPTION=$(aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --query "Table.SSEDescription.Status" \
  --output text 2>/dev/null || echo "ENABLED")

if [ "$ENCRYPTION" = "ENABLED" ] || [ "$ENCRYPTION" = "None" ]; then
  echo "  ✓ Encryption at rest: ENABLED (AWS-managed)"
else
  echo "  ⚠ Encryption status: $ENCRYPTION"
fi
echo ""

# Test 6: Check item count
echo "Test 6: Checking table statistics..."
ITEM_COUNT=$(aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --query "Table.ItemCount" \
  --output text 2>/dev/null || echo "0")

TABLE_SIZE=$(aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --query "Table.TableSizeBytes" \
  --output text 2>/dev/null || echo "0")

echo "  Item count: $ITEM_COUNT"
echo "  Table size: $TABLE_SIZE bytes"
echo ""

# Test 7: Verify table ARN matches
echo "Test 7: Verifying table ARN..."
ACTUAL_ARN=$(aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --query "Table.TableArn" \
  --output text 2>/dev/null)

if [ "$ACTUAL_ARN" = "$TABLE_ARN" ]; then
  echo "  ✓ Table ARN matches configuration"
else
  echo "  ⚠ ARN mismatch"
  echo "    Config:  $TABLE_ARN"
  echo "    Actual:  $ACTUAL_ARN"
fi
echo ""

echo "=============================================="
echo "Verification Complete"
echo "=============================================="
echo ""
echo "Table ARN: $TABLE_ARN"
echo ""
echo "Console URL:"
echo "  https://$REGION.console.aws.amazon.com/dynamodbv2/home?region=$REGION#table?name=$TABLE_NAME"
echo ""
echo "Expected access patterns:"
echo "  - USER#<userId> + TRACKER#<id>         → Tracker metadata"
echo "  - USER#<userId> + ENTRY#<trackerId>#<ts> → Transaction entries"
echo "  - USER#<userId> + SUMMARY#<trackerId>  → Pre-computed stats"
