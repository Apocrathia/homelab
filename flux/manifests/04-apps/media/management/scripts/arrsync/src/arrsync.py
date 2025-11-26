#!/usr/bin/env python3
"""
arrSync - Sync *arr application file metadata and naming.

This script triggers refresh and rename operations across Sonarr, Radarr, and Lidarr
to ensure filenames reflect current codec information after transcoding operations
(e.g., when tdarr re-encodes media to x265/HEVC).

The script:
1. Lists all items (series/movies/artists) from each *arr service
2. For each item, triggers a refresh command to rescan files and update metadata
3. For each item, triggers a rename command to update filenames according to naming scheme

This ensures that after transcoding, the *arr applications recognize the new codec
and don't attempt unnecessary "upgrades" due to outdated filename information.

API Versions:
- Sonarr: v3
- Radarr: v3
- Lidarr: v1
"""

import argparse
import logging
import os
import sys
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

# Load .env file if it exists (for local development)
# The .env file should be in the same directory as this script (src/)
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

# Configure logging with timestamp and level
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@dataclass
class ArrConfig:
    """
    Configuration for an *arr service.

    Attributes:
        name: Human-readable service name (e.g., "Sonarr", "Radarr", "Lidarr")
        url: Base URL for the service (e.g., "http://sonarr.sonarr.svc.cluster.local")
        api_key: API key for authentication (from environment or 1Password secret)
        api_version: API version string (e.g., "v3" for Sonarr/Radarr, "v1" for Lidarr)
    """

    name: str
    url: str
    api_key: str
    api_version: str


