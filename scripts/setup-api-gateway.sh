#!/bin/bash
set -e

#===============================================================================
# Phase 4: API Gateway Setup
# This script creates an HTTP API with JWT authorization for the debt-tracker app
#===============================================================================

# Configuration - pulled from existing Cognito setup
REGION="us-east-2"
API_NAME="debt-tracker-api"
STAGE_NAME="prod"

# Cognito configuration (from src/config/auth.config.ts)
USER_POOL_ID="us-east-2_MF6XS4BiK"
CLIENT_ID="4v31bn4r0vudooroapqt3k86si"

# Frontend origin for CORS
FRONTEND_ORIGIN="https://d2w2q49vvlxbof.cloudfront.net"
LOCALHOST_ORIGIN="http://localhost:3000"

# Output file for storing created resource IDs
OUTPUT_FILE="scripts/api-gateway-config.json"

echo "=============================================="
echo "Step 1: Creating HTTP API"
echo "=============================================="
echo ""
echo "What this does:"
echo "  - Creates an HTTP API (v2) - the newer, cheaper API Gateway type"
echo "  - Configures CORS to allow requests from your frontend"
echo "  - Sets up the basic API structure"
echo ""

# Create the HTTP API with CORS configuration
API_RESPONSE=$(aws apigatewayv2 create-api \
  --name "$API_NAME" \
  --protocol-type HTTP \
  --cors-configuration '{
    "AllowOrigins": ["'"$FRONTEND_ORIGIN"'", "'"$LOCALHOST_ORIGIN"'"],
    "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "AllowHeaders": ["Content-Type", "Authorization"],
    "ExposeHeaders": ["*"],
    "MaxAge": 86400,
    "AllowCredentials": false
  }' \
  --region "$REGION" \
  --output json)

API_ID=$(echo "$API_RESPONSE" | jq -r '.ApiId')
API_ENDPOINT=$(echo "$API_RESPONSE" | jq -r '.ApiEndpoint')

echo "✓ Created HTTP API"
echo "  API ID: $API_ID"
echo "  Endpoint: $API_ENDPOINT"
echo ""

echo "=============================================="
echo "Step 2: Creating JWT Authorizer"
echo "=============================================="
echo ""
echo "What this does:"
echo "  - Creates a JWT authorizer that validates tokens from Cognito"
echo "  - Uses your existing User Pool as the identity source"
echo "  - Automatically rejects requests without valid tokens (returns 401)"
echo ""

# Create JWT Authorizer pointing to Cognito
# The issuer URL format for Cognito is: https://cognito-idp.{region}.amazonaws.com/{userPoolId}
ISSUER_URL="https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}"

AUTHORIZER_RESPONSE=$(aws apigatewayv2 create-authorizer \
  --api-id "$API_ID" \
  --authorizer-type JWT \
  --identity-source '$request.header.Authorization' \
  --name "cognito-jwt-authorizer" \
  --jwt-configuration '{
    "Audience": ["'"$CLIENT_ID"'"],
    "Issuer": "'"$ISSUER_URL"'"
  }' \
  --region "$REGION" \
  --output json)

AUTHORIZER_ID=$(echo "$AUTHORIZER_RESPONSE" | jq -r '.AuthorizerId')

echo "✓ Created JWT Authorizer"
echo "  Authorizer ID: $AUTHORIZER_ID"
echo "  Issuer: $ISSUER_URL"
echo ""

echo "=============================================="
echo "Step 3: Creating API Routes"
echo "=============================================="
echo ""
echo "What this does:"
echo "  - Defines the URL paths your API will respond to"
echo "  - Each route is protected by the JWT authorizer"
echo "  - Routes follow REST conventions for tracker management"
echo ""
echo "Note: Routes are created without integrations for now."
echo "      Lambda functions will be connected in Phase 5."
echo ""

# Function to create a protected route
create_route() {
  local METHOD=$1
  local PATH=$2
  local DESCRIPTION=$3

  ROUTE_RESPONSE=$(aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "$METHOD $PATH" \
    --authorization-type JWT \
    --authorizer-id "$AUTHORIZER_ID" \
    --region "$REGION" \
    --output json 2>/dev/null || echo '{"error": true}')

  ROUTE_ID=$(echo "$ROUTE_RESPONSE" | jq -r '.RouteId // empty')

  if [ -n "$ROUTE_ID" ]; then
    echo "  ✓ $METHOD $PATH - $DESCRIPTION"
  else
    echo "  ✗ Failed to create $METHOD $PATH"
  fi
}

