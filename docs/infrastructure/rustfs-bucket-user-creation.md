# RustFS: bucket, user, and policy creation

Use this when an app needs **new object storage** on the NAS RustFS instance
(creating a consumer bucket + scoped credentials), or when you need to
recreate one after an incident. This is the standard onboarding path for
every RustFS consumer in the homelab.

## Facts (verified 2026-09-10/11)

- Endpoint: `http://storage.services.apocrathia.com:9009` (S3 API **and**
  admin API on the same port; no TLS on the LAN segment)
- Build: RustFS `1.0.0-beta.12`, data root `/mnt/Pool/Backup/S3`
  (rustfs-only folder; relocated 2026-09-11 out of the Library SMB share)
- Root credentials: 1Password item **`rustfs-terraform-secrets`**
  (`username` / `credential` fields)
- The web console is **not exposed on the LAN** (only 9009 answers; the
  console default port 9001 has nothing listening). Console access requires
  a port-forward or enabling `RUSTFS_CONSOLE_ADDRESS` on the NAS — see
  [Console (manual) path](#console-manual-path).
- Management model is **manual** (admin API), same as the old MinIO. A
  Terraform route was built and validated, then backed out: the AWS provider
  cannot manage users, and the rustfs-native provider stores user secrets in
  state. See `docs/plans/minio-to-rustfs-migration.md` for the decision.

## Preferred path: admin API (agent-driven)

All four steps are HTTP calls to the same endpoint, SigV4-signed with the
**root** credentials, `service=s3`, `region=us-east-1`. The signing must
cover **query parameters** — the admin API rejects unsigned query strings.

The `op` CLI (1Password) provides the root credentials:

```python
ROOT_AK = subprocess.run(["op","item","get","rustfs-terraform-secrets",
                          "--fields","username","--reveal"],
                         capture_output=True, text=True).stdout.strip()
ROOT_SK = subprocess.run(["op","item","get","rustfs-terraform-secrets",
                          "--fields","credential","--reveal"],
                         capture_output=True, text=True).stdout.strip()
```

Minimal SigV4 signer that works for both the S3 and admin APIs (query params
included in the canonical request):

```python
import hashlib, hmac, urllib.parse
from datetime import datetime, timezone

def sigv4_headers(method, url, ak, sk, payload=b"", service="s3", region="us-east-1"):
    u = urllib.parse.urlparse(url)
    host, port = u.hostname, u.port or (443 if u.scheme == "https" else 80)
    amz_date = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    datestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    payload_hash = hashlib.sha256(payload).hexdigest()
    q = sorted(urllib.parse.parse_qsl(u.query, keep_blank_values=True))
    cq = "&".join(f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}" for k, v in q)
    host_header = f"{host}:{port}"
    ch = f"host:{host_header}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
    sh = "host;x-amz-content-sha256;x-amz-date"
    creq = f"{method}\n{u.path}\n{cq}\n{ch}\n{sh}\n{payload_hash}"
    scope = f"{datestamp}/{region}/{service}/aws4_request"
    sts = ("AWS4-HMAC-SHA256\n" + amz_date + "\n" + scope + "\n"
           + hashlib.sha256(creq.encode()).hexdigest())
    def h(key, msg):
        if isinstance(msg, str): msg = msg.encode()
        return hmac.new(key, msg, hashlib.sha256).digest()
    k = h(h(h(h(("AWS4" + sk).encode(), datestamp), region), service), "aws4_request")
    sig = hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()
    auth = ("AWS4-HMAC-SHA256 Credential=" + ak + "/" + scope
            + ", SignedHeaders=" + sh + ", Signature=" + sig)
    return {"Host": host_header, "x-amz-date": amz_date,
            "x-amz-content-sha256": payload_hash, "Authorization": auth}
```

Given a `call(method, path, ak, sk, body=None, content_type=None)` helper that
builds `http://storage.services.apocrathia.com:9009{path}`, signs it, and
asserts the status code, the four steps for a new consumer `<name>` are:

### 1. Create the bucket (S3 API)

```python
await call("PUT", f"/{name}", ROOT_AK, ROOT_SK, expect=(200,))
```

### 2. Create the bucket-scoped policy (admin API)

```python
policy = json.dumps({"Version": "2012-10-17", "Statement": [{
    "Effect": "Allow", "Action": ["s3:*"],
    "Resource": [f"arn:aws:s3:::{name}", f"arn:aws:s3:::{name}/*"]}]})
await call("PUT", f"/rustfs/admin/v3/add-canned-policy?name={name}",
           ROOT_AK, ROOT_SK, body=policy.encode(), content_type="application/json")
```

`Action: ["s3:*"]` scoped to the bucket ARNs is deliberate — narrower action
lists caused churn on MinIO and telemetry clients need multipart/list.

### 3. Create the user (admin API)

```python
body = json.dumps({"secretKey": secret, "status": "enabled"})
await call("PUT", f"/rustfs/admin/v3/add-user?accessKey={access_key}",
           ROOT_AK, ROOT_SK, body=body.encode(), content_type="application/json")
```

Generate a strong access key (uppercase A-Z + digits, no `/` — SigV4 breaks)
and secret; store them in a **1Password item** named `<name>-secrets` with
fields `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (plus any app-specific
field like `KOPIA_PASSWORD` — that one is client-side encryption, RustFS
never sees it).

### 4. Attach the policy to the user (admin API)

```python
path = f"/rustfs/admin/v3/set-user-or-group-policy?policyName={name}&userOrGroup={access_key}&isGroup=false"
await call("PUT", path, ROOT_AK, ROOT_SK)
```

### 5. Verify with the NEW user's credentials (not root)

```python
# roundtrip in the new bucket: PUT + GET + DELETE all 200
# cross-bucket read: 403
# bucket creation:   403
```

Passing the same battery the existing consumers were verified with (2026-09-11):
HEAD/PUT/GET/DELETE roundtrip in-bucket, reads of other buckets 403, bucket
creation 403.

### Known wart

Non-root `ListBuckets` (GET `/`) returns **500** on this build
(`errBucketMetadataNotInitialized`, beta.12, upstream fix pending). Cosmetic:
apps address buckets by name. Expect it during verification and ignore.

## Console (manual) path

Documented as the fallback for humans. **Unverified in practice on this
instance** — the console is not currently reachable on the LAN. To use it:

1. Enable/expose the console on the NAS: set `RUSTFS_CONSOLE_ENABLE=true`
   and `RUSTFS_CONSOLE_ADDRESS=":9010"` (or default `:9001`) in
   `/etc/default/rustfs`, restart RustFS, then either expose the port or SSH
   port-forward (`ssh nas -L 9001:localhost:9010`).
   **Restarting interrupts S3 briefly** — loki/mimir/tempo/kopia all blip
   for seconds; kopia movers retry.
2. Log in with **Key Login** using the root credentials. If the page cannot
   reach the server, open `/config` and point it at
   `http://storage.services.apocrathia.com:9009`.
3. **Create bucket**: Object Browser → Create Bucket → `<name>` (no
   versioning, no quota — parity with existing consumers).
4. **Create policy**: Identity and Access Management → Policies → Create
   Policy — name `<name>`, JSON from step 2 above.
5. **Create user**: Users → Create User — name `<name>`, generated or pasted
   key pair, attach policy `<name>`. Copy credentials to the 1Password item.
6. Verify with the new user's keys exactly as in the API path (step 5).

UI menu labels may differ slightly from the docs (RustFS notes menus vary by
permissions); the flow is always bucket → policy → user + attach.

## Operational notes

- **Data-root relocation wipes ALL state** — buckets, IAM users, policies
  (2026-09-11 incident). If the root must move: stop writes, rclone data
  out, move the root, recreate all buckets/users/policies via this runbook,
  rclone data back. The rustfs agent session holds the full stored recipe.
- No quotas are set on any bucket. The admin API supports them; ask the
  operator before adding one.
- Existing consumers (2026-09-11): `loki`, `mimir-blocks`, `mimir-ruler`,
  `mimir-alertmanager`, `tempo`, `kopia` (kopiur backup pilot). All use the
  same per-app policy shape as step 2.
