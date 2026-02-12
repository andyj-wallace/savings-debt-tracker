#!/bin/bash
#===============================================================================
# Phase 3: Cognito Authentication
# Script 02: Setup Cognito App Client
#
# Story 3.2: Cognito App Client Configuration
# Creates an App Client with:
#   - No client secret (public client for SPA)
#   - OAuth 2.0 Authorization Code Grant flow
#   - Callback URLs for localhost and production
#   - Token expiration settings
#
# Prerequisites:
#   - Run 01-setup-cognito-user-pool.sh first
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 3: Setup Cognito App Client"

#-------------------------------------------------------------------------------
# Step 1: Load User Pool Configuration
#-------------------------------------------------------------------------------
print_step "Loading User Pool configuration..."

COGNITO_CONFIG_FILE="$SCRIPT_DIR/../generated/cognito-config.json"

if [ ! -f "$COGNITO_CONFIG_FILE" ]; then
    print_error "Cognito configuration not found. Run 01-setup-cognito-user-pool.sh first."
    exit 1
fi

USER_POOL_ID=$(jq -r '.userPoolId' "$COGNITO_CONFIG_FILE")

print_success "Loaded User Pool: $USER_POOL_ID"

#-------------------------------------------------------------------------------
# Step 2: Check for Existing App Client
#-------------------------------------------------------------------------------
print_step "Checking for existing App Client..."

EXISTING_CLIENT=$(aws cognito-idp list-user-pool-clients \
    --user-pool-id "$USER_POOL_ID" \
    --region "$AWS_REGION" \
    --query "UserPoolClients[?ClientName=='$COGNITO_CLIENT_NAME'].ClientId" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_CLIENT" ] && [ "$EXISTING_CLIENT" != "None" ]; then
    CLIENT_ID="$EXISTING_CLIENT"
    print_info "App Client already exists: $CLIENT_ID"
else
    #-------------------------------------------------------------------------------
    # Step 3: Create App Client
    #-------------------------------------------------------------------------------
    print_step "Creating App Client..."

    # Parse callback URLs into JSON array format
    IFS=',' read -ra CALLBACK_ARRAY <<< "$COGNITO_CALLBACK_URLS"
    CALLBACK_JSON=$(printf '%s\n' "${CALLBACK_ARRAY[@]}" | jq -R . | jq -s .)

    IFS=',' read -ra LOGOUT_ARRAY <<< "$COGNITO_LOGOUT_URLS"
    LOGOUT_JSON=$(printf '%s\n' "${LOGOUT_ARRAY[@]}" | jq -R . | jq -s .)

    CLIENT_RESPONSE=$(aws cognito-idp create-user-pool-client \
        --user-pool-id "$USER_POOL_ID" \
        --client-name "$COGNITO_CLIENT_NAME" \
        --region "$AWS_REGION" \
        --generate-secret false \
        --explicit-auth-flows "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_USER_SRP_AUTH" \
        --supported-identity-providers "COGNITO" \
        --callback-urls $CALLBACK_JSON \
        --logout-urls $LOGOUT_JSON \
        --allowed-o-auth-flows "code" \
        --allowed-o-auth-scopes "email" "openid" "phone" \
        --allowed-o-auth-flows-user-pool-client \
        --prevent-user-existence-errors "ENABLED" \
        --access-token-validity 1 \
        --id-token-validity 1 \
        --refresh-token-validity 30 \
        --token-validity-units '{
            "AccessToken": "hours",
            "IdToken": "hours",
            "RefreshToken": "days"
        }' \
        --output json)

    CLIENT_ID=$(echo "$CLIENT_RESPONSE" | jq -r '.UserPoolClient.ClientId')
    print_success "Created App Client: $CLIENT_ID"
fi

#-------------------------------------------------------------------------------
# Step 4: Get App Client Details
#-------------------------------------------------------------------------------
print_step "Getting App Client details..."

CLIENT_DETAILS=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$AWS_REGION" \
    --output json)

CLIENT_NAME=$(echo "$CLIENT_DETAILS" | jq -r '.UserPoolClient.ClientName')

print_success "App Client Details Retrieved"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "Cognito App Client Setup Complete"

echo "App Client Configuration:"
echo "  Name:         $CLIENT_NAME"
echo "  Client ID:    $CLIENT_ID"
echo "  User Pool:    $USER_POOL_ID"
echo ""
echo "OAuth Settings:"
echo "  Flow:         Authorization Code Grant"
echo "  Scopes:       email, openid, phone"
echo "  Client secret: None (public client)"
echo ""
echo "Callback URLs:"
IFS=',' read -ra URLS <<< "$COGNITO_CALLBACK_URLS"
for url in "${URLS[@]}"; do
    echo "  - $url"
done
echo ""
echo "Logout URLs:"
IFS=',' read -ra URLS <<< "$COGNITO_LOGOUT_URLS"
for url in "${URLS[@]}"; do
    echo "  - $url"
done
echo ""
echo "Token Validity:"
echo "  Access Token:  1 hour"
echo "  ID Token:      1 hour"
echo "  Refresh Token: 30 days"
echo ""
echo "Next: Run 03-setup-cognito-domain.sh to configure the Hosted UI domain"

# Update Cognito config with client info
jq --arg clientId "$CLIENT_ID" --arg clientName "$CLIENT_NAME" \
    '. + {clientId: $clientId, clientName: $clientName}' \
    "$COGNITO_CONFIG_FILE" > "${COGNITO_CONFIG_FILE}.tmp" && \
    mv "${COGNITO_CONFIG_FILE}.tmp" "$COGNITO_CONFIG_FILE"

print_success "Configuration updated: $COGNITO_CONFIG_FILE"
