---
title: "Inspect a node"
canonical: https://tenzir.com/docs/guides/observability/inspect-a-node
source: https://tenzir.com/docs/guides/observability/inspect-a-node.md
section: "Docs"
---

# Inspect a node

> When something goes wrong, the answers are often in the node’s logs, metrics, and diagnostics. This guide shows you how to connect to a node and work through them: identify what changed, find errors in the logs, check for unexpected restarts, spot failing pipelines, see what consumes the CPU, and capture a reproducible sample you can share with Tenzir support.

When something goes wrong, the answers are often in the node’s logs, metrics, and diagnostics. This guide shows you how to connect to a node and work through them: identify what changed, find errors in the logs, check for unexpected restarts, spot failing pipelines, see what consumes the CPU, and capture a reproducible sample you can share with Tenzir support.

## Connect to the node

To investigate a node, you need to be able to run queries against it. How you connect depends on your setup.

**In the browser**: the Explorer at [app.tenzir.com](https://app.tenzir.com) lets you type and run pipelines directly. See [Run pipelines](../basic-usage/run-pipelines.md) for details.

**On the command line**: the node listens on `127.0.0.1:5158` by default. Connect using the `-e` flag:

```sh
tenzir -e localhost 'version | drop dependencies'
```

If you don’t have `tenzir` installed locally, use `uvx`:

```sh
uvx tenzir -e localhost 'version | drop dependencies'
```

Set `TENZIR_ENDPOINT` to avoid repeating the flag on every command:

```sh
export TENZIR_ENDPOINT=localhost
tenzir 'diagnostics'
```

**Inside Docker**: the `tenzir` binary is pre-installed in the node image and `TENZIR_ENDPOINT` is already set, so you can exec in directly:

```sh
docker exec <container> tenzir 'version | drop dependencies'
docker compose exec node tenzir 'version | drop dependencies'
```

Caution

For security reasons, the default endpoint `127.0.0.1:5158` accepts connections only from the same machine. You can configure the node to listen on a network-accessible address, but you shouldn’t: anyone with network access to the endpoint gains full access to the node. See [Configure a node](../node-setup/configure-a-node.md#accept-incoming-connections).

## Identify what changed

If the node started misbehaving after an update or deployment, the first thing to check is what version is running and whether anything relevant changed.

Run `version` to see what’s deployed:

```tql
version | drop dependencies
```

```tql
{
  version: "6.6.0",
  tag: "unknown",
  major: 6,
  minor: 6,
  patch: 0,
  // ...
}
```

If you don’t have CLI access yet, two other places show the version:

* **Startup logs**: the node prints the version in its banner on every start. Run `docker logs <container> | head -10` or `journalctl -u tenzir-node | head -10`.

  ```plaintext
       _____ _____ _   _ ________ ____
      |_   _| ____| \ | |__  /_ _|  _ \
        | | |  _| |  \| | / / | || |_) |
        | | | |___| |\  |/ /_ | ||  _ <
        |_| |_____|_| \_/____|___|_| \_\


                     6.6.0
  ```

* **Platform UI**: the node version appears on the node details page at [app.tenzir.com](https://app.tenzir.com).

Once you have the version, check the [changelog](https://tenzir.com/changelog.md) to see what changed between the previous version and the current one. Unexpected behavior after an upgrade often traces back to a breaking change or a behavioral adjustment listed there.

Configuration changes are the other usual suspect. The [`config`](https://tenzir.com/docs/reference/functions/config.md) function returns the configuration the process actually uses, merged from `tenzir.yaml` files, plugin configuration files, environment variables, and command-line options, so you can check whether a setting really has the value you expect:

```tql
from config()
```

The output omits `tenzir.secrets` and `tenzir.token`, so it doesn’t leak credentials when you share it.

Note

`config()` evaluates where the pipeline runs. A pipeline on the node, deployed or run from the Explorer, returns the node’s configuration. An ad-hoc run over `tenzir -e` returns your local CLI’s configuration instead, which can differ from what the node uses.

## Find errors in the logs

When the node fails to start, loses a connection, or hits a resource limit, the logs have the details. The node writes to two places: a **log file** and the **console**.

In Docker and Docker Compose, read from the console, where container runtimes capture output:

```sh
docker logs <container>
docker logs -f <container>
docker compose logs -f node
```

On systemd, the console output goes to journald:

```sh
journalctl -u tenzir-node
journalctl -u tenzir-node -f
```

For direct host deployments, the node writes `server.log` in its state directory. Read it there, or change the path with `tenzir.log-file` in `tenzir.yaml` or `TENZIR_LOG_FILE` as an environment variable.

The file and console use different formats. The log file includes the severity level in brackets:

```plaintext
[2026-07-01T14:24:37.074+00:00] [tenzir] [warning] [platform_client.cpp:397] failed to connect platform websocket
```

The console format is shorter, and warnings and errors appear as structured records:

```plaintext
[14:24:37.074] {severity: "warning", message: "failed to connect platform websocket", ...}
```

Filter for problems depending on which source you’re reading:

```sh
# Log file
grep -E '\[warning\]|\[error\]|\[critical\]' /path/to/server.log


# Docker console
docker logs <container> 2>&1 | grep -E '"warning"|"error"|"critical"'
```

If the default log level isn’t showing enough detail, raise it. The valid levels are `quiet`, `error`, `warning`, `info`, `verbose`, and `debug`. Set them independently for the file and console:

tenzir.yaml

```yaml
tenzir:
  file-verbosity: info
  console-verbosity: warning
```

Or via environment variables:

```sh
TENZIR_FILE_VERBOSITY=info
TENZIR_CONSOLE_VERBOSITY=warning
```

See [Tune performance](../node-setup/tune-performance.md#logging) for rotation and queue size options.

## Check for unexpected restarts

If your data has gaps, memory usage climbs steadily and then drops sharply, or an ad-hoc pipeline run lost its connection, the node may have restarted, often because it ran out of memory and the kernel killed it. Deployed pipelines come back up with the node, so everything can look normal again by the time you investigate.

The node’s own logs tell you when each restart happened: every start writes a listen line at `info` level, to both the console and the log file:

```sh
docker logs <container> 2>&1 | grep 'node listens'
grep 'node listens' /path/to/server.log
```

```plaintext
[14:24:37.016] node listens for node-to-node connections on tcp://0.0.0.0:5158
[19:57:51.200] node listens for node-to-node connections on tcp://0.0.0.0:5158
```

Each match is one start, and the last match is when the current run began. A crash or kill also leaves a mark in the log file: there are no shutdown messages; the log jumps, sometimes mid-line, from normal operation straight into the next start.

Metrics tell the same story from inside the node. The node records process metrics every second and stores them durably, so a restart shows up as a gap in the series. Because the history survives the restart, you can watch memory climb toward the kill even after the node came back:

```tql
metrics "process"
where timestamp > now() - 2h
sort timestamp
select timestamp, current_memory_usage
```

To confirm why the node restarted, ask the runtime that supervised it. In Docker, inspect the container state:

```sh
docker inspect -f 'OOMKilled={{.State.OOMKilled}} ExitCode={{.State.ExitCode}} Restarts={{.RestartCount}}' <container>
```

`OOMKilled=true` means the kernel killed the container because it exceeded its memory limit, and exit code `137` is the `SIGKILL` it uses. For history beyond the current run, `docker events --filter event=oom` lists past OOM kills. On a Linux host without Docker, the kernel’s out-of-memory messages are in `journalctl -k`, and `journalctl -u tenzir-node` shows when systemd restarted the service.

If the node was killed for memory, raise its memory limit or investigate what consumes it. See [Size a node](../node-setup/size-a-node.md) for sizing guidance.

## Find failing pipelines

If a pipeline is failing, producing no output, or stopping unexpectedly, diagnostics tell you what went wrong. Unlike logs, diagnostics are pipeline-level events stored inside the node: they survive restarts and are queryable with TQL.

Check for recent errors across all pipelines:

```tql
diagnostics
where severity == "error"
select timestamp, pipeline_id, pipeline_name, message
```

Narrow to the last hour if you’re investigating a recent incident:

```tql
diagnostics
where severity == "error"
where timestamp > now() - 1h
select timestamp, pipeline_id, pipeline_name, message
```

Watch for new errors as they arrive:

```tql
diagnostics live=true
where severity == "error"
select timestamp, pipeline_id, pipeline_name, message
```

Each diagnostic carries the error `message` along with the `pipeline_id` and `pipeline_name` of the pipeline that triggered it. Use the ID to find the pipeline in the Explorer or correlate it with metrics. On the command line, [`pipeline_list`](https://tenzir.com/docs/reference/operators/pipeline_list.md) resolves the ID to the pipeline’s state and definition:

```tql
pipeline_list
where id == "1b2786b6-7bf9-4285-9621-6a4feeed62ad"
select name, state, definition
```

```tql
{
  name: "sparkling-vibrant-sonnet",
  state: "failed",
  definition: "demo::suricata speed=1.0\npublish \"suricata\"",
}
```

Once you’ve addressed the cause, restart the pipeline from its page in the platform; deployed pipelines can’t be restarted from the command line.

Pipelines that fail on transient conditions, such as a remote service that is temporarily unreachable, don’t need this manual round trip: enable automatic restarts and the node brings them back on its own. Configure it in the pipeline’s settings in the platform, or with the `restart-on-error` option for pipelines deployed as code, as described in [Run pipelines](../basic-usage/run-pipelines.md#as-code).

Note

Diagnostics only capture errors from pipelines deployed to the node. Errors from ad-hoc CLI runs, such as `tenzir -e localhost '...'`, print to standard error instead and don’t appear here.

## Find what consumes the CPU

When everything on the node feels slow, with queries queuing up and dashboards lagging, check whether the machine itself is saturated. The node records the system load averages once per second:

```tql
metrics "cpu"
sort timestamp
tail 1
select timestamp, loadavg_1m, loadavg_5m, loadavg_15m
```

```tql
{
  timestamp: 2026-07-13T16:48:27.856965962Z,
  loadavg_1m: 4.7802734375,
  loadavg_5m: 4.6962890625,
  loadavg_15m: 4.8642578125,
}
```

The load average counts tasks that are running or waiting to run, so it can exceed the number of cores. A value that stays above the machine’s core count means tasks are queuing for CPU time. To see which pipelines cause the load, rank all operators across all pipelines by CPU usage:

```tql
metrics "operator_profile"
where timestamp > now() - 10min
summarize pipeline_id, name, cpu=mean(cpu)
sort -cpu
head 10
```

```tql
{
  pipeline_id: "1b2786b6-7bf9-4285-9621-6a4feeed62ad",
  name: "read_suricata",
  cpu: 87.57522687018981,
}
{
  pipeline_id: "1b2786b6-7bf9-4285-9621-6a4feeed62ad",
  name: "sort",
  cpu: 31.151290910992927,
}
// ...
```

Unlike most other metrics, `operator_profile` carries only the pipeline ID, not the name. Resolve it with `pipeline_list`, as described in [Find failing pipelines](inspect-a-node.md#find-failing-pipelines). Deployed pipelines and interactive queries compete for the same cores, so a few compute-heavy pipelines can stall the Explorer and ad-hoc runs for everyone. To find out why the top pipeline is expensive, see [Investigate slow pipelines](../troubleshooting/investigate-slow-pipelines.md#find-the-slow-operator).

## Build a reproducible sample

When a pipeline behaves unexpectedly, replace the real data source with a synthetic event using `from {}`. This removes all external dependencies (no live feeds, no files, no credentials) and gives you something you can share with a colleague or paste into a support request.

Say your pipeline is supposed to filter alerts above a certain count threshold, but nothing comes through. You suspect a type issue. Replace the source with a minimal event that matches the shape of your real data:

```tql
from {event_type: "alert", severity: "high", count: "3"}
where count > 2
```

This produces no events, but the node emits two warnings:

```plaintext
warning: binary operator `gt` not implemented for `string` and `int64`
 --> <input>:2:7
  |
2 | where count > 2
  |       ~~~~~~~~~
  |
  = hint: the result of this expression is `null`


warning: expected `bool`, got `null`
 --> <input>:2:7
  |
2 | where count > 2
  |       ~~~~~~~~~
  |
```

The `count` field came in as a string from the source, but the filter compares it as an integer. The warning confirms the mismatch. Strip away everything that isn’t relevant to the problem, save it to a file, and share it:

```sh
tenzir -f reproducer.tql
```

A good reproducer runs without external dependencies, shows the unexpected behavior in as few operators as possible, and produces the same result for anyone who runs it. Keeping the file around also lets you re-run it against a later version to confirm the issue is fixed.

## See also

* [`config`](https://tenzir.com/docs/reference/functions/config.md)
* [Run pipelines](../basic-usage/run-pipelines.md)
* [Configure a node](../node-setup/configure-a-node.md)
* [Tune performance](../node-setup/tune-performance.md)
