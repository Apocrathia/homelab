// CryptPad configuration for Kubernetes deployment
module.exports = {
  // Main domain for privileged content (authentication, keys)
  httpUnsafeOrigin: "https://cryptpad.gateway.services.apocrathia.com",

  // Sandbox domain for UI content (XSS protection)
  httpSafeOrigin: "https://cryptpad-sandbox.gateway.services.apocrathia.com",

  // Listen on all interfaces
  httpAddress: "0.0.0.0",

  // HTTP port
  httpPort: 3000,

  // WebSocket port
  websocketPort: 3003,

  // Installation method
  installMethod: "docker",

  // Cap HTTP workers (default: one per CPU = 16 on these nodes; 16 x 2026.5.1
  // workers OOM-kills the 1Gi pod). Upstream example value.
  maxWorkers: 4,

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
