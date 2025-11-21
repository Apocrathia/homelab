# Tdarr Modular Flows Configuration

This deployment uses the [modular Tdarr flows](https://github.com/jordanlambrecht/modular-tdarr-flows) system for intelligent media processing. The flows provide automated transcoding with intelligent decision-making based on codec, resolution, and quality thresholds.

## Flow Overview

The system consists of 7 modular flows:

1. **Controller Flow** (`TDARR_0_controllerFlow.json`) - Main orchestration and routing
2. **Subtitle Cleaning Flow** (`TDARR_1_subtitleCleaningFlow.json`) - Subtitle stream management
3. **Audio Cleaning Flow** (`TDARR_2_audioCleaningFlow.json`) - Audio stream cleanup
4. **Audio Transcoding Flow** (`TDARR_3_audioTranscodingFlow.json`) - Audio format conversion
5. **Video Transcoding Flow** (`TDARR_4_videoTranscodingFlow.json`) - Video codec conversion
6. **Cleanup Flow** (`TDARR_5_cleanupFlow.json`) - Post-processing cleanup
7. **Notification Flow** (`TDARR_6_notificationFlow.json`) - Status notifications

## Media Processing Goals

### Video Encoding

- **Target Codec**: HEVC (libx265) 10-bit (main10)
- **Quality**: CRF 20
- **Preset**: `veryslow` (highest quality/compression)
- **Processing**: CPU-only transcoding
- **Fidelity**: Preserve original resolution, framerate, color profiles/HDR/DV

### Container Selection

- **Preferred**: MP4 for maximum compatibility
- **Fallback**: MKV when MP4 would drop streams (PGS subtitles, DTS/TrueHD audio, MKV attachments)

### Audio Processing

- **Primary**: Ensure stereo AAC 2.0 track (256k bitrate) as first audio track
- **Preservation**: Keep all original audio streams (lossless/surround)
- **Ordering**: English/Undefined preferred, stereo first, then multichannel

### Decision Logic

Files are transcoded based on intelligent thresholds:

- **Non-HEVC content**: Always transcode
- **HEVC content**: Only transcode if bitrate exceeds thresholds:
  - 1080p: >10 Mbps
  - 2160p/4K: >25 Mbps

## Variable Configuration

### Global Variables

These variables are shared across all libraries and flows:

| Variable                 | Value                                    | Purpose                    |
| ------------------------ | ---------------------------------------- | -------------------------- |
| `plex_url`               | `http://plex.plex.svc.cluster.local`     | Plex server URL            |
| `plex_token`             | `[plex-token]`                           | Plex authentication token  |
| `plex_libraryKey_movies` | `1`                                      | Plex Movies library ID     |
| `plex_libraryKey_tv`     | `2`                                      | Plex TV Shows library ID   |
| `plex_libraryKey_anime`  | `3`                                      | Plex Anime library ID      |
| `tdarr_path_movies`      | `/movies`                                | Movies volume mount path   |
| `tdarr_path_tv`          | `/tv`                                    | TV Shows volume mount path |
| `tdarr_path_anime`       | `/anime`                                 | Anime volume mount path    |
| `url_radarr`             | `http://radarr.rarr.svc.cluster.local`   | Radarr service URL         |
| `url_sonarr`             | `http://sonarr.sonarr.svc.cluster.local` | Sonarr service URL         |
| `url_sonarrAnime`        | `http://sonarr.sonarr.svc.cluster.local` | Anime Sonarr service URL   |
| `api_key_radarr`         | `[radarr-api-key]`                       | Radarr API key             |
| `api_key_sonarr`         | `[sonarr-api-key]`                       | Sonarr API key             |
| `api_key_sonarrAnime`    | `[sonarr-api-key]`                       | Anime Sonarr API key       |
| `api_key_tmdb`           | `[tmdb-api-key]`                         | TMDB API key               |

### Library-Specific Variables

Each library (Movies, TV, Anime) has these configuration variables:

#### Movies Library (`MOVIES`)

| Variable                   | Value      | Purpose                        |
| -------------------------- | ---------- | ------------------------------ |
| `name`                     | `MOVIES`   | Library identifier (uppercase) |
| `enable_audio_cleaning`    | `true`     | Remove unwanted audio streams  |
| `enable_subs_cleaning`     | `false`    | Keep all subtitle streams      |
| `enable_audio_transcoding` | `true`     | Convert audio formats          |
| `enable_video_transcoding` | `true`     | Convert video codecs           |
| `enable_notifications`     | `true`     | Enable notifications           |
| `enable_control_flow`      | `true`     | Use controller flow            |
| `quality_level`            | `20`       | CRF value for video encoding   |
| `use_nvenc`                | `false`    | Use CPU-only encoding          |
| `ffmpeg_preset`            | `veryslow` | Encoding speed/quality preset  |
| `use_foreign`              | `false`    | Foreign language handling      |
| `use_checkpoints`          | `false`    | Disable checkpoint overwrites  |
| `check_hardlinks`          | `true`     | Check for hardlinked files     |

#### TV Shows Library (`TV`)

| Variable                   | Value      | Purpose                        |
| -------------------------- | ---------- | ------------------------------ |
| `name`                     | `TV`       | Library identifier (uppercase) |
| `enable_audio_cleaning`    | `true`     | Remove unwanted audio streams  |
| `enable_subs_cleaning`     | `false`    | Keep all subtitle streams      |
| `enable_audio_transcoding` | `true`     | Convert audio formats          |
| `enable_video_transcoding` | `true`     | Convert video codecs           |
| `enable_notifications`     | `true`     | Enable notifications           |
| `enable_control_flow`      | `true`     | Use controller flow            |
| `quality_level`            | `20`       | CRF value for video encoding   |
| `use_nvenc`                | `false`    | Use CPU-only encoding          |
| `ffmpeg_preset`            | `veryslow` | Encoding speed/quality preset  |
| `use_foreign`              | `false`    | Foreign language handling      |
| `use_checkpoints`          | `false`    | Disable checkpoint overwrites  |
| `check_hardlinks`          | `true`     | Check for hardlinked files     |

#### Anime Library (`ANIME`)

| Variable                   | Value      | Purpose                        |
| -------------------------- | ---------- | ------------------------------ |
| `name`                     | `ANIME`    | Library identifier (uppercase) |
| `enable_audio_cleaning`    | `true`     | Remove unwanted audio streams  |
| `enable_subs_cleaning`     | `false`    | Keep all subtitle streams      |
| `enable_audio_transcoding` | `true`     | Convert audio formats          |
| `enable_video_transcoding` | `true`     | Convert video codecs           |
| `enable_notifications`     | `true`     | Enable notifications           |
| `enable_control_flow`      | `true`     | Use controller flow            |
| `quality_level`            | `20`       | CRF value for video encoding   |
| `use_nvenc`                | `false`    | Use CPU-only encoding          |
| `ffmpeg_preset`            | `veryslow` | Encoding speed/quality preset  |
| `use_foreign`              | `false`    | Foreign language handling      |
| `use_checkpoints`          | `false`    | Disable checkpoint overwrites  |
| `check_hardlinks`          | `true`     | Check for hardlinked files     |

## Database Variable Management

Variables are stored in Tdarr's SQLite database (`/app/server/Tdarr/DB2/SQL/database.db`) in the `variablesjsondb` table. Each variable is stored as a JSON object with the following structure:

```json
{
  "key": "variable_name",
  "value": "variable_value",
  "type": "global|library:LIBRARY_ID",
  "date": 1234567890123,
  "_id": "randomID"
}
```

### Variable Types

- **Global variables**: `type: "global"`
- **Library variables**: `type: "library:LIBRARY_ID"` where LIBRARY_ID is the library's internal ID

### Finding Library IDs

Library IDs can be retrieved from the database by querying the `librarysettingsjsondb` table. Since the Tdarr container does not include the `sqlite3` CLI executable, Python must be used:

```python
import sqlite3
import json

db = '/app/server/Tdarr/DB2/SQL/database.db'
conn = sqlite3.connect(db)
cur = conn.cursor()

cur.execute('SELECT id, json_data FROM librarysettingsjsondb')
for lib_id, json_data in cur.fetchall():
    data = json.loads(json_data)
    print(f"ID: {lib_id}, Name: {data['name']}")
```

> _Note:_
> Library IDs are generated by Tdarr and may change if the database is recreated. Always verify library IDs before inserting variables.

### Adding Variables via SQLite

Because the flows require a large number of variables, they are stored in the database. We have opted to configure them via SQL rather than manually entering them through the UI. Variables can be inserted directly into the database using SQLite commands:

```sql
-- Global variable example
INSERT INTO variablesjsondb (id, timestamp, json_data) VALUES (
  'randomID',
  123456789,
  '{"key":"variable_name","value":"variable_value","type":"global","date":1234567890123,"_id":"randomID"}'
);

-- Library variable example
INSERT INTO variablesjsondb (id, timestamp, json_data) VALUES (
  'randomID',
  123456789,
  '{"key":"variable_name","value":"variable_value","type":"library:LIBRARY_ID","date":1234567890123,"_id":"randomID"}'
);
```

> _Note:_
> The variable IDs are a random string of 9 alphanumeric characters. Replace `LIBRARY_ID` with the actual library ID from the database.

**Important:** When inserting variables while Tdarr is running, use **individual transactions** to prevent database corruption. Each variable should be inserted in its own transaction with proper locking.

The Tdarr container does not include the `sqlite3` CLI executable, so Python (which is available in the container) must be used to interact with the database. Here's a Python example that demonstrates safe insertion:

```python
import sqlite3
import json
import random
import string
import time

def insert_var(key, value, vtype, db_path):
    """Insert a single variable in its own transaction."""
    conn = sqlite3.connect(db_path, timeout=10.0)
    try:
        cur = conn.cursor()
        cur.execute('BEGIN IMMEDIATE TRANSACTION')

        var_id = ''.join(random.choices(string.ascii_letters + string.digits, k=9))
        ts_sec = int(time.time())
        ts_ms = int(time.time() * 1000)

        jdata = json.dumps({
            'key': key,
            'value': value,
            'type': vtype,
            'date': ts_ms,
            '_id': var_id
        })

        cur.execute(
            'INSERT INTO variablesjsondb (id, timestamp, json_data) VALUES (?, ?, ?)',
            (var_id, ts_sec, jdata)
        )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# Example usage
db = '/app/server/Tdarr/DB2/SQL/database.db'
insert_var('plex_url', 'http://plex.plex.svc.cluster.local', 'global', db)
insert_var('name', 'MOVIES', 'library:Dw3Nj_ANZ', db)  # Replace with actual library ID
```

> _Note:_
>
> - Always use `BEGIN IMMEDIATE TRANSACTION` for proper locking when Tdarr is running
> - Insert variables one at a time, not in bulk transactions
> - Add small delays (0.1s) between inserts when Tdarr is actively running

## Worker Node Configuration

The flows use worker type tags to route processing to appropriate nodes:

- **`media-server-only`**: For nodes with media storage access
- **`pc-only`**: For high-performance processing nodes

Node tags are configured via the `nodeTags` environment variable in the Tdarr node daemonset.

For this setup, we have assigned the tags `requireCPUorGPU,media-server-only,pc-only` to the nodes. This bypasses most of the tag logic in the flows and allows all nodes to process media.

## Expected Results

With these flows configured, you can expect:

### Storage Savings

- **1080p content**: 50-80% size reduction (20-50 Mbps → 6-10 Mbps)
- **4K content**: 60-85% size reduction (40-100 Mbps → 15-25 Mbps)
- **Anime/animation**: 70-90% size reduction due to high compressibility

### Quality Preservation

- **Video**: Visually lossless quality with HEVC 10-bit encoding
- **Audio**: All original streams preserved plus guaranteed stereo compatibility
- **Subtitles**: Completely untouched
- **Metadata**: All chapters, tags, and metadata preserved

### Processing Behavior

- **Intelligent skipping**: Already-optimized files are skipped
- **Format compatibility**: Automatic container selection (MP4/MKV)
- **Robust handling**: Graceful handling of complex media files
- **Progress tracking**: Detailed logging of all processing decisions

## Troubleshooting

### Common Issues

1. **Files requeuing**: Check worker node tags match flow requirements
2. **Permission errors**: Ensure volume mounts have write access (`readOnly: false`)
3. **Variable not found**: Verify variable names and library IDs are correct
4. **Flow not executing**: Confirm libraries are set to use flows (not plugins)
5. **Database corruption**: If the database becomes corrupted (e.g., from concurrent writes), Tdarr will recreate it on restart. Library IDs will change, so variables must be re-inserted with the new IDs.

### Monitoring

Check the Tdarr web interface for:

- **Transcode Queue**: Files waiting for processing
- **Success/Error counts**: Processing statistics
- **Health Check results**: File analysis results
- **Job History**: Detailed processing logs

## Credits

This implementation is based on the excellent [modular Tdarr flows](https://github.com/jordanlambrecht/modular-tdarr-flows) project by Jordan Lambrecht, adapted for our specific media processing requirements and infrastructure setup.
