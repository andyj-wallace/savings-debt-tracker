#!/bin/bash
set -e

#===============================================================================
# Verify API Gateway Setup
# Tests that the HTTP API, authorizer, and routes are configured correctly
#===============================================================================

CONFIG_FILE="scripts/api-gateway-config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Configuration file not found at $CONFIG_FILE"
  echo "Please run setup-api-gateway.sh first"
  exit 1
fi

# Load configuration
API_ID=$(jq -r '.apiId' "$CONFIG_FILE")
API_ENDPOINT=$(jq -r '.apiEndpoint' "$CONFIG_FILE")
AUTHORIZER_ID=$(jq -r '.authorizerId' "$CONFIG_FILE")
REGION=$(jq -r '.region' "$CONFIG_FILE")

echo "=============================================="
echo "Verifying API Gateway Configuration"
echo "=============================================="
echo ""

# Test 1: Verify API exists
echo "Test 1: Checking API exists..."
API_CHECK=$(aws apigatewayv2 get-api \
  --api-id "$API_ID" \
  --region "$REGION" \
  --query "Name" \
  --output text 2>/dev/null || echo "FAILED")

if [ "$API_CHECK" != "FAILED" ]; then
  echo "  ✓ API '$API_CHECK' exists (ID: $API_ID)"
else
  echo "  ✗ API not found"
  exit 1
fi
echo ""

# Test 2: Verify CORS configuration
echo "Test 2: Checking CORS configuration..."
CORS_ORIGINS=$(aws apigatewayv2 get-api \
  --api-id "$API_ID" \
  --region "$REGION" \
  --query "CorsConfiguration.AllowOrigins" \
  --output text 2>/dev/null)

if [ -n "$CORS_ORIGINS" ]; then
  echo "  ✓ CORS configured for origins: $CORS_ORIGINS"
else
  echo "  ✗ CORS not configured"
fi
echo ""

# Test 3: Verify JWT Authorizer
echo "Test 3: Checking JWT Authorizer..."
AUTH_CHECK=$(aws apigatewayv2 get-authorizer \
  --api-id "$API_ID" \
  --authorizer-id "$AUTHORIZER_ID" \
  --region "$REGION" \
  --query "[Name, AuthorizerType]" \
  --output text 2>/dev/null || echo "FAILED")

if [ "$AUTH_CHECK" != "FAILED" ]; then
  echo "  ✓ JWT Authorizer configured: $AUTH_CHECK"
else
  echo "  ✗ Authorizer not found"
fi
echo ""

# Test 4: List all routes
echo "Test 4: Checking routes..."
ROUTES=$(aws apigatewayv2 get-routes \
  --api-id "$API_ID" \
  --region "$REGION" \
  --query "Items[].RouteKey" \
  --output text 2>/dev/null)

echo "  Routes configured:"
for route in $ROUTES; do
  echo "    - $route"
done
echo ""

# Test 5: Verify stage
echo "Test 5: Checking deployment stage..."
STAGE_CHECK=$(aws apigatewayv2 get-stages \
  --api-id "$API_ID" \
  --region "$REGION" \
  --query "Items[].StageName" \
  --output text 2>/dev/null)

echo "  ✓ Stages: $STAGE_CHECK"
echo ""

# Test 6: Test unauthorized request (should return 401)
echo "Test 6: Testing JWT authorization (expecting 401)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_ENDPOINT}/trackers" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "401" ]; then
  echo "  ✓ Unauthorized request correctly returns 401"
elif [ "$HTTP_STATUS" = "403" ]; then
  echo "  ✓ Unauthorized request returns 403 (also acceptable)"
else
  echo "  ⚠ Unexpected status: $HTTP_STATUS"
  echo "    (Routes may not have integrations yet - this is expected in Phase 4)"
fi
echo ""

# Test 7: Check CloudWatch log group
echo "Test 7: Checking CloudWatch log group..."
LOG_GROUP_NAME=$(jq -r '.logGroupName' "$CONFIG_FILE")
LOG_CHECK=$(aws logs describe-log-groups \
  --log-group-name-prefix "$LOG_GROUP_NAME" \
  --region "$REGION" \
  --query "logGroups[0].logGroupName" \
  --output text 2>/dev/null || echo "FAILED")

if [ "$LOG_CHECK" != "FAILED" ] && [ "$LOG_CHECK" != "None" ]; then
  echo "  ✓ Log group exists: $LOG_CHECK"
else
  echo "  ✗ Log group not found"
fi
echo ""

echo "=============================================="
echo "Verification Complete"
echo "=============================================="
echo ""
echo "API Endpoint: $API_ENDPOINT"
echo ""
echo "Note: Routes will return errors until Lambda integrations"
echo "      are configured in Phase 5."
