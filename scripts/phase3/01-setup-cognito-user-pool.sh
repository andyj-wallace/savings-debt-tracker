#!/bin/bash
#===============================================================================
# Phase 3: Cognito Authentication
# Script 01: Setup Cognito User Pool
#
# Story 3.1: Cognito User Pool Creation
# Creates a Cognito User Pool with:
#   - Email as username (also allows preferred_username)
#   - Email verification enabled
#   - Password policy (min 8 chars, mixed case, numbers, symbols)
#   - Self-registration enabled
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 3: Setup Cognito User Pool"

#-------------------------------------------------------------------------------
# Step 1: Check for Existing User Pool
#-------------------------------------------------------------------------------
print_step "Checking for existing User Pool..."

# Look for existing user pool by name
EXISTING_POOL=$(aws cognito-idp list-user-pools \
    --max-results 60 \
    --region "$AWS_REGION" \
    --query "UserPools[?Name=='$COGNITO_USER_POOL_NAME'].Id" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_POOL" ] && [ "$EXISTING_POOL" != "None" ]; then
    USER_POOL_ID="$EXISTING_POOL"
    print_info "User Pool already exists: $USER_POOL_ID"
else
    #-------------------------------------------------------------------------------
    # Step 2: Create User Pool
    #-------------------------------------------------------------------------------
    print_step "Creating Cognito User Pool..."

    USER_POOL_RESPONSE=$(aws cognito-idp create-user-pool \
        --pool-name "$COGNITO_USER_POOL_NAME" \
        --region "$AWS_REGION" \
        --auto-verified-attributes email \
        --username-attributes email \
        --username-configuration '{"CaseSensitive": false}' \
        --policies '{
            "PasswordPolicy": {
                "MinimumLength": 8,
                "RequireUppercase": true,
                "RequireLowercase": true,
                "RequireNumbers": true,
                "RequireSymbols": true,
                "TemporaryPasswordValidityDays": 7
            }
        }' \
        --schema '[
            {
                "Name": "email",
                "AttributeDataType": "String",
                "Required": true,
                "Mutable": true
            },
            {
                "Name": "name",
                "AttributeDataType": "String",
                "Required": false,
                "Mutable": true
            }
        ]' \
        --account-recovery-setting '{
            "RecoveryMechanisms": [
                {
                    "Priority": 1,
                    "Name": "verified_email"
                }
            ]
        }' \
        --admin-create-user-config '{
            "AllowAdminCreateUserOnly": false
        }' \
        --user-pool-tags "Project=$PROJECT_NAME,Phase=3" \
        --output json)

    USER_POOL_ID=$(echo "$USER_POOL_RESPONSE" | jq -r '.UserPool.Id')
    print_success "Created User Pool: $USER_POOL_ID"
fi

#-------------------------------------------------------------------------------
# Step 3: Get User Pool Details
#-------------------------------------------------------------------------------
print_step "Getting User Pool details..."

USER_POOL_DETAILS=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$USER_POOL_ID" \
    --region "$AWS_REGION" \
    --output json)

USER_POOL_ARN=$(echo "$USER_POOL_DETAILS" | jq -r '.UserPool.Arn')
USER_POOL_CREATED=$(echo "$USER_POOL_DETAILS" | jq -r '.UserPool.CreationDate')

print_success "User Pool Details Retrieved"
echo "      ID:  $USER_POOL_ID"
echo "      ARN: $USER_POOL_ARN"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "Cognito User Pool Setup Complete"

echo "User Pool Configuration:"
echo "  Name:              $COGNITO_USER_POOL_NAME"
echo "  ID:                $USER_POOL_ID"
echo "  ARN:               $USER_POOL_ARN"
echo "  Region:            $AWS_REGION"
echo ""
echo "Settings:"
echo "  - Username:        Email address"
echo "  - Email verified:  Required"
echo "  - Self-signup:     Enabled"
echo "  - Password policy: Min 8 chars, mixed case, numbers, symbols"
echo "  - Account recovery: Via verified email"
echo ""
echo "Next: Run 02-setup-cognito-app-client.sh to create the App Client"

# Save User Pool config
COGNITO_CONFIG_FILE="$SCRIPT_DIR/../generated/cognito-config.json"
cat > "$COGNITO_CONFIG_FILE" << EOF
{
    "userPoolId": "$USER_POOL_ID",
    "userPoolArn": "$USER_POOL_ARN",
    "userPoolName": "$COGNITO_USER_POOL_NAME",
    "region": "$AWS_REGION"
}
EOF

print_success "Configuration saved to: $COGNITO_CONFIG_FILE"
