#!/bin/bash
#===============================================================================
# Phase 2: Frontend Hosting (S3 + CloudFront)
# Script 03: Setup S3 Bucket Policy for CloudFront
#
# Story 2.3: S3 Bucket Policy for CloudFront
# Applies the bucket policy that:
#   - Allows only CloudFront OAC to access the bucket
#   - Direct S3 URL access returns 403 Forbidden
#
# Prerequisites:
#   - Run 01-setup-s3.sh first
#   - Run 02-setup-cloudfront.sh first
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 2: Setup S3 Bucket Policy for CloudFront"

#-------------------------------------------------------------------------------
# Step 1: Load CloudFront Configuration
#-------------------------------------------------------------------------------
print_step "Loading CloudFront configuration..."

CLOUDFRONT_CONFIG_FILE="$SCRIPT_DIR/../generated/cloudfront-config.json"

if [ ! -f "$CLOUDFRONT_CONFIG_FILE" ]; then
    print_error "CloudFront configuration not found. Run 02-setup-cloudfront.sh first."
    exit 1
fi

DISTRIBUTION_ID=$(jq -r '.distributionId' "$CLOUDFRONT_CONFIG_FILE")
DISTRIBUTION_DOMAIN=$(jq -r '.distributionDomain' "$CLOUDFRONT_CONFIG_FILE")

print_success "Loaded configuration"
echo "      Distribution ID: $DISTRIBUTION_ID"
echo "      Domain: $DISTRIBUTION_DOMAIN"

#-------------------------------------------------------------------------------
# Step 2: Create and Apply Bucket Policy
#-------------------------------------------------------------------------------
print_step "Applying bucket policy for CloudFront access..."

# Create the bucket policy
BUCKET_POLICY=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$S3_BUCKET_NAME/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::$AWS_ACCOUNT_ID:distribution/$DISTRIBUTION_ID"
                }
            }
        }
    ]
}
EOF
)

# Apply the bucket policy
aws s3api put-bucket-policy \
    --bucket "$S3_BUCKET_NAME" \
    --policy "$BUCKET_POLICY"

print_success "Bucket policy applied"

#-------------------------------------------------------------------------------
# Step 3: Verify Configuration
#-------------------------------------------------------------------------------
print_step "Verifying bucket policy..."

# Get the current policy to confirm
CURRENT_POLICY=$(aws s3api get-bucket-policy --bucket "$S3_BUCKET_NAME" --query 'Policy' --output text 2>/dev/null | jq '.')

if echo "$CURRENT_POLICY" | jq -e '.Statement[] | select(.Sid=="AllowCloudFrontServicePrincipal")' >/dev/null 2>&1; then
    print_success "Bucket policy verified"
else
    print_error "Bucket policy verification failed"
    exit 1
fi

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "S3 Bucket Policy Setup Complete"

echo "Policy Configuration:"
echo "  Bucket:          $S3_BUCKET_NAME"
echo "  Allowed Access:  CloudFront distribution $DISTRIBUTION_ID only"
echo "  Action:          s3:GetObject"
echo ""
echo "Access Control:"
echo "  - Direct S3 URL:    Returns 403 Forbidden"
echo "  - CloudFront URL:   Serves content"
echo ""
echo "URLs:"
echo "  CloudFront:  https://$DISTRIBUTION_DOMAIN"
echo "  S3 (blocked): https://$S3_BUCKET_NAME.s3.$AWS_REGION.amazonaws.com"
echo ""
echo "Run scripts/verify-s3-cloudfront.sh to test access control."
