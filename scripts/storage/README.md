# Storage IO Benchmarking

## Quick Start

### Option 1: Quick Test (Recommended)

Run a quick test that shows volume placement and runs a simple benchmark:

```bash
./scripts/storage/quick-io-test.sh
```

This will:

- Show which node the pod is running on
- Show Longhorn volume replica placement
- Check if volume is attached to the same node (data locality)
- Run a quick 30-second random write test

### Option 2: Full Benchmark Suite

Run the complete benchmark pod with all 6 test patterns:

```bash
# Apply the benchmark pod
kubectl apply -f scripts/storage/io-benchmark-pod.yaml

# Wait for pod to be ready
kubectl wait --for=condition=ready pod/io-benchmark -n storage-test --timeout=300s

# Watch the logs (benchmark runs automatically, takes ~6 minutes)
kubectl logs -f io-benchmark -n storage-test

# After completion, view detailed results
kubectl exec -n storage-test io-benchmark -- cat /data/benchmark/seq-read.json
kubectl exec -n storage-test io-benchmark -- cat /data/benchmark/rand-read.json
kubectl exec -n storage-test io-benchmark -- cat /data/benchmark/latency.json
```

## What It Tests

The benchmark runs 6 different IO patterns:

1. **Sequential Read** - Large block sequential reads (1MB blocks, 4 jobs)
2. **Sequential Write** - Large block sequential writes (1MB blocks, 4 jobs)
3. **Random Read** - Small block random reads (4KB blocks, 16 jobs)
4. **Random Write** - Small block random writes (4KB blocks, 16 jobs)
5. **Mixed Random** - 70% read / 30% write mix (4KB blocks, 16 jobs)
6. **Latency Test** - Single job, queue depth 1 to measure pure latency

## Metrics Collected

Each test reports:

- **Bandwidth (bw)**: MB/s throughput
- **IOPS**: Operations per second
- **Latency (lat)**:
  - Mean latency
  - p50, p95, p99 percentiles
  - Min/Max latency

## Cleanup

```bash
# Delete the benchmark resources
kubectl delete -f scripts/storage/io-benchmark-pod.yaml
```

## Interpreting Results

### Good Performance Indicators

- **Sequential Read/Write**: Should be > 500 MB/s for NVMe-backed storage
- **Random Read IOPS**: Should be > 50,000 IOPS for NVMe
- **Random Write IOPS**: Should be > 30,000 IOPS for NVMe
- **Latency (p99)**: Should be < 1ms for local NVMe, < 5ms for network storage

### Red Flags

- **Latency > 10ms**: Indicates network storage issues or overload
- **IOPS < 1,000**: Very poor performance, likely network bottleneck
- **Bandwidth < 100 MB/s**: Network or configuration issue

## Customizing Tests

Edit `io-benchmark-pod.yaml` to adjust:

- `--size`: Test data size (default: 5G)
- `--runtime`: Test duration in seconds (default: 60)
- `--bs`: Block size (1M for sequential, 4k for random)
- `--numjobs`: Number of parallel jobs
- `--iodepth`: Queue depth

## Comparing Before/After

Run the benchmark:

1. **Before** optimizing Ceph settings
2. **After** applying Ceph optimizations
3. **After** migrating to raw NVMe + Longhorn strict-local

Compare the latency and IOPS metrics to quantify improvements.
