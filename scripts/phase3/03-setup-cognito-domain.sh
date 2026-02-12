#!/bin/bash
#===============================================================================
# Phase 3: Cognito Authentication
# Script 03: Setup Cognito Domain (Hosted UI)
#
# Story 3.3: Cognito Hosted UI Setup
# Configures the Hosted UI domain for:
#   - Sign-up and sign-in flows
#   - Password reset flow
#   - OAuth redirects
#
# Prerequisites:
#   - Run 01-setup-cognito-user-pool.sh first
#   - Run 02-setup-cognito-app-client.sh first
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 3: Setup Cognito Domain (Hosted UI)"

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
CLIENT_ID=$(jq -r '.clientId' "$COGNITO_CONFIG_FILE")

if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ]; then
    print_error "Client ID not found. Run 02-setup-cognito-app-client.sh first."
    exit 1
fi

print_success "Loaded configuration"
echo "      User Pool: $USER_POOL_ID"
echo "      Client ID: $CLIENT_ID"

#-------------------------------------------------------------------------------
# Step 2: Check for Existing Domain
#-------------------------------------------------------------------------------
print_step "Checking for existing Cognito domain..."

EXISTING_DOMAIN=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$USER_POOL_ID" \
    --region "$AWS_REGION" \
    --query 'UserPool.Domain' \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DOMAIN" ] && [ "$EXISTING_DOMAIN" != "None" ]; then
    DOMAIN_PREFIX="$EXISTING_DOMAIN"
    print_info "Domain already configured: $DOMAIN_PREFIX"
else
    #-------------------------------------------------------------------------------
    # Step 3: Create Cognito Domain
    #-------------------------------------------------------------------------------
    print_step "Creating Cognito domain..."

    # Use preferred domain prefix (from input config)
    DOMAIN_PREFIX="${COGNITO_DOMAIN_PREFIX_PREFERRED}"

    # Try to create the domain
    if aws cognito-idp create-user-pool-domain \
        --domain "$DOMAIN_PREFIX" \
        --user-pool-id "$USER_POOL_ID" \
        --region "$AWS_REGION" 2>/dev/null; then
        print_success "Created domain: $DOMAIN_PREFIX"
    else
        # If domain taken, try with timestamp suffix
        DOMAIN_PREFIX="${PROJECT_NAME}-$(date +%s)"
        aws cognito-idp create-user-pool-domain \
            --domain "$DOMAIN_PREFIX" \
            --user-pool-id "$USER_POOL_ID" \
            --region "$AWS_REGION"
        print_success "Created domain: $DOMAIN_PREFIX"
    fi
fi

#-------------------------------------------------------------------------------
# Step 4: Generate Hosted UI URLs
#-------------------------------------------------------------------------------
COGNITO_HOSTED_DOMAIN="${DOMAIN_PREFIX}.auth.${AWS_REGION}.amazoncognito.com"

# Login URL for localhost development
LOGIN_URL_DEV="https://${COGNITO_HOSTED_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=email+openid+phone&redirect_uri=http://localhost:3000/callback"

# Login URL for production
LOGIN_URL_PROD="https://${COGNITO_HOSTED_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=email+openid+phone&redirect_uri=${CLOUDFRONT_URL}/"

# Logout URL for localhost
LOGOUT_URL_DEV="https://${COGNITO_HOSTED_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=http://localhost:3000/logout"

# Logout URL for production
LOGOUT_URL_PROD="https://${COGNITO_HOSTED_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${CLOUDFRONT_URL}/logout"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "Cognito Domain Setup Complete"

echo "Hosted UI Configuration:"
echo "  Domain Prefix:  $DOMAIN_PREFIX"
echo "  Full Domain:    $COGNITO_HOSTED_DOMAIN"
echo ""
echo "Hosted UI URLs:"
echo ""
echo "Development (localhost:3000):"
echo "  Login:  $LOGIN_URL_DEV"
echo ""
echo "  Logout: $LOGOUT_URL_DEV"
echo ""
echo "Production (CloudFront):"
echo "  Login:  $LOGIN_URL_PROD"
echo ""
echo "  Logout: $LOGOUT_URL_PROD"
echo ""
echo "OIDC Discovery URL:"
echo "  https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/openid-configuration"
echo ""
echo "Frontend Configuration (for auth.config.ts):"
echo "  User Pool ID:    $USER_POOL_ID"
echo "  Client ID:       $CLIENT_ID"
echo "  Cognito Domain:  $COGNITO_HOSTED_DOMAIN"

# Update Cognito config with domain info
jq --arg domain "$DOMAIN_PREFIX" --arg hostedDomain "$COGNITO_HOSTED_DOMAIN" \
    '. + {domainPrefix: $domain, hostedDomain: $hostedDomain}' \
    "$COGNITO_CONFIG_FILE" > "${COGNITO_CONFIG_FILE}.tmp" && \
    mv "${COGNITO_CONFIG_FILE}.tmp" "$COGNITO_CONFIG_FILE"

print_success "Configuration updated: $COGNITO_CONFIG_FILE"

#-------------------------------------------------------------------------------
# Test Hosted UI Accessibility
#-------------------------------------------------------------------------------
print_step "Testing Hosted UI accessibility..."

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${COGNITO_HOSTED_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=email&redirect_uri=http://localhost:3000/callback" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
    print_success "Hosted UI is accessible (HTTP $HTTP_STATUS)"
else
    print_info "Hosted UI check returned HTTP $HTTP_STATUS (may take a moment to propagate)"
fi

echo ""
echo "Phase 3: Cognito Authentication setup complete!"
echo "Test the login flow by visiting the Login URL above."
