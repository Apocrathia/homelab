// CryptPad configuration for Kubernetes deployment.
// 2026.10.0: origins, bind address, and ports moved to infra.js (topology
// config loaded by lib/load-config.js); only app-level keys live here.
module.exports = {
  // Installation method
  installMethod: "docker",

  // Cap worker processes per node pool. 2026.10.0 splits the server into
  // http/front/core/storage processes, each spawning a worker pool; the old
  // flat number is ignored and the 2-per-pool example default totals ~12
  // node processes, which re-creates the OOM that once killed this pod
  // (16 per-CPU workers at 2026.5.1). 1 per pool keeps ~8 processes in the
  // 1Gi limit. cryptpad-server reads "storage-http" for the storage blob
  // server; upstream's config.example.js spells it "http-storage", which
  // the code ignores (falls back to 2).
  maxWorkers: {
    core: 1,
    storage: 1,
    http: 1,
    "storage-http": 1,
  },

  // Logging
  logToStdout: true,
  logLevel: "info",

  // Storage paths (pointing to SMB mount at /data)
  filePath: "/data/datastore/",
  archivePath: "/data/archive",
  pinPath: "/data/pins",
  taskPath: "/data/tasks",
  blockPath: "/data/block",
  blobPath: "/data/blob",
  blobStagingPath: "/data/blobstage",
  decreePath: "/data/decrees",
  logPath: "/data/logs",

  // Admin keys (add your public signing key from settings page)
  adminKeys: [],
};
