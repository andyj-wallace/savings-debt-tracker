#!/bin/bash
#===============================================================================
# Phase 4: API Gateway Setup
# Script 01: Create HTTP API with JWT Authorization
#
# Story 4.1-4.3: API Gateway Configuration
# Creates an HTTP API with:
#   - JWT authorizer pointing to Cognito User Pool
#   - CORS configuration for frontend
#   - Protected routes for tracker management
#   - CloudWatch access logging
#
# Prerequisites:
#   - Phase 3 completed (Cognito User Pool exists)
#   - cognito-config.json must exist
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 4: Setup API Gateway"

#-------------------------------------------------------------------------------
# Step 1: Verify Prerequisites
#-------------------------------------------------------------------------------
print_step "Verifying prerequisites..."

# Check for Cognito config
COGNITO_CONFIG_FILE="$SCRIPT_DIR/../cognito-config.json"
if [ ! -f "$COGNITO_CONFIG_FILE" ]; then
    print_error "Cognito config not found: $COGNITO_CONFIG_FILE"
    print_info "Run Phase 3 (Cognito setup) first"
    exit 1
fi

# Load Cognito values
USER_POOL_ID=$(jq -r '.userPoolId' "$COGNITO_CONFIG_FILE")
CLIENT_ID=$(jq -r '.clientId' "$COGNITO_CONFIG_FILE")

if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" = "null" ]; then
    print_error "User Pool ID not found in cognito-config.json"
    exit 1
fi

if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ]; then
    print_error "Client ID not found in cognito-config.json"
    exit 1
fi

print_success "Prerequisites verified"
echo "  User Pool ID: $USER_POOL_ID"
echo "  Client ID: $CLIENT_ID"

#-------------------------------------------------------------------------------
# Step 2: Check for Existing API
#-------------------------------------------------------------------------------
print_step "Checking for existing API Gateway..."