# Create all routes from Story 4.3
create_route "GET" "/trackers" "List user's trackers"
create_route "POST" "/trackers" "Create a new tracker"
create_route "GET" "/trackers/{id}" "Get tracker details"
create_route "PUT" "/trackers/{id}" "Update tracker"
create_route "DELETE" "/trackers/{id}" "Delete tracker"
create_route "GET" "/trackers/{id}/entries" "List entries for a tracker"
create_route "POST" "/trackers/{id}/entries" "Add entry to a tracker"

echo ""

echo "=============================================="
echo "Step 4: Creating Stage with Logging"
echo "=============================================="
echo ""
echo "What this does:"
echo "  - Creates a deployment stage (prod)"
echo "  - Enables access logging to CloudWatch"
echo "  - Makes the API publicly accessible"
echo ""

# First, create a CloudWatch log group for API Gateway logs
LOG_GROUP_NAME="/aws/apigateway/${API_NAME}"

aws logs create-log-group \
  --log-group-name "$LOG_GROUP_NAME" \
  --region "$REGION" 2>/dev/null || echo "  (Log group may already exist)"

# Set retention policy to 30 days to control costs
aws logs put-retention-policy \
  --log-group-name "$LOG_GROUP_NAME" \
  --retention-in-days 30 \
  --region "$REGION"

echo "✓ Created CloudWatch log group: $LOG_GROUP_NAME"

# Get the log group ARN
LOG_GROUP_ARN=$(aws logs describe-log-groups \
  --log-group-name-prefix "$LOG_GROUP_NAME" \
  --region "$REGION" \
  --query "logGroups[0].arn" \
  --output text)

# Create the stage with auto-deploy and logging
# Note: HTTP APIs use $default stage or named stages
STAGE_RESPONSE=$(aws apigatewayv2 create-stage \
  --api-id "$API_ID" \
  --stage-name "$STAGE_NAME" \
  --auto-deploy \
  --access-log-settings '{
    "DestinationArn": "'"$LOG_GROUP_ARN"'",
    "Format": "{\"requestId\":\"$context.requestId\",\"ip\":\"$context.identity.sourceIp\",\"requestTime\":\"$context.requestTime\",\"httpMethod\":\"$context.httpMethod\",\"routeKey\":\"$context.routeKey\",\"status\":\"$context.status\",\"protocol\":\"$context.protocol\",\"responseLength\":\"$context.responseLength\",\"integrationError\":\"$context.integrationErrorMessage\"}"
  }' \
  --region "$REGION" \
  --output json)

echo "✓ Created stage: $STAGE_NAME with access logging"
echo ""

# Final API URL
FINAL_API_URL="${API_ENDPOINT}/${STAGE_NAME}"

echo "=============================================="
echo "Setup Complete!"
echo "=============================================="
echo ""
echo "API Gateway Configuration:"
echo "  API ID:        $API_ID"
echo "  API Endpoint:  $FINAL_API_URL"
echo "  Authorizer ID: $AUTHORIZER_ID"
echo "  Log Group:     $LOG_GROUP_NAME"
echo ""
echo "Protected Routes (require valid JWT):"
echo "  GET    $FINAL_API_URL/trackers"
echo "  POST   $FINAL_API_URL/trackers"
echo "  GET    $FINAL_API_URL/trackers/{id}"
echo "  PUT    $FINAL_API_URL/trackers/{id}"
echo "  DELETE $FINAL_API_URL/trackers/{id}"
echo "  GET    $FINAL_API_URL/trackers/{id}/entries"
echo "  POST   $FINAL_API_URL/trackers/{id}/entries"
echo ""

# Save configuration to file for later use
cat > "$OUTPUT_FILE" << EOF
{
  "apiId": "$API_ID",
  "apiEndpoint": "$FINAL_API_URL",
  "authorizerId": "$AUTHORIZER_ID",
  "logGroupName": "$LOG_GROUP_NAME",
  "region": "$REGION",
  "stageName": "$STAGE_NAME"
}
EOF

echo "Configuration saved to: $OUTPUT_FILE"
echo ""
echo "Next Steps:"
echo "  1. Create Lambda functions (Phase 5)"
echo "  2. Connect Lambdas to API routes using integrations"
echo "  3. Update frontend to use API endpoint"
