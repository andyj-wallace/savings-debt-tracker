#!/bin/bash

# Story 2.3: S3 Bucket Policy for CloudFront - Verification Script
# This script verifies that:
# 1. Direct S3 URL returns 403 Forbidden
# 2. CloudFront URL serves content successfully

set -e

BUCKET="debt-tracker-frontend-345482189946"
REGION="us-east-2"
S3_URL="https://${BUCKET}.s3.${REGION}.amazonaws.com/index.html"
CLOUDFRONT_URL="https://d2w2q49vvlxbof.cloudfront.net/"

echo "========================================"
echo "Story 2.3 Verification: S3 + CloudFront"
echo "========================================"
echo ""

# Test 1: Direct S3 access should return 403
echo "Test 1: Direct S3 URL should return 403 Forbidden"
echo "URL: $S3_URL"
echo ""

S3_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$S3_URL")

if [ "$S3_STATUS" = "403" ]; then
    echo "✓ PASS: Direct S3 access returned $S3_STATUS (403 Forbidden)"
else
    echo "✗ FAIL: Direct S3 access returned $S3_STATUS (expected 403)"
fi

echo ""
echo "----------------------------------------"
echo ""

# Test 2: CloudFront URL should return 200
echo "Test 2: CloudFront URL should serve content (200 OK)"
echo "URL: $CLOUDFRONT_URL"
echo ""

CF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CLOUDFRONT_URL")

if [ "$CF_STATUS" = "200" ]; then
    echo "✓ PASS: CloudFront returned $CF_STATUS (200 OK)"
else
    echo "✗ FAIL: CloudFront returned $CF_STATUS (expected 200)"
fi

echo ""
echo "========================================"
echo "Verification Complete"
echo "========================================"

# Summary
echo ""
if [ "$S3_STATUS" = "403" ] && [ "$CF_STATUS" = "200" ]; then
    echo "All tests passed! Story 2.3 acceptance criteria verified."
    exit 0
else
    echo "Some tests failed. Please review the results above."
    exit 1
fi
