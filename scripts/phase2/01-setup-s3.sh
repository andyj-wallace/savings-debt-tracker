#!/bin/bash
#===============================================================================
# Phase 2: Frontend Hosting (S3 + CloudFront)
# Script 01: Setup S3 Bucket
#
# Story 2.1: S3 Bucket for Static Hosting
# Creates an S3 bucket configured for static website hosting with:
#   - Public access blocked (CloudFront will serve content)
#   - Versioning enabled
#   - Encryption enabled
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 2: Setup S3 Bucket for Static Hosting"

#-------------------------------------------------------------------------------
# Step 1: Create S3 Bucket
#-------------------------------------------------------------------------------
print_step "Creating S3 bucket: $S3_BUCKET_NAME"

# Check if bucket already exists
if aws s3api head-bucket --bucket "$S3_BUCKET_NAME" 2>/dev/null; then
    print_info "Bucket already exists: $S3_BUCKET_NAME"
else
    # Create bucket (note: us-east-1 doesn't need LocationConstraint)
    if [ "$AWS_REGION" = "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket "$S3_BUCKET_NAME" \
            --region "$AWS_REGION"
    else
        aws s3api create-bucket \
            --bucket "$S3_BUCKET_NAME" \
            --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi

    print_success "Created bucket: $S3_BUCKET_NAME"
fi

#-------------------------------------------------------------------------------
# Step 2: Block Public Access
#-------------------------------------------------------------------------------
print_step "Blocking public access (CloudFront will serve content)..."

aws s3api put-public-access-block \
    --bucket "$S3_BUCKET_NAME" \
    --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
    }'

print_success "Public access blocked"

#-------------------------------------------------------------------------------
# Step 3: Enable Versioning
#-------------------------------------------------------------------------------
print_step "Enabling bucket versioning..."

aws s3api put-bucket-versioning \
    --bucket "$S3_BUCKET_NAME" \
    --versioning-configuration Status=Enabled

print_success "Versioning enabled"

#-------------------------------------------------------------------------------
# Step 4: Enable Server-Side Encryption
#-------------------------------------------------------------------------------
print_step "Enabling server-side encryption (AES-256)..."

aws s3api put-bucket-encryption \
    --bucket "$S3_BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": true
        }]
    }'

print_success "Server-side encryption enabled"

#-------------------------------------------------------------------------------
# Step 5: Add Bucket Tags
#-------------------------------------------------------------------------------
print_step "Adding bucket tags..."

aws s3api put-bucket-tagging \
    --bucket "$S3_BUCKET_NAME" \
    --tagging "TagSet=[{Key=Project,Value=$PROJECT_NAME},{Key=Phase,Value=2},{Key=Purpose,Value=frontend-hosting}]"

print_success "Tags added"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "S3 Bucket Setup Complete"

echo "Bucket Configuration:"
echo "  Name:        $S3_BUCKET_NAME"
echo "  Region:      $AWS_REGION"
echo "  Versioning:  Enabled"
echo "  Encryption:  AES-256 (SSE-S3)"
echo "  Public:      Blocked (CloudFront access only)"
echo ""
echo "Next: Run 02-setup-cloudfront.sh to create CloudFront distribution"

# Save bucket info
BUCKET_CONFIG_FILE="$SCRIPT_DIR/../generated/s3-config.json"
cat > "$BUCKET_CONFIG_FILE" << EOF
{
    "bucketName": "$S3_BUCKET_NAME",
    "bucketArn": "arn:aws:s3:::$S3_BUCKET_NAME",
    "region": "$AWS_REGION"
}
EOF

print_success "Configuration saved to: $BUCKET_CONFIG_FILE"
