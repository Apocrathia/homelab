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

# Check if renovate.json exists in the current directory
if [ ! -f "renovate.json" ]; then
    echo "Error: renovate.json file not found in the current directory."
    echo "Please run this script from the directory containing renovate.json."
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p scripts/logs

# Run renovate against local files and save logs
RENOVATE_CONFIG_FILE=renovate.json \
RENOVATE_PLATFORM=local \
RENOVATE_REPOSITORIES=null \
LOG_LEVEL=debug \
renovate 2>&1 | tee scripts/logs/renovate-$(date +%Y%m%d-%H%M%S).log
