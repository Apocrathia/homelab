#!/bin/bash

# Exit on error
set -e

# Check if RENOVATE_TOKEN is set
if [ -z "$RENOVATE_TOKEN" ]; then
    echo "Error: RENOVATE_TOKEN environment variable is not set"
    echo "Please set it with: export RENOVATE_TOKEN='your-token'"
    exit 1
fi

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN environment variable is not set"
    echo "Please set it with: export GITHUB_TOKEN='your-token'"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Run renovate with the same configuration as before and save logs
RENOVATE_CONFIG_FILE=renovate.json \
RENOVATE_AUTODISCOVER=true \
RENOVATE_ONBOARDING=false \
RENOVATE_PLATFORM=local \
LOG_LEVEL=debug \
renovate 2>&1 | tee logs/renovate-$(date +%Y%m%d-%H%M%S).log
