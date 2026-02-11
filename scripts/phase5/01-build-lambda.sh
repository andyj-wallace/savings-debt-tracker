#!/bin/bash
#===============================================================================
# Phase 5: Lambda Service Layer
# Script 01: Build Lambda Functions
#
# Story 5.10: Lambda Deployment Package
# Builds and packages Lambda function code for deployment.
#
# Output:
#   - lambda/dist/ - Compiled TypeScript
#   - lambda/deployment.zip - Deployment package
#
# Note: This script is idempotent - safe to run multiple times.
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

LAMBDA_DIR="$SCRIPT_DIR/../../lambda"

print_header "Phase 5: Build Lambda Functions"

#-------------------------------------------------------------------------------
# Step 1: Verify Node.js and npm
#-------------------------------------------------------------------------------
print_step "Verifying Node.js installation..."

if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm version: $NPM_VERSION"

#-------------------------------------------------------------------------------
# Step 2: Install Dependencies
#-------------------------------------------------------------------------------
print_step "Installing Lambda dependencies..."

cd "$LAMBDA_DIR"

if [ ! -d "node_modules" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_info "Dependencies already installed, running npm ci for clean install..."
    npm ci
    print_success "Dependencies reinstalled"
fi

#-------------------------------------------------------------------------------
# Step 3: Build TypeScript
#-------------------------------------------------------------------------------
print_step "Compiling TypeScript..."

npm run clean 2>/dev/null || true
npm run build

print_success "TypeScript compiled to dist/"

#-------------------------------------------------------------------------------
# Step 4: Create Deployment Package
#-------------------------------------------------------------------------------
print_step "Creating deployment package..."

# Remove old deployment package if exists
rm -f deployment.zip

# Create deployment package with compiled code and production dependencies
cd "$LAMBDA_DIR"

# Create a temporary directory for the package
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy compiled code
cp -r dist/* "$TEMP_DIR/"

# Install production dependencies only
cp package.json package-lock.json "$TEMP_DIR/"
cd "$TEMP_DIR"
npm ci --production --silent

# Create zip file
zip -r -q "$LAMBDA_DIR/deployment.zip" .

cd "$LAMBDA_DIR"
PACKAGE_SIZE=$(du -h deployment.zip | cut -f1)

print_success "Deployment package created: deployment.zip ($PACKAGE_SIZE)"

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
print_header "Lambda Build Complete"

echo "Build Output:"
echo "  Compiled Code:      $LAMBDA_DIR/dist/"
echo "  Deployment Package: $LAMBDA_DIR/deployment.zip"
echo "  Package Size:       $PACKAGE_SIZE"
echo ""
echo "Handlers Available:"
echo "  - createTracker   (POST /trackers)"
echo "  - listTrackers    (GET /trackers)"
echo "  - getTracker      (GET /trackers/{id})"
echo "  - updateTracker   (PUT /trackers/{id})"
echo "  - deleteTracker   (DELETE /trackers/{id})"
echo "  - createEntry     (POST /trackers/{id}/entries)"
echo "  - listEntries     (GET /trackers/{id}/entries)"
echo ""
echo "Next: Run 02-deploy-lambdas.sh to deploy to AWS"
