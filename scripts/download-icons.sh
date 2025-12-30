#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Function to extract file extension from URL
get_extension() {
    local url="$1"
    # Remove query strings and get the last path component
    local filename=$(echo "$url" | sed 's/[?#].*$//' | sed 's|.*/||')
    # Extract extension
    local ext=$(echo "$filename" | sed 's/.*\.//' | tr '[:upper:]' '[:lower:]')
    # Default to png if no extension found
    if [[ -z "$ext" ]] || [[ "$ext" == "$filename" ]]; then
        ext="png"
    fi
    echo "$ext"
}

# Function to download icon
download_icon() {
    local file_path="$1"
    local icon_url="$2"
    local target_dir=$(dirname "$file_path")
    local ext=$(get_extension "$icon_url")
    local target_file="$target_dir/icon.$ext"

    echo "Downloading $icon_url -> $target_file"

    # Download the file
    if wget -q --no-check-certificate -O "$target_file" "$icon_url"; then
        echo "  ✓ Successfully downloaded to $target_file"
    else
        echo "  ✗ Failed to download $icon_url"
        return 1
    fi
}

# Process authentik blueprints
echo "Processing authentik blueprints..."
find flux/manifests -name "*authentik-blueprint.yaml" | while read -r blueprint_file; do
    # Extract icon URL from blueprint
    icon_url=$(grep -E "^\s+icon:" "$blueprint_file" | head -1 | awk -F'"' '{print $2}' | tr -d '"' || true)

    if [[ -n "$icon_url" ]]; then
        download_icon "$blueprint_file" "$icon_url" || true
    fi
done

# Process HelmReleases using generic-app chart with authentik enabled
echo ""
echo "Processing HelmReleases with authentik enabled..."
find flux/manifests -name "*helmrelease.yaml" -path "*/04-apps/*" | while read -r helmrelease_file; do
    # Check if it uses generic-app chart
    if ! grep -q "chart:.*generic-app" "$helmrelease_file"; then
        continue
    fi

    # Check if authentik is enabled
    authentik_section=$(grep -A 20 "authentik:" "$helmrelease_file" | grep -m 1 "enabled: true" || true)
    if [[ -z "$authentik_section" ]]; then
        continue
    fi

    # Extract icon URL from authentik section
    icon_url=$(grep -A 10 "authentik:" "$helmrelease_file" | grep -E "^\s+icon:" | head -1 | awk -F'"' '{print $2}' | tr -d '"' || true)

    if [[ -n "$icon_url" ]]; then
        download_icon "$helmrelease_file" "$icon_url" || true
    fi
done

echo ""
echo "Done!"
