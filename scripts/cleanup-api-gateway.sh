#!/bin/bash

#===============================================================================
# Cleanup API Gateway
# Deletes the HTTP API and associated resources
# Use this if you need to recreate the API from scratch
#===============================================================================

CONFIG_FILE="scripts/generated/api-gateway-config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Configuration file not found at $CONFIG_FILE"
  echo "Nothing to clean up."
  exit 0
fi

# Load configuration
API_ID=$(jq -r '.apiId' "$CONFIG_FILE")
LOG_GROUP_NAME=$(jq -r '.logGroupName' "$CONFIG_FILE")
REGION=$(jq -r '.region' "$CONFIG_FILE")

echo "=============================================="
echo "API Gateway Cleanup"
echo "=============================================="
echo ""
echo "This will delete:"
echo "  - API: $API_ID"
echo "  - Log Group: $LOG_GROUP_NAME"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Deleting API Gateway..."
aws apigatewayv2 delete-api \
  --api-id "$API_ID" \
  --region "$REGION" 2>/dev/null && echo "  ✓ API deleted" || echo "  ⚠ API may already be deleted"

echo ""
echo "Deleting CloudWatch log group..."
aws logs delete-log-group \
  --log-group-name "$LOG_GROUP_NAME" \
  --region "$REGION" 2>/dev/null && echo "  ✓ Log group deleted" || echo "  ⚠ Log group may already be deleted"

echo ""
echo "Removing configuration file..."
rm -f "$CONFIG_FILE"
echo "  ✓ Configuration file removed"

echo ""
echo "Cleanup complete!"
