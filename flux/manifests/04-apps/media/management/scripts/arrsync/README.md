# arrSync

Sync \*arr application file metadata and naming across Sonarr, Radarr, and Lidarr.

> **Navigation**: [← Back to Media README](../../../README.md)

## Purpose

After tdarr re-encodes media to x265/HEVC, the original filenames may not reflect the new codec. This causes Sonarr/Radarr to potentially attempt unnecessary "upgrades" since they don't recognize the file as HEVC. Lidarr is not affected by this issue, but we still want to run the script to ensure the filenames are correct.

arrSync triggers refresh and rename operations across all \*arr services to:

1. Rescan files to detect current codec information
2. Rename files according to the configured naming scheme

## Local Development

Set up the project using [uv](https://docs.astral.sh/uv/) for dependency management:

```bash
cd src

# Create virtual environment (creates .venv in src/)
uv venv

# Activate the virtual environment
source .venv/bin/activate

# Sync dependencies
uv sync

# Create .env file with API keys (auto-loaded by script)
cat > .env << 'EOF'
SONARR_API_KEY=your-sonarr-key
RADARR_API_KEY=your-radarr-key
LIDARR_API_KEY=your-lidarr-key
SONARR_URL=http://sonarr.example.com
RADARR_URL=http://radarr.example.com
LIDARR_URL=http://lidarr.example.com
EOF

# Run the dry-run smoke
python arrsync.py all --dry-run
```

The dry run queries each service's rename preview without issuing rename commands. Check the final summary for:

- `items: success=... failed=...` for each service
- `renames: needed=... renamed=0`
- any `Failed refresh items`, `Failed rename items`, or `Service failure` lines
- `Codec rename candidate` lines for existing paths containing `h264`, `x264`, or `H.264`; the proposed path should use the configured HEVC naming

The command exits non-zero after printing the summary if any service or item fails.

### Code Formatting

Format and lint code using [ruff](https://docs.astral.sh/ruff/):

```bash
cd src

# Format all Python files
uv run ruff format .

# Check formatting without making changes
uv run ruff format --check .

# Lint code
uv run ruff check .
```

## Usage

```bash
# Sync all services
arrsync all

# Sync individual services
arrsync sonarr
arrsync radarr
arrsync lidarr

# Preview mode
arrsync all --dry-run

# Verbose logging
arrsync all -v
```

## 1Password Setup

Create a 1Password item at `vaults/Secrets/items/arrsync-secrets` with the following fields:

| Field            | Description    |
| ---------------- | -------------- |
| `sonarr-api-key` | Sonarr API key |
| `radarr-api-key` | Radarr API key |
| `lidarr-api-key` | Lidarr API key |

API keys can be found in each application's Settings → General → Security.

## Schedule

Runs daily at 2 AM via CronJob.

## References

- **[Servarr Wiki](https://wiki.servarr.com/)** - \*arr application documentation
- **[uv](https://docs.astral.sh/uv/)** - Python dependency management