EXISTING_API_ID=$(aws apigatewayv2 get-apis \
    --region "$AWS_REGION" \
    --query "Items[?Name=='$API_GATEWAY_NAME'].ApiId" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_API_ID" ] && [ "$EXISTING_API_ID" != "None" ]; then
    print_info "API Gateway already exists: $API_GATEWAY_NAME (ID: $EXISTING_API_ID)"
    API_ID="$EXISTING_API_ID"
    API_ENDPOINT=$(aws apigatewayv2 get-api \
        --api-id "$API_ID" \
        --region "$AWS_REGION" \
        --query "ApiEndpoint" \
        --output text)
else
    #-------------------------------------------------------------------------------
    # Step 3: Create HTTP API
    #-------------------------------------------------------------------------------
    print_step "Creating HTTP API: $API_GATEWAY_NAME"

    # Build CORS origins
    CORS_ORIGINS="[\"http://localhost:3000\""
    if [ -n "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "https://YOUR_CLOUDFRONT_DOMAIN" ]; then
        CORS_ORIGINS="$CORS_ORIGINS, \"$CLOUDFRONT_URL\""
    fi
    CORS_ORIGINS="$CORS_ORIGINS]"

    API_RESPONSE=$(aws apigatewayv2 create-api \
        --name "$API_GATEWAY_NAME" \
        --protocol-type HTTP \
        --cors-configuration "{
            \"AllowOrigins\": $CORS_ORIGINS,
            \"AllowMethods\": [\"GET\", \"POST\", \"PUT\", \"DELETE\", \"OPTIONS\"],
            \"AllowHeaders\": [\"Content-Type\", \"Authorization\"],
            \"ExposeHeaders\": [\"*\"],
            \"MaxAge\": 86400,
            \"AllowCredentials\": false
        }" \
        --region "$AWS_REGION" \
        --tags Project="$PROJECT_NAME",Phase=4 \
        --output json)

    API_ID=$(echo "$API_RESPONSE" | jq -r '.ApiId')
    API_ENDPOINT=$(echo "$API_RESPONSE" | jq -r '.ApiEndpoint')

    print_success "Created HTTP API: $API_ID"
fi

#-------------------------------------------------------------------------------
# Step 4: Create JWT Authorizer
#-------------------------------------------------------------------------------
print_step "Setting up JWT Authorizer..."

# Check if authorizer already exists
EXISTING_AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --query "Items[?Name=='cognito-jwt-authorizer'].AuthorizerId" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_AUTHORIZER_ID" ] && [ "$EXISTING_AUTHORIZER_ID" != "None" ]; then
    print_info "JWT Authorizer already exists: $EXISTING_AUTHORIZER_ID"
    AUTHORIZER_ID="$EXISTING_AUTHORIZER_ID"
else
    # Cognito issuer URL format
    ISSUER_URL="https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}"

    AUTHORIZER_RESPONSE=$(aws apigatewayv2 create-authorizer \
        --api-id "$API_ID" \
        --authorizer-type JWT \
        --identity-source '$request.header.Authorization' \
        --name "cognito-jwt-authorizer" \
        --jwt-configuration "{
            \"Audience\": [\"$CLIENT_ID\"],
            \"Issuer\": \"$ISSUER_URL\"
        }" \
        --region "$AWS_REGION" \
        --output json)

    AUTHORIZER_ID=$(echo "$AUTHORIZER_RESPONSE" | jq -r '.AuthorizerId')
    print_success "Created JWT Authorizer: $AUTHORIZER_ID"
    echo "  Issuer: $ISSUER_URL"
fi

#-------------------------------------------------------------------------------
# Step 5: Create Routes
#-------------------------------------------------------------------------------
print_step "Creating API routes..."

# Function to create a protected route
create_route() {
    local ROUTE_KEY="$1"
    local DESCRIPTION="$2"

    # Check if route exists
    EXISTING_ROUTE=$(aws apigatewayv2 get-routes \
        --api-id "$API_ID" \
        --region "$AWS_REGION" \
        --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId" \
        --output text 2>/dev/null || echo "")

    if [ -n "$EXISTING_ROUTE" ] && [ "$EXISTING_ROUTE" != "None" ]; then
        print_info "Route exists: $ROUTE_KEY"
    else
        aws apigatewayv2 create-route \
            --api-id "$API_ID" \
            --route-key "$ROUTE_KEY" \
            --authorization-type JWT \
            --authorizer-id "$AUTHORIZER_ID" \
            --region "$AWS_REGION" \
            >/dev/null

        print_success "Created route: $ROUTE_KEY - $DESCRIPTION"
    fi
}

# Create all routes
create_route "GET /trackers" "List user's trackers"
create_route "POST /trackers" "Create a new tracker"
create_route "GET /trackers/{id}" "Get tracker details"
create_route "PUT /trackers/{id}" "Update tracker"
create_route "DELETE /trackers/{id}" "Delete tracker"
create_route "GET /trackers/{id}/entries" "List entries for a tracker"
create_route "POST /trackers/{id}/entries" "Add entry to a tracker"

#-------------------------------------------------------------------------------
# Step 6: Create Stage with Logging
#-------------------------------------------------------------------------------
print_step "Setting up deployment stage..."

# Create CloudWatch log group
LOG_GROUP_NAME="/aws/apigateway/${API_GATEWAY_NAME}"

aws logs create-log-group \
    --log-group-name "$LOG_GROUP_NAME" \
    --region "$AWS_REGION" 2>/dev/null || true

aws logs put-retention-policy \
    --log-group-name "$LOG_GROUP_NAME" \
    --retention-in-days "$LOG_RETENTION_DAYS" \
    --region "$AWS_REGION" 2>/dev/null || true

# Get log group ARN
LOG_GROUP_ARN=$(aws logs describe-log-groups \
    --log-group-name-prefix "$LOG_GROUP_NAME" \
    --region "$AWS_REGION" \
    --query "logGroups[0].arn" \
    --output text)

# Check if stage exists
EXISTING_STAGE=$(aws apigatewayv2 get-stages \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --query "Items[?StageName=='$API_GATEWAY_STAGE'].StageName" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_STAGE" ] && [ "$EXISTING_STAGE" != "None" ]; then
    print_info "Stage already exists: $API_GATEWAY_STAGE"
else
    aws apigatewayv2 create-stage \
        --api-id "$API_ID" \
        --stage-name "$API_GATEWAY_STAGE" \
        --auto-deploy \
        --access-log-settings "{
            \"DestinationArn\": \"$LOG_GROUP_ARN\",
            \"Format\": \"{\\\"requestId\\\":\\\"\$context.requestId\\\",\\\"ip\\\":\\\"\$context.identity.sourceIp\\\",\\\"requestTime\\\":\\\"\$context.requestTime\\\",\\\"httpMethod\\\":\\\"\$context.httpMethod\\\",\\\"routeKey\\\":\\\"\$context.routeKey\\\",\\\"status\\\":\\\"\$context.status\\\",\\\"protocol\\\":\\\"\$context.protocol\\\",\\\"responseLength\\\":\\\"\$context.responseLength\\\"}\"
        }" \
        --region "$AWS_REGION" \
        >/dev/null

    print_success "Created stage: $API_GATEWAY_STAGE with access logging"
fi

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
FINAL_API_URL="${API_ENDPOINT}/${API_GATEWAY_STAGE}"

print_header "API Gateway Setup Complete"

echo "API Gateway Configuration:"
echo "  Name:          $API_GATEWAY_NAME"
echo "  API ID:        $API_ID"
echo "  Endpoint:      $FINAL_API_URL"
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

# Save configuration
API_GATEWAY_CONFIG_FILE="$SCRIPT_DIR/../generated/api-gateway-config.json"
cat > "$API_GATEWAY_CONFIG_FILE" << EOF
{
    "apiId": "$API_ID",
    "apiEndpoint": "$FINAL_API_URL",
    "authorizerId": "$AUTHORIZER_ID",
    "logGroupName": "$LOG_GROUP_NAME",
    "region": "$AWS_REGION",
    "stageName": "$API_GATEWAY_STAGE"
}
EOF

print_success "Configuration saved to: $API_GATEWAY_CONFIG_FILE"

echo ""
echo "Next: Run Phase 5 to deploy Lambda functions and connect to routes."