class ArrClient(ABC):
    """
    Base client for *arr applications.

    Provides common functionality for interacting with Sonarr, Radarr, and Lidarr APIs.
    Each service has slight differences in API endpoints and command formats, which are
    handled by concrete implementations.

    The client:
    - Manages HTTP session with API key authentication
    - Provides methods for listing items, refreshing, and renaming
    - Handles command execution and status polling
    - Supports dry-run mode for testing without making changes
    """

    def __init__(self, config: ArrConfig, dry_run: bool = False):
        """
        Initialize the *arr client.

        Args:
            config: Service configuration (URL, API key, version)
            dry_run: If True, log actions without executing API calls
        """
        self.config = config
        self.dry_run = dry_run
        # Create persistent session for connection pooling
        self.session = requests.Session()
        # All *arr APIs use X-Api-Key header for authentication
        self.session.headers.update({"X-Api-Key": config.api_key})

    def _get(self, endpoint: str) -> Any:
        """
        Make a GET request to the API.

        Args:
            endpoint: API endpoint path (e.g., "series", "movie", "artist")
                    The base URL and API version are prepended automatically.

        Returns:
            Parsed JSON response from the API

        Raises:
            requests.HTTPError: If the API request fails
            ValueError: If response is not valid JSON
        """
        url = f"{self.config.url}/api/{self.config.api_version}/{endpoint}"
        logger.debug(f"GET {url}")
        response = self.session.get(url, timeout=30)
        response.raise_for_status()
        return response.json()

    def _post_command(self, command: dict[str, Any]) -> dict[str, Any] | None:
        """
        Post a command to the API.

        *arr applications use a command-based API where operations like refresh/rename
        are submitted as commands that execute asynchronously. This method submits
        the command and returns the command status object.

        Args:
            command: Command dictionary with "name" and service-specific parameters
                    (e.g., {"name": "RefreshSeries", "seriesIds": [123]})

        Returns:
            Command status object with "id" and other metadata, or None in dry-run mode

        Raises:
            requests.HTTPError: If the API request fails
        """
        if self.dry_run:
            logger.info(f"[DRY-RUN] Would send command: {command}")
            return None

        url = f"{self.config.url}/api/{self.config.api_version}/command"
        logger.debug(f"POST {url}: {command}")
        response = self.session.post(url, json=command, timeout=30)
        response.raise_for_status()
        return response.json()

    def _wait_for_command(self, command_id: int, timeout: int = 300) -> bool:
        """
        Wait for an asynchronous command to complete.

        *arr commands execute asynchronously. This method polls the command status
        until it completes, fails, or times out.

        Args:
            command_id: ID of the command to monitor (from _post_command response)
            timeout: Maximum time to wait in seconds (default: 5 minutes)

        Returns:
            True if command completed successfully, False if it failed or timed out
        """
        if self.dry_run:
            return True

        start_time = time.time()
        # Poll every 2 seconds until command completes or timeout
        while time.time() - start_time < timeout:
            status = self._get(f"command/{command_id}")
            state = status.get("status", "unknown")

            if state == "completed":
                return True
            elif state in ("failed", "aborted"):
                error_msg = status.get("message", "Unknown error")
                exception = status.get("exception", "")
                if exception:
                    # Extract the main error message from exception (first line)
                    exception_lines = exception.split("\n")
                    if exception_lines:
                        error_msg = f"{error_msg}: {exception_lines[0]}"
                logger.error(f"Command {command_id} {state}: {error_msg}")
                return False

            time.sleep(2)

        logger.error(f"Command {command_id} timed out after {timeout}s")
        return False

    @abstractmethod
    def list_items(self) -> list[dict[str, Any]]:
        """
        List all items from the service.

        Returns:
            List of item dictionaries, each containing at least an "id" field
        """
        pass

    @abstractmethod
    def refresh_item(self, item_id: int) -> bool:
        """
        Refresh a single item's metadata and rescan files.

        This triggers the service to:
        - Fetch updated metadata from the source (TVDB/TMDB/MusicBrainz)
        - Rescan the item's directory to detect file changes
        - Update internal database with current file information

        Args:
            item_id: ID of the item to refresh

        Returns:
            True if refresh completed successfully, False otherwise
        """
        pass

    @abstractmethod
    def rename_item(self, item_id: int) -> bool:
        """
        Rename files for a single item according to the configured naming scheme.

        This ensures filenames reflect current metadata and codec information.
        After transcoding, this is critical to prevent the service from thinking
        files need to be "upgraded" when they already have the desired codec.

        Args:
            item_id: ID of the item whose files should be renamed

        Returns:
            True if rename completed successfully, False otherwise
        """
        pass

    def sync_all(self) -> bool:
        """
        Refresh and rename all items in the service.

        This is the main sync operation. It:
        1. Lists all items
        2. For each item, refreshes metadata and rescans files
        3. For each item, renames files to match current naming scheme

        The operation fails fast - if any item fails to refresh or rename,
        the entire sync stops and returns False. This ensures we don't partially
        sync a large library and makes errors immediately visible.

        Returns:
            True if all items synced successfully, False if any item failed
        """
        items = self.list_items()
        logger.info(f"[{self.config.name}] Found {len(items)} items to process")

        for item in items:
            item_id = item["id"]
            item_name = self._get_item_name(item)
            logger.info(f"[{self.config.name}] Processing: {item_name} (ID: {item_id})")

            # Refresh first to ensure metadata is up-to-date
            if not self.refresh_item(item_id):
                logger.error(f"[{self.config.name}] Failed to refresh: {item_name}")
                return False

            # Then rename to reflect current state
            if not self.rename_item(item_id):
                logger.error(f"[{self.config.name}] Failed to rename: {item_name}")
                return False

        logger.info(f"[{self.config.name}] Successfully processed {len(items)} items")
        return True

    @abstractmethod
    def _get_item_name(self, item: dict[str, Any]) -> str:
        """
        Extract the display name from an item dictionary.

        Used for logging and error messages. Each service uses different field names
        for the item title/name.

        Args:
            item: Item dictionary from the API

        Returns:
            Human-readable name of the item
        """
        pass


class SonarrClient(ArrClient):
    """
    Client for Sonarr API (TV show management).

    Sonarr uses API v3. Endpoints:
    - GET /api/v3/series - List all series
    - POST /api/v3/command - Execute commands (RefreshSeries, RenameSeries)
    """

    def __init__(self, url: str, api_key: str, dry_run: bool = False):
        """
        Initialize Sonarr client.

        Args:
            url: Sonarr base URL (defaults to cluster internal service)
            api_key: Sonarr API key from Settings → General → Security
            dry_run: Enable dry-run mode
        """
        config = ArrConfig(name="Sonarr", url=url, api_key=api_key, api_version="v3")
        super().__init__(config, dry_run)

    def list_items(self) -> list[dict[str, Any]]:
        """List all TV series in Sonarr."""
        return self._get("series")

    def refresh_item(self, item_id: int) -> bool:
        """
        Refresh a TV series.

        Command: RefreshSeries
        - Updates series metadata from TVDB
        - Rescans series directory for file changes
        - Updates episode file information
        """
        command = {"name": "RefreshSeries", "seriesIds": [item_id]}
        result = self._post_command(command)
        if result is None:
            return True  # dry-run
        return self._wait_for_command(result["id"])

    def rename_item(self, item_id: int) -> bool:
        """
        Rename all episode files for a series.

        Command: RenameSeries
        - Renames all episode files according to configured naming scheme
        - Updates paths if necessary
        """
        command = {"name": "RenameSeries", "seriesIds": [item_id]}
        result = self._post_command(command)
        if result is None:
            return True  # dry-run
        return self._wait_for_command(result["id"])

    def _get_item_name(self, item: dict[str, Any]) -> str:
        """Extract series title from Sonarr series object."""
        return item.get("title", "Unknown")


