#!/bin/bash
#===============================================================================
# Phase 5: Lambda Service Layer
# Script 03: Integrate API Gateway with Lambda Functions
#
# Story 4.2/5.x: Connect API Gateway routes to Lambda functions
# Creates integrations between API Gateway routes and Lambda handlers.
#
# Prerequisites:
#   - API Gateway created (scripts/setup-api-gateway.sh)
#   - Lambda functions deployed (phase5/02-deploy-lambdas.sh)
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 5: Integrate API Gateway with Lambda"

#-------------------------------------------------------------------------------
# Verify Prerequisites
#-------------------------------------------------------------------------------
print_step "Verifying prerequisites..."

# Check for API Gateway ID
if [ -z "$API_GATEWAY_ID" ]; then
    print_error "API Gateway ID not found"
    print_info "Run setup-api-gateway.sh first"
    exit 1
fi

# Check for Lambda config
LAMBDA_CONFIG_FILE="$SCRIPT_DIR/../lambda-config.json"
if [ ! -f "$LAMBDA_CONFIG_FILE" ]; then
    print_error "Lambda config not found: $LAMBDA_CONFIG_FILE"
    print_info "Run phase5/02-deploy-lambdas.sh first"
    exit 1
fi

print_success "Prerequisites verified"
echo "  API Gateway ID: $API_GATEWAY_ID"
echo "  Lambda Config: $LAMBDA_CONFIG_FILE"

