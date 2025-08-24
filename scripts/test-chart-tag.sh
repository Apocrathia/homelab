#!/bin/bash

# Test script for chart tag creation logic
# This simulates what the GitLab CI job does, but safely

set -e

echo "=== Chart Tag Creation Test Script ==="
echo "This script tests the tag creation logic without actually creating tags"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if we're in the right directory
if [ ! -f "helm/generic-app/Chart.yaml" ]; then
    print_status $RED "❌ ERROR: helm/generic-app/Chart.yaml not found!"
    print_status $RED "   Please run this script from the repository root"
    exit 1
fi

print_status $BLUE "📁 Found Chart.yaml at: helm/generic-app/Chart.yaml"

# Extract version from Chart.yaml
CHART_VERSION=$(grep '^version:' helm/generic-app/Chart.yaml | awk '{print $2}' | tr -d '"')

print_status $BLUE "🔍 Extracted version: $CHART_VERSION"

# Validate version format
if [[ ! $CHART_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_status $RED "❌ ERROR: Invalid version format: $CHART_VERSION"
    print_status $RED "   Expected format: x.y.z (e.g., 0.0.7)"
    exit 1
fi

print_status $GREEN "✅ Version format is valid"

TAG_NAME="generic-app-${CHART_VERSION}"
print_status $BLUE "🏷️  Tag name would be: $TAG_NAME"

# Check if tag already exists locally
if git tag -l | grep -q "^${TAG_NAME}$"; then
    print_status $YELLOW "⚠️  WARNING: Tag ${TAG_NAME} already exists locally!"
else
    print_status $GREEN "✅ Tag ${TAG_NAME} does not exist locally"
fi

# Check if tag exists on remote (if remote exists)
if git remote -v | grep -q origin; then
    if git ls-remote origin "refs/tags/${TAG_NAME}" 2>/dev/null | grep -q .; then
        print_status $YELLOW "⚠️  WARNING: Tag ${TAG_NAME} already exists on remote!"
    else
        print_status $GREEN "✅ Tag ${TAG_NAME} does not exist on remote"
    fi
else
    print_status $YELLOW "⚠️  No remote configured, skipping remote check"
fi

# Show what the tag message would look like
TAG_MESSAGE="Release generic-app chart version ${CHART_VERSION}

Automatically created by GitLab CI
Chart: helm/generic-app
Version: ${CHART_VERSION}
Commit: $(git rev-parse HEAD)
Pipeline: [CI_PIPELINE_URL]"

print_status $BLUE "📝 Tag message preview:"
echo "   $TAG_MESSAGE"
echo ""

# Show what commands would be executed
print_status $BLUE "🔧 Commands that would be executed:"
echo "   1. git tag -a \"${TAG_NAME}\" -m \"${TAG_MESSAGE}\""
echo "   2. git push origin \"${TAG_NAME}\""
echo ""

print_status $GREEN "✅ Test completed successfully!"
print_status $BLUE "💡 To actually create the tag, you can run:"
print_status $BLUE "   git tag -a \"${TAG_NAME}\" -m \"Release generic-app chart version ${CHART_VERSION}\""
print_status $BLUE "   git push origin \"${TAG_NAME}\""

echo ""
print_status $BLUE "🎯 Summary:"
echo "   - Chart version: $CHART_VERSION"
echo "   - Tag name: $TAG_NAME"
echo "   - Ready to create tag: $(if git tag -l | grep -q "^${TAG_NAME}$"; then echo 'No (already exists)'; else echo 'Yes'; fi)"

echo ""
print_status $BLUE "🔍 Validation Commands:"
echo "   # After CI creates tag, verify:"
echo "   git ls-remote origin | grep $TAG_NAME"
echo ""
echo "   # Test renovate detection:"
echo "   source secrets/renovate && ./scripts/run-renovate.sh"
echo ""
echo "   # Check renovate dashboard in GitLab UI"
