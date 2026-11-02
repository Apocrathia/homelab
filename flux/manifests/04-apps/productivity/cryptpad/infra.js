// CryptPad 2026.10.0 infrastructure topology, modeled on upstream
// config/infra.example.js. lib/load-config.js reads it from
// ../config/infra.js (CRYPTPAD_CONFIG_INFRA overrides); mounting it here
// also skips the entrypoint's fallback copy, which cannot write into the
// root-owned /cryptpad/config the kubelet creates for these subPath mounts.
module.exports = {
  // The single "http" process binds httpHost:httpPort for origin and
  // httpHost:httpSafePort for a second server serving the same app. Both
  // gateway hostnames keep routing to httpPort (upstream example.nginx.conf
  // proxies both domains to one port), so httpSafePort stays unexposed.
  public: {
    origin: "https://cryptpad.gateway.services.apocrathia.com",
    sandboxOrigin: "https://cryptpad-sandbox.gateway.services.apocrathia.com",
    // All-interfaces bind: upstream's "localhost" default never answers probes.
    httpHost: "0.0.0.0",
    httpPort: 3000,
    httpSafePort: 3001,
    externalWebsocketURL: undefined,
    fileHost: undefined,
    httpServerId: "",
  },
  // Single-pod topology: cryptpad-server forks one process per entry plus the
  // http process; all nodes talk over loopback. Browser websockets hit
  // httpPort and are proxied to "front" (public http+ws), "core" is the
  // mesh hub, "storage" serves blob/block on port and its cluster on wsPort.
  // Keep app.replicas at 1: more replicas fork separate mesh clusters.
  front: [{ host: "127.0.0.1", port: 3010 }],
  core: [{ host: "127.0.0.1", port: 3020 }],
  storage: [{ host: "127.0.0.1", port: 3030, wsPort: 3040 }],
};