#-------------------------------------------------------------------------------
# Function to create Lambda integration and route
#-------------------------------------------------------------------------------
create_integration() {
    local ROUTE_KEY="$1"        # e.g., "POST /trackers"
    local FUNCTION_NAME="$2"    # e.g., "debt-tracker-create-tracker"

    print_step "Creating integration: $ROUTE_KEY -> $FUNCTION_NAME"

    # Get Lambda ARN from config
    local FUNCTION_ARN=$(jq -r ".functions[\"$FUNCTION_NAME\"]" "$LAMBDA_CONFIG_FILE")

    if [ -z "$FUNCTION_ARN" ] || [ "$FUNCTION_ARN" = "null" ]; then
        print_error "Function ARN not found for: $FUNCTION_NAME"
        return 1
    fi

    # Check if integration already exists for this route
    local EXISTING_ROUTE_ID=$(aws apigatewayv2 get-routes \
        --api-id "$API_GATEWAY_ID" \
        --region "$AWS_REGION" \
        --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId" \
        --output text 2>/dev/null)

    local INTEGRATION_ID=""

    if [ -n "$EXISTING_ROUTE_ID" ] && [ "$EXISTING_ROUTE_ID" != "None" ]; then
        # Get existing integration ID
        INTEGRATION_ID=$(aws apigatewayv2 get-route \
            --api-id "$API_GATEWAY_ID" \
            --route-id "$EXISTING_ROUTE_ID" \
            --region "$AWS_REGION" \
            --query "Target" \
            --output text 2>/dev/null | sed 's|integrations/||')

        if [ -n "$INTEGRATION_ID" ] && [ "$INTEGRATION_ID" != "None" ]; then
            # Update existing integration
            aws apigatewayv2 update-integration \
                --api-id "$API_GATEWAY_ID" \
                --integration-id "$INTEGRATION_ID" \
                --integration-uri "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${FUNCTION_ARN}/invocations" \
                --region "$AWS_REGION" \
                >/dev/null

            print_info "Updated existing integration"
        fi
    fi

    if [ -z "$INTEGRATION_ID" ] || [ "$INTEGRATION_ID" = "None" ]; then
        # Create new integration
        INTEGRATION_ID=$(aws apigatewayv2 create-integration \
            --api-id "$API_GATEWAY_ID" \
            --integration-type AWS_PROXY \
            --integration-uri "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${FUNCTION_ARN}/invocations" \
            --payload-format-version "2.0" \
            --region "$AWS_REGION" \
            --query "IntegrationId" \
            --output text)

        print_info "Created new integration: $INTEGRATION_ID"
    fi

    # Create or update route with authorizer
    if [ -n "$EXISTING_ROUTE_ID" ] && [ "$EXISTING_ROUTE_ID" != "None" ]; then
        # Get authorizer ID
        local AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers \
            --api-id "$API_GATEWAY_ID" \
            --region "$AWS_REGION" \
            --query "Items[0].AuthorizerId" \
            --output text 2>/dev/null)

        aws apigatewayv2 update-route \
            --api-id "$API_GATEWAY_ID" \
            --route-id "$EXISTING_ROUTE_ID" \
            --target "integrations/$INTEGRATION_ID" \
            --authorization-type JWT \
            --authorizer-id "$AUTHORIZER_ID" \
            --region "$AWS_REGION" \
            >/dev/null

        print_success "Updated route: $ROUTE_KEY"
    else
        # Get authorizer ID
        local AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers \
            --api-id "$API_GATEWAY_ID" \
            --region "$AWS_REGION" \
            --query "Items[0].AuthorizerId" \
            --output text 2>/dev/null)

        aws apigatewayv2 create-route \
            --api-id "$API_GATEWAY_ID" \
            --route-key "$ROUTE_KEY" \
            --target "integrations/$INTEGRATION_ID" \
            --authorization-type JWT \
            --authorizer-id "$AUTHORIZER_ID" \
            --region "$AWS_REGION" \
            >/dev/null

        print_success "Created route: $ROUTE_KEY"
    fi

    # Grant API Gateway permission to invoke Lambda
    # Remove existing permission first (ignore errors if it doesn't exist)
    local STATEMENT_ID="${FUNCTION_NAME}-apigw-$(echo "$ROUTE_KEY" | tr ' /' '--')"

    aws lambda remove-permission \
        --function-name "$FUNCTION_NAME" \
        --statement-id "$STATEMENT_ID" \
        --region "$AWS_REGION" 2>/dev/null || true

    aws lambda add-permission \
        --function-name "$FUNCTION_NAME" \
        --statement-id "$STATEMENT_ID" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_GATEWAY_ID}/*/*" \
        --region "$AWS_REGION" \
        >/dev/null

    print_success "Lambda permission granted"
}

#-------------------------------------------------------------------------------
# Create All Integrations
#-------------------------------------------------------------------------------

# Tracker routes
create_integration "POST /trackers" "${PROJECT_NAME}-create-tracker"
create_integration "GET /trackers" "${PROJECT_NAME}-list-trackers"
create_integration "GET /trackers/{id}" "${PROJECT_NAME}-get-tracker"
create_integration "PUT /trackers/{id}" "${PROJECT_NAME}-update-tracker"
create_integration "DELETE /trackers/{id}" "${PROJECT_NAME}-delete-tracker"

# Entry routes
create_integration "POST /trackers/{id}/entries" "${PROJECT_NAME}-create-entry"
create_integration "GET /trackers/{id}/entries" "${PROJECT_NAME}-list-entries"

#-------------------------------------------------------------------------------
# Deploy API Gateway Stage
#-------------------------------------------------------------------------------
print_step "Deploying API Gateway stage..."

# Create a new deployment
DEPLOYMENT_ID=$(aws apigatewayv2 create-deployment \
    --api-id "$API_GATEWAY_ID" \
    --region "$AWS_REGION" \
    --query "DeploymentId" \
    --output text)

print_success "API deployed: $DEPLOYMENT_ID"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "API Gateway Integration Complete"

echo "Routes Configured:"
echo "  POST   /trackers              -> ${PROJECT_NAME}-create-tracker"
echo "  GET    /trackers              -> ${PROJECT_NAME}-list-trackers"
echo "  GET    /trackers/{id}         -> ${PROJECT_NAME}-get-tracker"
echo "  PUT    /trackers/{id}         -> ${PROJECT_NAME}-update-tracker"
echo "  DELETE /trackers/{id}         -> ${PROJECT_NAME}-delete-tracker"
echo "  POST   /trackers/{id}/entries -> ${PROJECT_NAME}-create-entry"
echo "  GET    /trackers/{id}/entries -> ${PROJECT_NAME}-list-entries"
echo ""
echo "API Endpoint: $API_GATEWAY_ENDPOINT"
echo ""
echo "All routes require JWT authentication."
echo ""
echo "Test with:"
echo "  curl -H \"Authorization: Bearer \$TOKEN\" $API_GATEWAY_ENDPOINT/trackers"