class RadarrClient(ArrClient):
    """
    Client for Radarr API (movie management).

    Radarr uses API v3. Endpoints:
    - GET /api/v3/movie - List all movies
    - POST /api/v3/command - Execute commands (RefreshMovie, RenameMovie)
    """

    def __init__(self, url: str, api_key: str, dry_run: bool = False):
        """
        Initialize Radarr client.

        Args:
            url: Radarr base URL (defaults to cluster internal service)
            api_key: Radarr API key from Settings → General → Security
            dry_run: Enable dry-run mode
        """
        config = ArrConfig(name="Radarr", url=url, api_key=api_key, api_version="v3")
        super().__init__(config, dry_run)

    def list_items(self) -> list[dict[str, Any]]:
        """List all movies in Radarr."""
        return self._get("movie")

    def refresh_item(self, item_id: int) -> bool:
        """
        Refresh a movie.

        Command: RefreshMovie
        - Updates movie metadata from TMDB
        - Rescans movie directory for file changes
        - Updates file information
        """
        command = {"name": "RefreshMovie", "movieIds": [item_id]}
        result = self._post_command(command)
        if result is None:
            return True  # dry-run
        return self._wait_for_command(result["id"])

    def rename_item(self, item_id: int) -> bool:
        """
        Rename all files for a movie.

        Command: RenameMovie
        - Renames movie files according to configured naming scheme
        - Updates paths if necessary
        """
        command = {"name": "RenameMovie", "movieIds": [item_id]}
        result = self._post_command(command)
        if result is None:
            return True  # dry-run
        return self._wait_for_command(result["id"])

    def _get_item_name(self, item: dict[str, Any]) -> str:
        """Extract movie title from Radarr movie object."""
        return item.get("title", "Unknown")


class LidarrClient(ArrClient):
    """
    Client for Lidarr API (music management).

    Lidarr uses API v1 (different from Sonarr/Radarr v3). Endpoints:
    - GET /api/v1/artist - List all artists
    - POST /api/v1/command - Execute commands (RefreshArtist, RenameFiles)

    Note: Lidarr command format differs - RefreshArtist uses "artistId" (singular),
    while RenameFiles requires fetching track files first and using "files" parameter.
    """

    def __init__(self, url: str, api_key: str, dry_run: bool = False):
        """
        Initialize Lidarr client.

        Args:
            url: Lidarr base URL (defaults to cluster internal service)
            api_key: Lidarr API key from Settings → General → Security
            dry_run: Enable dry-run mode
        """
        config = ArrConfig(name="Lidarr", url=url, api_key=api_key, api_version="v1")
        super().__init__(config, dry_run)

    def list_items(self) -> list[dict[str, Any]]:
        """List all artists in Lidarr."""
        return self._get("artist")

    def refresh_item(self, item_id: int) -> bool:
        """
        Refresh an artist.

        Command: RefreshArtist
        - Updates artist metadata from MusicBrainz
        - Rescans artist directory for file changes
        - Updates album and track file information

        Note: Lidarr uses "artistId" (singular) unlike Sonarr/Radarr which use plural.
        """
        command = {"name": "RefreshArtist", "artistId": item_id}
        result = self._post_command(command)
        if result is None:
            return True  # dry-run
        return self._wait_for_command(result["id"])

    def rename_item(self, item_id: int) -> bool:
        """
        Rename all track files for an artist.

        Command: RenameFiles
        - Renames track files according to configured naming scheme
        - Updates paths if necessary

        Note: Lidarr's RenameFiles command requires both files (track file IDs) and
        artistId parameters. We get all track files for the artist first.
        """
        # Get all track files for this artist
        try:
            track_files = self._get(f"trackfile?artistId={item_id}")
            if not track_files:
                logger.debug(f"[{self.config.name}] No track files found for artist {item_id}, skipping rename")
                return True  # No files to rename, consider it successful

            # Extract track file IDs
            track_file_ids = [tf["id"] for tf in track_files if "id" in tf]
            if not track_file_ids:
                logger.debug(f"[{self.config.name}] No track file IDs found for artist {item_id}, skipping rename")
                return True

            # RenameFiles command requires both files and artistId parameters
            command = {"name": "RenameFiles", "files": track_file_ids, "artistId": item_id}
            result = self._post_command(command)
            if result is None:
                return True  # dry-run
            return self._wait_for_command(result["id"])
        except Exception as e:
            logger.error(f"[{self.config.name}] Error getting track files for rename: {e}")
            return False

    def _get_item_name(self, item: dict[str, Any]) -> str:
        """Extract artist name from Lidarr artist object."""
        return item.get("artistName", "Unknown")


