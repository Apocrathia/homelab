# Clearing the Authentik Task Queue

Instructions for managing the Dramatiq task queue in authentik 2025.10+.

> **⚠️ Historical Context**: This document documents a workaround for worker OOM issues that occurred after the 2025.10 upgrade. The root cause has been identified and addressed by the authentik team ([Issue #18915](https://github.com/goauthentik/authentik/issues/18915)). The fix is expected in authentik 2025.12.0. This document is retained for historical reference and will become obsolete once the fix is deployed.

> **Note**: As of 2025.10, authentik uses Dramatiq with PostgreSQL instead of Celery/Redis.
> Tasks are stored in the `authentik_tasks_task` table.

## Prerequisites

- `kubectl` access to the cluster
- Authentik deployed in the `authentik` namespace

## Important: Use Server Pods

**Always run these commands from a server pod**, not worker pods. Workers are
likely OOMing (see [Issue #18915](https://github.com/goauthentik/authentik/issues/18915)) and will abort your commands.

```bash
# Get a server pod name
SERVER_POD=$(kubectl get pods -n authentik -l app.kubernetes.io/component=server -o jsonpath='{.items[0].metadata.name}')
```

## Option 1: Admin UI

View and manage tasks via the web interface:

1. Navigate to **Admin Interface** → **Dashboards** → **System Tasks**
2. Deselect "Exclude successful tasks" to see all tasks
3. Failed tasks can be retried by clicking the retry arrow

## Option 2: Flush All Queued Tasks (Validated ✓)

Clear all queued tasks using the broker flush method:

```bash
kubectl exec -n authentik $SERVER_POD -c server -- ak shell -c "
from authentik.tasks.broker import Broker
from authentik.tasks.models import Task

before = Task.objects.filter(state='queued').count()
print(f'Queued tasks before: {before}')

Broker().flush('default')

after = Task.objects.filter(state='queued').count()
print(f'Queued tasks after: {after}')
print(f'Deleted: {before - after}')
"
```

> **Warning**: `broker.flush('default')` deletes ALL tasks in the queue (including
> completed/done), not just queued tasks. Use selective deletion if you want to
> preserve task history.

## Option 3: Selective Deletion via Django ORM (Validated ✓)

Delete specific task types while preserving others:

```bash
# Check what's queued first
kubectl exec -n authentik $SERVER_POD -c server -- ak shell -c "
from authentik.tasks.models import Task
from django.db.models import Count

print('=== Queued tasks by actor ===')
for row in Task.objects.filter(state='queued').values('actor_name').annotate(c=Count('message_id')).order_by('-c')[:15]:
    print(f'  {row[\"actor_name\"]}: {row[\"c\"]}')
"

# Delete only outpost_send_update tasks
kubectl exec -n authentik $SERVER_POD -c server -- ak shell -c "
from authentik.tasks.models import Task

deleted, _ = Task.objects.filter(
    state='queued',
    actor_name='authentik.outposts.tasks.outpost_send_update'
).delete()
print(f'Deleted {deleted} outpost_send_update tasks')
"

# Delete only queued tasks (preserve history)
kubectl exec -n authentik $SERVER_POD -c server -- ak shell -c "
from authentik.tasks.models import Task

deleted, _ = Task.objects.filter(state='queued').delete()
print(f'Deleted {deleted} queued tasks')
"
```

## Option 4: Scale Down, Flush, Scale Up

Controlled approach with worker downtime:

```bash
# Scale down workers
kubectl scale deployment -n authentik authentik-worker --replicas=0

# Wait for pods to terminate
kubectl wait --for=delete pod -n authentik -l app.kubernetes.io/component=worker --timeout=120s

# Flush via server pod (see Option 2 or 3)

# Scale workers back up
kubectl scale deployment -n authentik authentik-worker --replicas=2
```

## Monitoring Commands (Validated ✓)

Check current task queue status:

```bash
# Task count by state
kubectl exec -n authentik $SERVER_POD -c server -- ak shell -c "
from authentik.tasks.models import Task
from django.db.models import Count

for row in Task.objects.values('state').annotate(c=Count('message_id')).order_by('-c'):
    print(f'{row[\"state\"]}: {row[\"c\"]}')
"

# Top task types by count
kubectl exec -n authentik $SERVER_POD -c server -- ak shell -c "
from authentik.tasks.models import Task
from django.db.models import Count

for row in Task.objects.values('actor_name').annotate(c=Count('message_id')).order_by('-c')[:10]:
    print(f'{row[\"actor_name\"]}: {row[\"c\"]}')
"
```

## Task Table Schema

The `authentik_tasks_task` table has these relevant columns:

| Column       | Type      | Description                                                           |
| ------------ | --------- | --------------------------------------------------------------------- |
| `message_id` | UUID      | Primary key                                                           |
| `queue_name` | Text      | Queue name (typically `default`)                                      |
| `actor_name` | Text      | Full task name (e.g., `authentik.outposts.tasks.outpost_send_update`) |
| `state`      | Char      | `queued`, `consumed`, `running`, `done`, `rejected`, `postprocess`    |
| `mtime`      | Timestamp | Last modified time                                                    |

## Relevant Worker Settings

| Setting                                | Default     | Description                  |
| -------------------------------------- | ----------- | ---------------------------- |
| `AUTHENTIK_WORKER__THREADS`            | `4`         | Worker threads per process   |
| `AUTHENTIK_WORKER__PROCESSES`          | `1`         | Worker processes             |
| `AUTHENTIK_WORKER__TASK_EXPIRATION`    | `30`        | Days to keep completed tasks |
| `AUTHENTIK_WORKER__TASK_MAX_RETRIES`   | `3`         | Max retries for failed tasks |
| `AUTHENTIK_WORKER__SCHEDULER_INTERVAL` | `minutes=5` | How often scheduler runs     |

## Post-Clear Steps

After clearing the queue:

1. Monitor worker memory: `kubectl top pods -n authentik`
2. Watch for queue re-accumulation:
   ```bash
   watch -n 10 "kubectl exec -n authentik $SERVER_POD -c server -- ak shell -c \"from authentik.tasks.models import Task; print('Queued:', Task.objects.filter(state='queued').count())\""
   ```
3. Check worker restarts: `kubectl get pods -n authentik -l app.kubernetes.io/component=worker`

## Notes

- `broker.flush()` is aggressive - it clears ALL tasks, not just queued
- Use Django ORM deletion for selective clearing
- `blueprints_discovery` will re-run on next scheduler interval or worker restart
- Outpost updates may need manual trigger via Admin UI if connectivity issues occur
