---
title: "Ship Framework"
canonical: https://tenzir.com/docs/reference/ship-framework
source: https://tenzir.com/docs/reference/ship-framework.md
section: "Docs"
---

# Ship Framework

> tenzir-ship ships as a Python package that requires Python 3.12 or later. Install it with uv (or pip) and verify the console script:

[`tenzir-ship`](https://github.com/tenzir/ship) helps you ship faster with automated release engineering. Manage changelogs, generate release notes, and publish GitHub releases. Use this page as a reference for concepts, configuration, and CLI details. For step-by-step walkthroughs, see the guide for [maintaining a changelog](../guides/packages/maintain-a-changelog.md).

## Install

`tenzir-ship` ships as a Python package that requires Python 3.12 or later. Install it with [`uv`](https://docs.astral.sh/uv/) (or `pip`) and verify the console script:

```sh
uv add tenzir-ship
uvx tenzir-ship --help
```

## Python API

Drive the CLI flows from another Python process by importing the `Changelog` helper:

```python
from pathlib import Path
from tenzir_ship import Changelog


client = Changelog(root=Path("changelog"))
client.add(
    title="API entry",
    entry_type="feature",
    description="Body text",
    co_authors=["alice"],
)


# Show entries using scope tokens as identifiers
client.show(identifiers=["unreleased"], view="markdown", explicit_links=True)
client.show(identifiers=["v1.0.0"], release_mode=True, view="markdown")
client.show(identifiers=["released"], release_mode=True, view="json")


# Apply entry metadata policies to released entries too
client.validate(all_entries=True)


# Get the latest stable version
version = client.release_version()  # Returns "v1.0.0"
bare_version = client.release_version(bare=True)  # Returns "1.0.0"


# Create or continue a release candidate
client.release_create(release_candidate=True, assume_yes=True)


# Promote the latest release candidate to stable
client.release_create(assume_yes=True)


# Publish defaults to the latest release (stable or RC)
client.release_publish(create_tag=True, assume_yes=True)


# Push the release tag and create the GitHub release later
client.release_publish(
    create_tag=True,
    create_github_release=False,
    assume_yes=True,
)
```

Set `create_github_release=False` together with `create_tag=True`. The method rejects the skipped-release mode without a tag because no publish step would remain.

Version identifiers passed to `show()` must match existing release directories in `releases/<version>/`. The method validates identifiers against release manifests on disk. Scope tokens like `"unreleased"`, `"released"`, and `"latest"` work without corresponding directories.

For advanced scenarios, reuse `tenzir_ship.create_cli_context` and call the helper functions from `tenzir_ship.cli` directly.

## Core concepts

* **Project** – Identifies which documentation stream the changelog belongs to. Every entry and release references the same project string.
* **Entry** – A changelog consists of entries. Each entry uses one of four hard-coded types: `breaking`, `feature`, `bugfix`, or `change`.
* **Unreleased bucket** – Pending entries live in `unreleased/` until you move them to a stable release. Release candidates snapshot this queue without consuming it.
* **Release** – A stable or release-candidate milestone under `releases/<version>/` containing `manifest.yaml`, `notes.md`, and archived entry files in `entries/`.
* **Configuration file** – Settings live in `config.yaml` by default, or you can store them in `package.yaml` alongside the `changelog/` directory. `config.yaml` takes precedence when both exist.
* **Export style** – Controls whether release notes use a detailed card layout or a compact bullet-list layout. Set `export_style: compact` in configuration to prefer the bullet-list format without passing `--compact` each time.
* **Explicit links** – Controls whether @mentions and #PR references render as explicit Markdown links. Set `explicit_links: true` to produce portable output for documentation sites or Markdown renderers that don’t auto-link GitHub references. CLI flags `--explicit-links/--no-explicit-links` override this setting.
* **Components** – You may constrain the optional `component` field on entries by declaring allowed labels in configuration. Use a dict mapping component names to descriptions. Component filters apply to the CLI table, exports, and validation.
* **Modules** – Independent changelog projects discovered via a glob pattern. Each module has its own configuration and versioning. The parent project acts as a workspace that provides discovery, aggregated views, and typically handles distribution of the bundled modules.

A typical project layout looks like this:

* project-root/

  * changelog/

    * config.yaml

    * unreleased/

      * add-feature.md
      * fix-bug.md

    * releases/

      * v1.0.0/

        * manifest.yaml

        * notes.md

        * entries/

          * add-feature.md
          * fix-bug.md

For a [package](../explanations/packages.md) layout (with `package.yaml`), the structure may look like:

* my-package/

  * package.yaml

  * changelog/

    * unreleased/

      * …

    * releases/

      * …

## Commands

Run changelog commands from the project root or the `changelog/` directory:

```sh
uvx tenzir-ship [command] [options]
```

All commands accept `--config` to point at an explicit configuration file (YAML format, defaulting to `config.yaml`) and `--root` to operate on another repository. When you omit both options, the CLI looks for `config.yaml` inside the changelog root or, failing that, for a `package.yaml` one directory above the changelog folder. The CLI also automatically uses a `changelog/` subdirectory as the project root when running from a parent directory that contains one. This *package mode* lets you run commands from either the package root or the `changelog/` directory without repeating `--root`.

The `init` command is the exception for `--config`: it always writes `config.yaml` in standalone mode and therefore does not accept an explicit config path.

### init

Create the initial changelog scaffold.

```text
tenzir-ship init [options]
```

| Option                 | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| `--yes`                | Initialize without interactive prompts                    |
| `--package`            | Force package mode using `package.yaml` metadata          |
| `--standalone`         | Force standalone mode with `config.yaml`                  |
| `--id <id>`            | Project identifier for standalone mode                    |
| `--name <text>`        | Project display name for standalone mode                  |
| `--description <text>` | Project description for standalone mode                   |
| `--repository <slug>`  | GitHub repository slug (`owner/repo`) for standalone mode |

Without `--root`, `init` creates `./changelog` by default. If you run it from inside an empty `changelog/` directory, it initializes the current directory instead of nesting another `changelog/` below it. In standalone mode, the interactive defaults come from the surrounding workspace directory, even when you pass `--root changelog` explicitly.

Standalone mode writes `config.yaml` and creates `unreleased/`. Package mode requires `package.yaml` next to the changelog directory, reuses the package metadata, and only creates the directories needed for changelog content. Existing projects are never overwritten: `init` fails with an explicit error if `config.yaml`, `unreleased/`, or `releases/` already exist in the target.

Examples:

```sh
# Interactive standalone setup
uvx tenzir-ship init


# Non-interactive standalone setup
uvx tenzir-ship init --yes --id my-project --name "My Project"


# Package-aware setup from a repository root with package.yaml
uvx tenzir-ship init --package
```

### show

Display changelog entries in multiple views.

```text
tenzir-ship show [identifiers...] [options]
```

| Option                | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `identifiers`         | Row numbers, entry IDs, scope tokens, or versions       |
| `-c/--card`           | Show detailed cards for matching entries                |
| `-m/--markdown`       | Export as Markdown                                      |
| `-j/--json`           | Export as JSON                                          |
| `--release`           | Display entries grouped by release with full metadata   |
| `--compact`           | Use compact bullet-list layout                          |
| `--no-compact`        | Use detailed card layout                                |
| `--no-emoji`          | Remove type emoji from output                           |
| `--explicit-links`    | Render @mentions and PR refs as explicit Markdown links |
| `--project <id>`      | Filter to specific project (repeatable)                 |
| `--component <label>` | Filter to specific component (repeatable)               |
| `--banner`            | Display project banner above table output               |

#### Scope tokens

Scope tokens control which entries to display. Pass one as a positional argument:

| Token        | Description                                         |
| ------------ | --------------------------------------------------- |
| `all`        | All entries (released and unreleased) - the default |
| `unreleased` | Only unreleased entries                             |
| `released`   | Only released entries                               |
| `latest`     | Only entries from the latest stable release         |

You can combine a scope token with version identifiers (except `all`, which must be used alone):

```sh
# Show a specific release
tenzir-ship show v1.0.0


# Show only unreleased entries
tenzir-ship show unreleased


# Show released entries, filtering to specific versions
tenzir-ship show released v1.0.0 v1.1.0
```

Version identifiers must match an existing release version exactly. The CLI resolves versions by checking for a corresponding release manifest in `releases/<version>/`. Matching is case-insensitive, so `v1.0.0` and `V1.0.0` both resolve to the same release if it exists.

The `latest` scope ignores release candidates. It resolves to the newest stable release and fails until the project has at least one stable release.

The table view (default) lists entries with ID, title, type, project, PRs, and authors. Row numbers count backward from the newest entry, so `#1` always targets the latest change.

Entry IDs are scoped to a release. If an exact ID occurs in multiple releases or also exists in `unreleased/`, `show <entry-id>` returns every occurrence. Cards and tables include the matching release context, Markdown separates the occurrences by release, and each entry in JSON output has a nullable `release` field.

Use `--release` to display entries grouped by release with full release metadata. This is the recommended mode for exporting release notes:

```sh
# Export a specific release as Markdown
tenzir-ship show v1.0.0 --release --markdown


# Preview unreleased entries as release notes
tenzir-ship show unreleased --release --markdown


# Export all releases as JSON
tenzir-ship show all --release --json


# Export only released versions (exclude unreleased)
tenzir-ship show released --release --json


# Show entries from the latest release only
tenzir-ship show latest --release --markdown
```

Use `--explicit-links` when rendering Markdown outside of GitHub. By default, the output uses `@username` and `#123` references that GitHub auto-links. With `--explicit-links`, these become explicit Markdown links like `[@username](https://github.com/username)` and `[#123](https://github.com/owner/repo/pull/123)`, making the output portable to documentation sites, blogs, or other Markdown renderers.

### add

Create a new changelog entry in `unreleased/`.

```text
tenzir-ship add [options]
```

| Option                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `--title <text>`       | Entry title                                  |
| `--type <type>`        | `breaking`, `feature`, `bugfix`, or `change` |
| `--description <text>` | Entry body                                   |
| `--author <name>`      | Human contributor name (repeatable)          |
| `--co-author <name>`   | Additional human contributor (repeatable)    |
| `--pr <number>`        | Pull request number (repeatable)             |
| `--component <label>`  | Component label (repeatable)                 |
| `--web`                | Open prefilled GitHub file creation URL      |

The command prompts for any information you do not pass explicitly. The first invocation can scaffold the project automatically, creating a `changelog/` subdirectory with `config.yaml` and `unreleased/`. When you provide an explicit `--root` flag, the CLI uses that directory directly instead of creating a subdirectory. Prefer `tenzir-ship init` when you want to set up the changelog workspace without creating an entry. The CLI names entry files using the slugified title (e.g., `my-feature.md`).

The generated ID must be unique in the current `unreleased/` directory. It may reuse an ID from an older release because each release has its own entry namespace. The command rejects only a filename that already exists in the current unreleased namespace.

By default, the CLI infers the primary author from environment variables (`TENZIR_CHANGELOG_AUTHOR`, `GH_USERNAME`) or the GitHub CLI (`gh api user`). Using `--author` overrides this inference entirely. The `--co-author` option adds another human contributor to the inferred or explicit author list without replacing it. In CI and agent environments, inference can resolve to a bot, GitHub App, or machine user. Inspect the generated `authors` metadata and confirm that every login belongs to a human contributor. Pass `--author` for a known human, or remove author metadata when no human can be identified confidently. Do not record coding agents, bots, tools, providers, or models as authors. Record tool provenance in commit metadata instead. Duplicates are removed automatically while preserving order.

When `require_author: true` is set and the command cannot resolve an author, `add` warns but still writes the entry. The next `validate` call fails until you add a confirmed human contributor. The command behaves the same way for a missing PR number when `require_pr: true` is set, except `validate --lenient` can demote that missing PR to a warning.

### release create

Stage a release under `releases/<version>/`.

```text
tenzir-ship release create [version] [options]
```

| Option                | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `version`             | Exact release version override (for example `v1.0.0`)      |
| `--patch`             | Manual patch bump override from the latest stable release  |
| `--minor`             | Manual minor bump override from the latest stable release  |
| `--major`             | Manual major bump override from the latest stable release  |
| `--rc`                | Create or continue a release-candidate series              |
| `--yes`               | Commit changes (default is dry run)                        |
| `--title <text>`      | Custom title for the release heading                       |
| `--intro <text>`      | Inline intro text (mutually exclusive with `--intro-file`) |
| `--intro-file <path>` | Path to intro file (mutually exclusive with `--intro`)     |
| `--compact`           | Use bullet-list layout for `notes.md`                      |
| `--explicit-links`    | Render @mentions and PR refs as explicit Markdown links    |
| `--date <YYYY-MM-DD>` | Override release date                                      |

The `--title` value is stored in the release manifest and used by release views and exports. GitHub release pages include the project and version in addition to this title when you publish the release.

When creating a release, the command also updates version fields in detected package manifest files (`package.json`, `pyproject.toml`, `project.toml`, `Cargo.toml`). See the [version bumping configuration](ship-framework.md#version-bumping) for details.

For stable releases, the default and preferred workflow is to omit both the manual bump flags and an explicit `version`. `tenzir-ship` auto-bumps from the unreleased entry types. Use `--patch`, `--minor`, or `--major` only when the automatic detection is not the right fit. Pass an explicit stable `version` only as a rare exact override, for example to re-cut a failed tagged release or to match an externally dictated version.

Automatic inference uses the latest stable release as its base, or an implicit `0.0.0` when no stable release exists. The highest-impact unreleased entry selects the bump:

| Entry type        | Latest stable is `0.x` | Latest stable is `1.x` or later |
| ----------------- | ---------------------- | ------------------------------- |
| Bug fix           | Patch                  | Patch                           |
| Feature or change | Minor                  | Minor                           |
| Breaking change   | Minor                  | Major                           |

Entry-driven inference therefore never transitions a project from `0.x` to `1.0.0`. Run `release create --major` or pass `1.0.0` explicitly when you want to declare the first stable release.

If an outstanding release candidate exists, the same version-less stable command promotes the latest RC to its matching stable release automatically. This is the only promotion path for the active RC. The active target takes precedence over entry-driven inference, so entries added during an RC cycle do not select a different version. The `stats` command reports this stable target as the next release. If you need to leave the RC cycle and ship a different stable release instead, pass a new explicit version such as `v1.2.4`, `v1.3.0`, or `v2.0.0`. An explicit version matching the active RC base is rejected.

The command renders `notes.md`, updates `manifest.yaml`, and writes entry snapshots into `entries/`. Stable releases consume matching entry files from `unreleased/`. Release candidates created with `--rc` copy the current unreleased queue without consuming it, so you can iterate on `-rc.N` releases before promoting one to stable. It performs a dry run by default. When the release already exists, the CLI refreshes metadata and synchronizes the selected entries. If no changelog entries are available, the command still succeeds when you provide `--intro` or `--intro-file`, creating an intro-only release. This is useful for re-publishing after yanking a package or retrying a failed publish workflow. Without either entries or intro text, the command fails with an error.

By default, `release create` also updates common package-manager version files to the created release version (without the optional `v` prefix). In `auto` mode, the CLI discovers `package.json`, `pyproject.toml`, `project.toml`, and `Cargo.toml` in the changelog root and, when running from `changelog/`, in the parent directory. Configure this behavior under `release.version_bump_mode` and `release.version_files`.

#### Release candidates

Create or continue a release candidate with:

```sh
tenzir-ship release create --rc --yes
```

`tenzir-ship` infers the stable base from the current unreleased changes and existing release history. Re-running `release create --rc` for the same base increments the matching `-rc.N` series instead of consuming unreleased entries. Each new `-rc.N` supersedes the previous RC snapshot for that stable target, so only the active candidate remains in release history. To override the inferred base, prefer a manual bump such as `--minor`. Pass an explicit stable `version` only when you need an exact base.

When you are ready to ship the stable release, rerun the normal stable command without `--rc`:

```sh
tenzir-ship release create --yes
```

If an outstanding RC exists, this promotes the latest candidate automatically. Promotion is cumulative: entries added to `unreleased/` after the last candidate snapshot are folded into the stable release and consumed from the queue, just as a follow-up candidate would include them.

#### After an RC exists

Once a release-candidate series exists, keep the workflow on that series:

```sh
# Continue the RC series
tenzir-ship release create --rc --yes


# Promote the latest RC to stable
tenzir-ship release create --yes
```

The RC workflow has three outcomes only:

* Run `release create --rc` to continue the current RC series.
* Run `release create` without a version or bump flag to promote the active RC.
* Run `release create <new-version>` or a manual bump flag to leave the RC cycle and ship a different stable release instead.

Promoting to stable closes the RC cycle and removes that cycle’s `vX.Y.Z-rc.N` manifests from `releases/`. An explicit version matching the active RC base is rejected, and manual bump flags never promote the active RC.

### release version

Print the latest stable released version.

```text
tenzir-ship release version [options]
```

| Option   | Description                      |
| -------- | -------------------------------- |
| `--bare` | Print version without `v` prefix |

Use this command in scripts to query the current stable version without parsing output from other commands. The command ignores release candidates and fails until the project has at least one stable release:

```sh
# Get the latest stable version
tenzir-ship release version
# Output: v1.2.0


# Get version without prefix (for semver tools)
tenzir-ship release version --bare
# Output: 1.2.0


# Use in commit messages
git commit -m "Release $(tenzir-ship release version)"
```

### release publish

Publish a release with optional git and GitHub steps.

```text
tenzir-ship release publish [version] [options]
```

| Option                | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| `version`             | Release version (defaults to the latest release)                  |
| `--title <format>`    | GitHub release title format (see below)                           |
| `--yes`               | Skip confirmation prompts                                         |
| `--draft`             | Mark as draft                                                     |
| `--prerelease`        | Force a GitHub prerelease                                         |
| `--no-latest`         | Prevent GitHub from marking as latest release                     |
| `--tag`               | Create and push annotated Git tag                                 |
| `--commit`            | Commit staged changes before tagging (requires `--tag`)           |
| `--commit-message`    | Custom commit message (default: `Release {version}`)              |
| `--no-github-release` | Push the tag without creating a GitHub release (requires `--tag`) |

Without `--yes`, the command lists the steps it is about to run and asks for confirmation before the first one, so declining leaves the working tree and the remote untouched.

Combine `--no-github-release` with `--tag` to stop after the tag is pushed:

```sh
tenzir-ship release publish --commit --tag --no-github-release --yes
```

The command rejects `--no-github-release` without `--tag` because no publish step would remain. Use this mode when the release belongs in a repository other than the one being pushed to, or when the release should appear only after downstream builds have proven the tag releasable. A separate process must then create the release. Since only that step shells out to `gh`, the CLI is not required when it is skipped.

The command reads project metadata from `config.yaml` or `package.yaml` for the repository slug and uses `notes.md` as the release body. Projects without a `repository` field cannot publish - this is intentional for changelogs that track changes without producing GitHub releases (e.g., modules in a workspace). When you omit `version`, the command resolves the latest release manifest by version, including release candidates.

By default, the GitHub release title uses the format `$PROJECT $VERSION: $TITLE`, where `$TITLE` is the release title from `release create --title`. If you create a release without `--title`, the manifest omits the `title` field and GitHub receives the shorter `$PROJECT $VERSION` title:

```sh
tenzir-ship release create v5.1.0
tenzir-ship release publish v5.1.0
# GitHub release title: "Tenzir v5.1.0"
```

Override the format for a single publish with `--title`:

```sh
tenzir-ship release publish v5.1.0 --title '[$PROJECT $VERSION] $TITLE'
# GitHub release title: "[Tenzir v5.1.0] Faster ingest"
```

The `$PROJECT`, `$VERSION`, and `$TITLE` variables are optional. A format without variables is a literal GitHub title override:

```sh
tenzir-ship release publish v5.1.0 --title "Faster ingest"
# GitHub release title: "Faster ingest"
```

#### How it works

The `release publish` command executes the following steps. Before starting, it rejects `--no-github-release` without `--tag` because that combination would leave nothing to publish.

1. **Validate configuration**: Checks that the `repository` field is set in `config.yaml` or `package.yaml`. This field determines the GitHub repository to publish to (e.g., `tenzir/tenzir`).

2. **Check for `gh` CLI**: Verifies that the [GitHub CLI](https://cli.github.com/) is installed and available in `PATH`. Only the GitHub release step uses `gh`, so this check is skipped with `--no-github-release`.

3. **Find release manifest**: Locates the release manifest at `releases/<version>/manifest.yaml`. Fails if the specified version doesn’t exist.

4. **Verify release notes**: Checks that `releases/<version>/notes.md` exists and is non-empty. If missing, prompts you to run `release create` first.

5. **Check for an existing GitHub release**: Queries GitHub to determine whether a release for this version already exists, which decides between `gh release edit` and `gh release create`. The query only reads, so it runs before anything is modified. Skipped with `--no-github-release`.

6. **Confirm**: Unless `--yes` is provided, lists every step about to run - including the exact `gh` command - and prompts for confirmation. This happens before the first modification, so declining leaves the working tree and the remote untouched.

7. **Commit staged changes** (if `--commit`): Creates a git commit with all staged changes. Requires `--tag` to be set. Uses the commit message from `--commit-message`, the `release.commit_message` config field, or defaults to `Release {version}`.

8. **Create and push git tag** (if `--tag`): Creates an annotated git tag named after the version with message `Release {version}`. If the tag already exists, skips creation but continues. Pushes the current branch to its upstream remote, then pushes the tag to the remote matching the configured repository.

9. **Create or update GitHub release**: Skipped entirely with `--no-github-release`, which stops the command here.

   * If the release exists, runs `gh release edit` to update the release notes and title.
   * If the release doesn’t exist, runs `gh release create` with the version tag, release notes from `notes.md`, and optional `--draft`, `--prerelease`, or `--latest=false` flags. Release-candidate tags automatically add `--prerelease` and `--latest=false`.

#### Handling failures

When a step fails mid-workflow, the command displays a progress panel showing which steps completed and which step failed. This helps you understand exactly where the workflow stopped and what manual commands to run for recovery.

```text
╭──────────────── Release Progress (2/5) ────────────────╮
│ ✔ git commit -m "Release v1.2.0"                       │
│ ✔ git tag -a v1.2.0 -m "Release v1.2.0"                │
│ ✘ git push origin main:main                            │
│ ○ git push origin v1.2.0                               │
│ ○ gh release create v1.2.0 --repo owner/repo ...       │
╰────────────────────────────────────────────────────────╯
```

The icons indicate step status:

* **✔** (green): Step completed successfully
* **✘** (red): Step failed
* **○** (dim): Step not yet executed

In this example, the commit and tag were created locally, but the branch push failed - perhaps due to network issues. You can fix the underlying issue and retry the push manually, then run `release publish` again to complete the remaining steps.

#### Typical workflow

A full release workflow with commit and tag:

```sh
# 1. Create the release (generates manifest.yaml and notes.md)
tenzir-ship release create --yes


# 2. Review the generated notes
tenzir-ship show latest --release --markdown


# 3. Stage release files
git add changelog/releases/


# 4. Publish with commit and tag (defaults to the latest release)
tenzir-ship release publish --commit --tag --yes
```

Alternatively, commit manually to customize the message using `release version`:

```sh
# 3. Stage and commit with custom message
git add changelog/releases/
git commit -m "Release $(tenzir-ship release version)"


# 4. Publish (defaults to the latest release)
tenzir-ship release publish --tag --yes
```

Both workflows are version-agnostic after step 1. The `release publish` command defaults to the latest release when no version is specified. That means the same version-less publish command works after both stable releases and release candidates.

When you publish `vX.Y.Z-rc.N`, `tenzir-ship` automatically marks the GitHub release as a prerelease and prevents GitHub from treating it as the latest release. Use `--prerelease` only when you intentionally want to publish a stable version as a preview release.

### validate

Run structural checks across entry files, release manifests, and exported documentation.

```text
tenzir-ship validate [options]
```

| Option          | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `--lenient`     | Demote missing PR metadata issues to warnings, not errors. |
| `--all-entries` | Apply entry metadata policies to released entries too.     |

The validator reports missing metadata, release manifests whose referenced entry files are absent from that release’s own `entries/` directory, duplicate entry IDs within one manifest, and configuration drift across repositories. The same ID may appear in different releases. Validation also rejects unreleased entries that carry `prs` metadata when the configuration sets `omit_pr: true`, or `authors` metadata when it sets `omit_author: true`. When modules are configured, validation runs against the parent project and all discovered modules. Issues from modules are prefixed with the module ID.

The `require_pr: true` setting makes plain validation fail for unreleased entries without `prs` metadata. The `require_author: true` setting similarly requires a non-empty `authors` list. Use `validate --lenient` in pre-push hooks when a pull request number might not exist yet. Lenient mode demotes only missing PR metadata issues. All other validation errors still fail.

Entry metadata policies apply to unreleased entries by default, so a new policy doesn’t invalidate published history. Run `validate --all-entries` to audit released entries against the current policies too. Other structural and schema checks continue to cover both unreleased and released entries in either mode. When you combine `--all-entries` with `--lenient`, missing PRs in released entries also become warnings. Run without `--lenient` for a strict history audit. Missing authors and forbidden metadata remain errors in both modes.

### stats

Display project and release statistics.

```text
tenzir-ship stats [options]
```

| Option    | Description                           |
| --------- | ------------------------------------- |
| `--table` | Force table view even for one project |
| `--json`  | Export statistics as JSON             |

The command adapts its display based on the project structure:

* **Single projects**: Vertical card layout with detailed sections for project metadata, releases, entry types, and status
* **Multi-module projects**: Compact table comparing all modules side by side

Statistics include:

* **Project info**: Name, latest version, age since last release
* **Releases**: Total count, time span, release cadence (exponentially weighted for recent activity), and the next automatically selected version
* **Entry types**: Distribution of breaking, feature, change, and bugfix entries with percentages
* **Entry status**: Total, shipped, and unreleased counts

The release cadence uses exponential weighting to emphasize recent activity. A project releasing monthly for the past quarter shows higher cadence than one with sporadic releases.

Use `--json` to export structured data for automation:

```sh
tenzir-ship stats --json
```

The JSON output includes the project root path, parent project statistics, and an array of module statistics when modules are configured.

## Reusable GitHub Actions workflow

The [`tenzir/ship`](https://github.com/tenzir/ship) repository ships a reusable release workflow at `.github/workflows/release.yaml`. External repositories can call it directly to automate changelog-based releases. Pin the workflow to a released tag or full commit SHA instead of a moving branch name. Replace `<pinned-ref>` with the immutable ref you want to consume.

For a practical example of wiring this workflow into your own repository, see the guide for [maintaining a changelog](../guides/packages/maintain-a-changelog.md).

### Default mode

By default, the workflow uses the caller repository’s built-in `GITHUB_TOKEN`. No Tenzir-specific secrets are required. Grant at least `contents: write` on the calling job, and add any extra token scopes that your hooks need.

```yaml
jobs:
  release:
    uses: tenzir/ship/.github/workflows/release.yaml@<pinned-ref>
    permissions:
      contents: write
    with:
      intro: This release improves parser coverage and fixes packaging.
      bump: auto
```

### Workflow inputs

The workflow accepts the following inputs:

#### Release inputs

| Input            | Type    | Required | Default | Description                                             |
| ---------------- | ------- | -------- | ------- | ------------------------------------------------------- |
| `intro`          | string  | yes      |         | 1–2 sentence release introduction                       |
| `title`          | string  | no       |         | User-facing release title (auto-generated when empty)   |
| `bump`           | string  | no       | `""`    | Version bump type: `auto`, `major`, `minor`, or `patch` |
| `version`        | string  | no       | `""`    | Explicit stable release version (for example `v1.2.3`)  |
| `rc`             | boolean | no       | `false` | Create or continue the release-candidate series         |
| `changelog-root` | string  | no       | `.`     | Project root for `--root` flag                          |
| `git-add-paths`  | string  | no       | `""`    | Space-separated extra paths to stage before publish     |

#### Hook inputs

| Input          | Type   | Required | Default | Description                                                    |
| -------------- | ------ | -------- | ------- | -------------------------------------------------------------- |
| `pre-create`   | string | no       | `""`    | Shell script for quality gates (runs before `release create`)  |
| `post-create`  | string | no       | `""`    | Shell script for version bumping (runs after `release create`) |
| `pre-publish`  | string | no       | `""`    | Shell script that runs after create and before publish         |
| `post-publish` | string | no       | `""`    | Shell script that runs after publish and branch updates        |

Hooks run inline in the release job. Use `pre-create` for quality gates and `post-create` to update version files or generated artifacts. Use `pre-publish` and `post-publish` for steps that depend on the resolved version.

The `pre-publish` and `post-publish` hooks have access to these environment variables:

| Variable          | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `CHANGELOG_ROOT`  | Project root from `changelog-root` input                        |
| `RELEASE_VERSION` | Created release version tag (for example `v1.2.3`)              |
| `IS_LATEST`       | Whether the release is latest (`true` or `false`, post-publish) |
| `GH_TOKEN`        | Resolved auth token                                             |

#### Release control inputs

| Input                              | Type    | Required | Default | Description                                                    |
| ---------------------------------- | ------- | -------- | ------- | -------------------------------------------------------------- |
| `skip-publish`                     | boolean | no       | `false` | Create and prepare release but skip publish, tag, and push     |
| `create-github-release`            | boolean | no       | `true`  | Create the GitHub release; `false` stops after pushing the tag |
| `publish-no-latest-on-non-main`    | boolean | no       | `false` | Pass `--no-latest` on non-main branch releases                 |
| `copy-release-to-main-on-non-main` | boolean | no       | `false` | Copy release manifests back to `main` for non-main releases    |
| `update-latest-branch-on-main`     | boolean | no       | `false` | Force-update the `latest` branch when releasing from `main`    |

#### Auth inputs

| Input            | Type    | Required | Default                                                 | Description                                          |
| ---------------- | ------- | -------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `github_app_id`  | string  | no       | `""`                                                    | GitHub App ID used to mint a repository-scoped token |
| `use_push_token` | boolean | no       | `false`                                                 | Use `push_token` secret instead of the default token |
| `git_user_name`  | string  | no       | `github-actions[bot]`                                   | Git author name used for release commits             |
| `git_user_email` | string  | no       | `41898282+github-actions[bot]@users.noreply.github.com` | Git author email used for release commits            |

#### Signing inputs

| Input          | Type    | Required | Default | Description                             |
| -------------- | ------- | -------- | ------- | --------------------------------------- |
| `sign_commits` | boolean | no       | `false` | Sign commits when a GPG key is provided |
| `sign_tags`    | boolean | no       | `false` | Sign tags when a GPG key is provided    |

### Workflow secrets

| Secret                   | Required | Description                                 |
| ------------------------ | -------- | ------------------------------------------- |
| `push_token`             | no       | Token override when `use_push_token` is set |
| `github_app_private_key` | no       | Private key for GitHub App token generation |
| `gpg_private_key`        | no       | GPG key material for signing                |

### Workflow outputs

| Output      | Description                                        |
| ----------- | -------------------------------------------------- |
| `version`   | Created release version tag (for example `v1.2.3`) |
| `is_latest` | Whether the release should be treated as latest    |

### Auth modes

The workflow resolves authentication in this order:

1. **GitHub App token** - when `github_app_id` and `github_app_private_key` are set. Use this for repository-scoped bot automation with a short-lived token.
2. **Push token** - when `use_push_token: true` and `push_token` are set. Use this when you want to supply your own token for checkout, pushes, or publishing.
3. **Default `GITHUB_TOKEN`** - the caller repository’s built-in token. Use this when the workflow only needs to update the current repository.

Use `GITHUB_TOKEN` when you only need to update the current repository. Use `use_push_token: true` with `push_token`, or use a GitHub App token, when you need pushes or tags created by the workflow to trigger downstream automation.

### Auth and signing example

```yaml
jobs:
  release:
    uses: tenzir/ship/.github/workflows/release.yaml@<pinned-ref>
    permissions:
      contents: write
    with:
      intro: This release improves parser coverage and fixes packaging.
      github_app_id: ${{ vars.MY_GITHUB_APP_ID }}
      git_user_name: release-bot
      git_user_email: release-bot@example.com
      sign_commits: true
      sign_tags: true
      skip-publish: true
    secrets:
      github_app_private_key: ${{ secrets.MY_GITHUB_APP_PRIVATE_KEY }}
      gpg_private_key: ${{ secrets.MY_GPG_PRIVATE_KEY }}
```

To use a static token instead of a GitHub App, replace the App settings with `use_push_token: true` and pass `push_token` in `secrets:`.

## Configuration

Configuration settings live in `config.yaml` by default, or you can store them in `package.yaml` alongside the `changelog/` directory. `config.yaml` takes precedence when both exist.

Configuration fields:

| Field            | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `id`             | Canonical project slug written into entry frontmatter (required)         |
| `name`           | Human-friendly label surfaced in release titles and CLI output           |
| `description`    | Optional project description included in release manifests               |
| `repository`     | GitHub slug (e.g., `owner/repo`) required by `release publish`           |
| `export_style`   | Default layout: `compact` (bullet-list) or omit for detailed cards       |
| `explicit_links` | Render @mentions and #PR references as explicit Markdown links (boolean) |
| `omit_pr`        | Forbid PR numbers in unreleased entries (boolean, default `false`)       |
| `require_pr`     | Require PR numbers in unreleased entries (boolean, default `false`)      |
| `omit_author`    | Forbid authors in unreleased entries (boolean, default `false`)          |
| `require_author` | Require authors in unreleased entries (boolean, default `false`)         |
| `components`     | Optional dict mapping component names to descriptions                    |
| `modules`        | Optional glob pattern for discovering nested changelog projects          |
| `release`        | Release settings block (see below)                                       |

Example:

```yaml
id: tenzir-core
name: Tenzir Core
description: Core pipeline engine
repository: tenzir/tenzir
export_style: compact
explicit_links: true
require_pr: true
require_author: true
components:
  cli: Command-line interface and user commands
  engine: Core pipeline engine internals
  operators: Built-in pipeline operators
release:
  commit_message: "Release {version}"
  version_bump_mode: auto
  version_files:
    - ../python/pyproject.toml
```

The `release` block supports:

| Field               | Default             | Description                                              |
| ------------------- | ------------------- | -------------------------------------------------------- |
| `commit_message`    | `Release {version}` | Template for `--commit` flag; `{version}` expands        |
| `version_bump_mode` | `auto`              | `auto` to detect and update version files, `off` to skip |
| `version_files`     | `[]`                | Explicit list of paths to version files to update        |

### Version bumping

During `release create`, tenzir-ship can automatically update version fields in package manifest files. By default (`version_bump_mode: auto`), it searches the project root for `package.json`, `pyproject.toml`, `project.toml`, and `Cargo.toml` files and updates their version fields to match the release version.

#### Auto-detection behavior

In auto mode, files without a static version field are skipped gracefully:

* **pyproject.toml**: Updates `[project].version`. Falls back to `[tool.poetry].version` when `[project]` has `dynamic = ["version"]` or is absent. Skips files where neither section has a static version. When a sibling `uv.lock` exists, runs `uv lock` after updating the manifest so uv regenerates the lockfile metadata.
* **Cargo.toml**: Updates `[package].version`. Falls back to `[workspace.package].version` for workspace root manifests. Skips files where neither section has a version field.
* **package.json**: Updates the top-level `version` field. Skips files without one. When a sibling `package-lock.json` exists, updates the lockfile’s root package version metadata to match.
* **project.toml**: Same behavior as `pyproject.toml`.

#### Explicit version files

To specify exactly which files to update, use `version_files`:

```yaml
release:
  version_files:
    - ../pyproject.toml
    - ../Cargo.toml
```

Explicitly configured files use strict validation: the command fails if the file exists but has no recognizable version field, preventing silent misconfiguration. Auto-detected files skip silently instead.

#### Disabling version bumping

Set `version_bump_mode: off` to disable version file updates entirely.

#### Downgrade prevention

Version files are only updated when the release version is equal to or newer than the latest existing release. Editing an older release does not downgrade version fields in manifest files.

The `omit_pr` and `omit_author` options suppress PR numbers and author attribution in generated entries. When enabled, the CLI skips auto-detection and ignores any `--pr`, `--author`, or `--co-author` flags with a warning. The `validate` command reports an error for unreleased entries that carry `prs` or `authors` metadata despite the corresponding option. Use these options for projects that don’t use GitHub pull requests or prefer anonymous changelog entries.

The `require_pr` option enforces non-empty `prs` metadata on every unreleased entry. Use it when release notes must always link back to pull requests. Setting it together with `omit_pr` fails configuration loading. Use `validate --lenient` for pre-push hooks so missing PR numbers remain warnings until the pull request exists.

The `require_author` option enforces non-empty `authors` metadata on every unreleased entry. Setting it together with `omit_author` fails configuration loading. Missing authors remain errors in lenient mode.

These entry metadata policies are forward-looking. They apply to unreleased entries during normal validation and don’t invalidate published history when you change a policy. Run `validate --all-entries` to apply them to released entries too.

The first invocation of `tenzir-ship add` scaffolds a `changelog/` subdirectory with `config.yaml`, inferring defaults from the parent directory name. When you provide an explicit `--root` flag, the CLI uses that directory directly. Projects with `package.yaml` next to `changelog/` reuse the package `id` and `name` automatically.

## Entry file format

Entry files live in `unreleased/` or `releases/<version>/entries/` as Markdown files with YAML frontmatter. The CLI names entry files using the slugified title (e.g., `my-feature.md`, `fix-bug.md`).

The containing directory defines the entry’s namespace. A slug must be unique within `unreleased/` or one release’s `entries/` directory, but the same slug may appear again in another release. Release manifests resolve every listed ID against their own release directory.

Example entry:

```markdown
---
title: Add pipeline builder
type: feature
author: alice
created: 2025-10-16T14:30:00Z
pr: 101
component: cli
---


Introduces the new pipeline builder UI with drag-and-drop support.
```

You can use either singular (`author`, `pr`, `component`) or plural (`authors`, `prs`, `components`) keys. The singular form is shorthand for single values and is normalized to the plural form internally.

Frontmatter fields:

| Field                      | Type          | Required | Description                                    |
| -------------------------- | ------------- | -------- | ---------------------------------------------- |
| `title`                    | string        | yes      | Entry title                                    |
| `type`                     | string        | yes      | `breaking`, `feature`, `bugfix`, or `change`   |
| `author` / `authors`       | list\[string] | no       | Human contributor names (singular or plural)   |
| `created`                  | string        | yes      | Creation datetime in ISO 8601 UTC format       |
| `pr` / `prs`               | list\[int]    | no       | Pull request numbers (singular or plural form) |
| `component` / `components` | list\[string] | no       | Labels matching configured components          |

## Release manifest format

Release manifests live at `releases/<version>/manifest.yaml` and record metadata about a release.

Example manifest:

```yaml
created: 2025-10-18
title: Big Release
intro: |
  Welcome to version 1.0.0!


  This release includes significant performance improvements.
```

Manifest fields:

| Field     | Type   | Required | Description                                      |
| --------- | ------ | -------- | ------------------------------------------------ |
| `created` | string | yes      | Release date in `YYYY-MM-DD` format              |
| `title`   | string | no       | Custom title for the release heading             |
| `intro`   | string | no       | Introductory content (supports Markdown)         |
| `modules` | dict   | no       | Module versions at release time (auto-populated) |

The `modules` field is automatically populated when creating a release for a parent project with configured modules. It maps module IDs to their latest versions, enabling incremental module summaries in subsequent releases.

Example manifest with modules:

```yaml
created: 2025-10-18
title: Marketplace v1.0.0
intro: |
  Initial release with all plugins.
modules:
  git: v1.0.0
  docs: v1.1.0
  changelog: v1.2.0
```

The CLI generates `notes.md` with an H1 heading followed by the intro and grouped entry sections. The heading format depends on whether a custom title is set:

* **With custom title**: `# {title}` (e.g., `# Big Release`)
* **Without title**: `# {name} {version}` (e.g., `# My Project v1.0.0`)

Intro content comes from either `--intro` (inline text) or `--intro-file` (file path) when creating a release.

## JSON export format

JSON exports (`-j` flag) return structured objects for programmatic consumption. Entries include `prs` and `authors` fields as structured objects with URLs.

### PR objects

Each PR is an object with `number` and optional `url`:

```json
{
  "prs": [
    {"number": 123, "url": "https://github.com/owner/repo/pull/123"},
    {"number": 456, "url": "https://github.com/owner/repo/pull/456"}
  ]
}
```

The `url` field is included when the project’s `repository` setting is configured. Without a repository, PRs contain only the `number` field.

### Author objects

Each author is an object with either `handle` + `url` (for GitHub handles) or `name` (for full names):

```json
{
  "authors": [
    {"handle": "alice", "url": "https://github.com/alice"},
    {"name": "Bob Smith"}
  ]
}
```

GitHub handles (names without spaces) include a `url` field linking to the user’s profile. Full names (containing spaces) include only the `name` field.

## Environment variables

The CLI recognizes these environment variables:

| Variable       | Description                                      |
| -------------- | ------------------------------------------------ |
| `GITHUB_TOKEN` | GitHub token with `repo` scope for private repos |

## Modules

Modules enable monorepo support by discovering nested changelog projects via a glob pattern. Each module is a fully independent project with its own configuration, versioning, and release cycle. The parent project serves as a **workspace** that provides discovery and aggregated views.

### Configuration

Add a `modules` field to your parent project’s `config.yaml`:

```yaml
id: library
name: Tenzir Library
modules: "../packages/*/changelog"
```

The glob pattern resolves relative to the changelog root directory. Each matched directory must contain a valid `config.yaml` with its own `id` and `name`:

```yaml
id: amazon_vpc_flow
name: Amazon VPC Flow Package
```

### Parent as workspace

When a parent project defines `modules`, it typically acts as a workspace coordinator rather than a versioned project itself. The parent provides:

* **Discovery**: Automatically finds modules matching the glob pattern
* **Aggregation**: Shows entries from all modules in unified views
* **Validation**: Checks module ID uniqueness and configuration validity

The parent may or may not have its own releases. A parent without releases exists purely for coordination.

### Aggregated views

When `modules` is configured, `show` includes entries from all modules. The table displays a **Project** column showing which project (parent or module) each entry belongs to:

```sh
# Show all entries (parent + modules)
tenzir-ship show


# Show only parent entries
tenzir-ship show --project parent
```

### Aggregated release summaries

When creating a release for a parent project, `release create` automatically appends a summary of module changes to the release notes. Each module with new entries since the previous parent release gets a section showing:

* The module name and version as a heading
* A compact bullet list of entries with emoji prefix, title, and byline

```markdown
---


## Git Plugin v1.1.0


- 🚀 Add commit message templates  -  *@alice*
- 🐞 Fix branch detection  -  *@bob and @carol*


## Docs Plugin v1.2.0


- 🔧 Improve search indexing  -  *@alice*
```

The release manifest records each module’s version at release time in the `modules` field. Subsequent releases compare against this baseline and only include entries from module releases newer than the recorded version. This prevents duplicate entries across parent releases.

The `show --release` command also renders module summaries when viewing a specific release, using the same incremental logic based on the manifest’s recorded module versions.

### Operating on modules

Each module is a standalone changelog project. Use `--root` to operate on a specific module:

```sh
# Add entry to a module
tenzir-ship --root ../packages/amazon_vpc_flow/changelog add --title "Add parser"


# Create a release for a module
tenzir-ship --root ../packages/amazon_vpc_flow/changelog release create v1.0.0
```

The `--show-modules` option lists discovered modules with their paths for convenient copy-paste into `--root` flags.

### Independent versioning

Each module maintains its own version history and releases on its own schedule. There is no coordinated release mechanism - modules evolve independently.

Typically, modules do not publish GitHub releases themselves. Instead, the parent workspace handles distribution (e.g., bundling modules into a product release or publishing to a package registry). Modules that need to publish standalone GitHub releases can add a `repository` field to their configuration.

### Validation

When `modules` is configured, `tenzir-ship validate` checks:

* Module ID uniqueness across all discovered modules
* Valid configuration in each module directory

## Troubleshooting

* **Validation errors** – Run `tenzir-ship validate` to identify missing metadata, missing release-local entry files, or duplicate IDs within one manifest.
* **Component mismatch** – When `components` is configured, ensure every entry either omits `component` or uses an allowed label.
* **Configuration not found** – Ensure `config.yaml` exists in the changelog root or `package.yaml` sits next to the `changelog/` directory. Run `tenzir-ship init` to scaffold the workspace, or let `tenzir-ship add` bootstrap it while creating the first entry.
* **Version bump fails** – Bump flags resolve from the latest stable release on disk. Create an initial stable release with an explicit version before using `--patch/--minor/--major`. If a release candidate is already outstanding, continue that series with `--rc` or promote it with `release create`.
* **Version file update fails** – In `release.version_bump_mode: auto`, the CLI must parse every detected/configured version file. Use supported files (`package.json`, `pyproject.toml`, `project.toml`, `Cargo.toml`) or set `release.version_bump_mode: off` and handle updates in your workflow script. When `package.json` has a sibling `package-lock.json`, tenzir-ship also parses the lockfile to keep root package version metadata in sync. When `pyproject.toml` has a sibling `uv.lock`, tenzir-ship requires `uv` on `PATH` and runs `uv lock` after updating the manifest.

## Further reading

* [Maintain a changelog](../guides/packages/maintain-a-changelog.md)