def get_env_or_fail(key: str) -> str:
    """
    Get an environment variable or exit with error.

    Used for required configuration like API keys. The script will not proceed
    without these values, so we fail fast with a clear error message.

    Args:
        key: Environment variable name

    Returns:
        Environment variable value

    Exits:
        sys.exit(1): If the environment variable is not set
    """
    value = os.environ.get(key)
    if not value:
        logger.error(f"Required environment variable {key} is not set")
        sys.exit(1)
    return value


def run_sonarr(dry_run: bool) -> bool:
    """
    Run sync operation for Sonarr.

    Args:
        dry_run: If True, preview actions without executing

    Returns:
        True if sync completed successfully, False otherwise
    """
    # Default to cluster internal service URL if not specified
    url = os.environ.get("SONARR_URL", "http://sonarr.sonarr.svc.cluster.local")
    api_key = get_env_or_fail("SONARR_API_KEY")
    client = SonarrClient(url, api_key, dry_run)
    return client.sync_all()


def run_radarr(dry_run: bool) -> bool:
    """
    Run sync operation for Radarr.

    Args:
        dry_run: If True, preview actions without executing

    Returns:
        True if sync completed successfully, False otherwise
    """
    # Default to cluster internal service URL if not specified
    url = os.environ.get("RADARR_URL", "http://radarr.radarr.svc.cluster.local")
    api_key = get_env_or_fail("RADARR_API_KEY")
    client = RadarrClient(url, api_key, dry_run)
    return client.sync_all()


def run_lidarr(dry_run: bool) -> bool:
    """
    Run sync operation for Lidarr.

    Args:
        dry_run: If True, preview actions without executing

    Returns:
        True if sync completed successfully, False otherwise
    """
    # Default to cluster internal service URL if not specified
    url = os.environ.get("LIDARR_URL", "http://lidarr.lidarr.svc.cluster.local")
    api_key = get_env_or_fail("LIDARR_API_KEY")
    client = LidarrClient(url, api_key, dry_run)
    return client.sync_all()


def main() -> int:
    """
    Main entry point for the script.

    Parses command-line arguments and executes the appropriate sync operations.
    Supports syncing individual services or all services at once.

    Returns:
        0 on success, 1 on failure (for use as exit code)
    """
    parser = argparse.ArgumentParser(
        description="Sync *arr application file metadata and naming",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    arrsync sonarr           Sync all Sonarr series
    arrsync radarr           Sync all Radarr movies
    arrsync lidarr           Sync all Lidarr artists
    arrsync all              Sync all services
    arrsync all --dry-run    Preview what would be synced

Environment Variables:
    SONARR_URL       Sonarr base URL (default: http://sonarr.example.com)
    SONARR_API_KEY   Sonarr API key (required for sonarr/all)
    RADARR_URL       Radarr base URL (default: http://radarr.example.com)
    RADARR_API_KEY   Radarr API key (required for radarr/all)
    LIDARR_URL       Lidarr base URL (default: http://lidarr.example.com)
    LIDARR_API_KEY   Lidarr API key (required for lidarr/all)
        """,
    )
    parser.add_argument(
        "service",
        choices=["sonarr", "radarr", "lidarr", "all"],
        help="Service to sync (or 'all' for all services)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview actions without making changes",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose (DEBUG) logging",
    )

    args = parser.parse_args()

    # Enable debug logging if requested
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.dry_run:
        logger.info("Running in dry-run mode - no changes will be made")

    # Map service names to their runner functions
    services = {
        "sonarr": run_sonarr,
        "radarr": run_radarr,
        "lidarr": run_lidarr,
    }

    # Execute sync for requested service(s)
    if args.service == "all":
        # Process all services sequentially
        # Fail fast if any service fails
        for name, runner in services.items():
            logger.info(f"Starting sync for {name}")
            if not runner(args.dry_run):
                logger.error(f"Sync failed for {name}")
                return 1
    else:
        # Process single service
        if not services[args.service](args.dry_run):
            return 1

    logger.info("Sync completed successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
