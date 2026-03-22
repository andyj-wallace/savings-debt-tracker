#!/bin/bash
source "$(dirname "$0")/config.sh"
npm run build
aws s3 sync build/ "s3://${S3_BUCKET_NAME}" --delete
aws cloudfront create-invalidation --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" --paths "/*"