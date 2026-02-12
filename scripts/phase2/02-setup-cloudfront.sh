#!/bin/bash
#===============================================================================
# Phase 2: Frontend Hosting (S3 + CloudFront)
# Script 02: Setup CloudFront Distribution
#
# Story 2.2: CloudFront Distribution Setup
# Creates a CloudFront distribution with:
#   - Origin Access Control (OAC) for S3
#   - HTTPS enforcement (redirect HTTP to HTTPS)
#   - SPA routing (404 -> index.html)
#   - Default root object: index.html
#
# Note: CloudFront deployment takes 5-15 minutes. Script will wait.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

print_header "Phase 2: Setup CloudFront Distribution"

# CloudFront configuration
OAC_NAME="${PROJECT_NAME}-s3-oac"
CLOUDFRONT_COMMENT="$PROJECT_NAME frontend distribution"

#-------------------------------------------------------------------------------
# Step 1: Create Origin Access Control (OAC)
#-------------------------------------------------------------------------------
print_step "Creating Origin Access Control..."

# Check if OAC already exists
EXISTING_OAC=$(aws cloudfront list-origin-access-controls \
    --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_OAC" ] && [ "$EXISTING_OAC" != "None" ]; then
    OAC_ID="$EXISTING_OAC"
    print_info "OAC already exists: $OAC_ID"
else
    OAC_RESPONSE=$(aws cloudfront create-origin-access-control \
        --origin-access-control-config "{
            \"Name\": \"$OAC_NAME\",
            \"Description\": \"OAC for $PROJECT_NAME S3 bucket\",
            \"SigningProtocol\": \"sigv4\",
            \"SigningBehavior\": \"always\",
            \"OriginAccessControlOriginType\": \"s3\"
        }" \
        --output json)

    OAC_ID=$(echo "$OAC_RESPONSE" | jq -r '.OriginAccessControl.Id')
    print_success "Created OAC: $OAC_ID"
fi

#-------------------------------------------------------------------------------
# Step 2: Check for Existing Distribution
#-------------------------------------------------------------------------------
print_step "Checking for existing CloudFront distribution..."

# Look for existing distribution pointing to our S3 bucket
S3_ORIGIN_DOMAIN="${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com"

EXISTING_DIST=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[?DomainName=='$S3_ORIGIN_DOMAIN']].Id" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DIST" ] && [ "$EXISTING_DIST" != "None" ]; then
    DISTRIBUTION_ID="$EXISTING_DIST"
    print_info "Distribution already exists: $DISTRIBUTION_ID"

    # Get distribution domain
    DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution \
        --id "$DISTRIBUTION_ID" \
        --query "Distribution.DomainName" \
        --output text)
else
    #-------------------------------------------------------------------------------
    # Step 3: Create CloudFront Distribution
    #-------------------------------------------------------------------------------
    print_step "Creating CloudFront distribution..."
    print_info "This will take 5-15 minutes to deploy globally..."

    # Create distribution configuration
    DIST_CONFIG=$(cat <<EOF
{
    "CallerReference": "$PROJECT_NAME-$(date +%s)",
    "Comment": "$CLOUDFRONT_COMMENT",
    "Enabled": true,
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [{
            "Id": "S3-$S3_BUCKET_NAME",
            "DomainName": "$S3_ORIGIN_DOMAIN",
            "OriginAccessControlId": "$OAC_ID",
            "S3OriginConfig": {
                "OriginAccessIdentity": ""
            }
        }]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$S3_BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"]
            }
        },
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "Compress": true
    },
    "CustomErrorResponses": {
        "Quantity": 2,
        "Items": [
            {
                "ErrorCode": 403,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 10
            },
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 10
            }
        ]
    },
    "PriceClass": "PriceClass_100",
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true,
        "MinimumProtocolVersion": "TLSv1.2_2021"
    },
    "HttpVersion": "http2"
}
EOF
)

    DIST_RESPONSE=$(aws cloudfront create-distribution \
        --distribution-config "$DIST_CONFIG" \
        --output json)

    DISTRIBUTION_ID=$(echo "$DIST_RESPONSE" | jq -r '.Distribution.Id')
    DISTRIBUTION_DOMAIN=$(echo "$DIST_RESPONSE" | jq -r '.Distribution.DomainName')

    print_success "Created distribution: $DISTRIBUTION_ID"
    print_info "Domain: $DISTRIBUTION_DOMAIN"

    # Wait for deployment
    print_step "Waiting for CloudFront to deploy (this takes 5-15 minutes)..."
    aws cloudfront wait distribution-deployed --id "$DISTRIBUTION_ID"
    print_success "Distribution deployed successfully!"
fi

#-------------------------------------------------------------------------------
# Step 4: Output S3 Bucket Policy for CloudFront
#-------------------------------------------------------------------------------
print_step "Generating S3 bucket policy for CloudFront access..."

# The bucket policy needed for CloudFront OAC
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

# Save bucket policy to file for next script
POLICY_FILE="$SCRIPT_DIR/../generated/cloudfront-bucket-policy.json"
echo "$BUCKET_POLICY" > "$POLICY_FILE"
print_success "Bucket policy saved to: $POLICY_FILE"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "CloudFront Distribution Setup Complete"

echo "CloudFront Configuration:"
echo "  Distribution ID:  $DISTRIBUTION_ID"
echo "  Domain Name:      $DISTRIBUTION_DOMAIN"
echo "  CloudFront URL:   https://$DISTRIBUTION_DOMAIN"
echo "  OAC ID:           $OAC_ID"
echo ""
echo "Settings:"
echo "  - HTTPS enforced (HTTP redirects to HTTPS)"
echo "  - SPA routing enabled (404/403 -> index.html)"
echo "  - HTTP/2 enabled"
echo "  - Compression enabled"
echo "  - TLS 1.2 minimum"
echo ""
echo "Next: Run 03-setup-bucket-policy.sh to allow CloudFront access to S3"

# Save CloudFront config
CLOUDFRONT_CONFIG_FILE="$SCRIPT_DIR/../generated/cloudfront-config.json"
cat > "$CLOUDFRONT_CONFIG_FILE" << EOF
{
    "distributionId": "$DISTRIBUTION_ID",
    "distributionDomain": "$DISTRIBUTION_DOMAIN",
    "cloudFrontUrl": "https://$DISTRIBUTION_DOMAIN",
    "oacId": "$OAC_ID"
}
EOF

print_success "Configuration saved to: $CLOUDFRONT_CONFIG_FILE"
