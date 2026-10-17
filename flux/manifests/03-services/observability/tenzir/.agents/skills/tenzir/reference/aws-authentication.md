---
title: "AWS Authentication"
canonical: https://tenzir.com/docs/reference/aws-authentication
source: https://tenzir.com/docs/reference/aws-authentication.md
section: "Docs"
---

# AWS Authentication

> Tenzir’s AWS operators authenticate with AWS using the AWS SDK’s default credential chain, an OIDC web identity token, or static credentials. This page describes the shared awsiam option used by froms3, tos3, fromamazonsqs, toamazonsqs, fromamazoncloudwatch, toamazoncloudwatch, fromkafka, tokafka, and toiceberg. For toiceberg against an AWS-managed catalog, one resolved provider signs both the catalog requests and the S3 data-file operations.

Tenzir’s AWS operators authenticate with AWS using the AWS SDK’s default credential chain, an OIDC web identity token, or static credentials. This page describes the shared `aws_iam` option used by [`from_s3`](https://tenzir.com/docs/reference/operators/from_s3.md), [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md), [`from_amazon_sqs`](https://tenzir.com/docs/reference/operators/from_amazon_sqs.md), [`to_amazon_sqs`](https://tenzir.com/docs/reference/operators/to_amazon_sqs.md), [`from_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md), [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md), [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md), [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md), and [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md). For [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) against an AWS-managed catalog, one resolved provider signs both the catalog requests and the S3 data-file operations.

## Local usage with the AWS CLI

When you run `tenzir` locally, the simplest way to authenticate is to reuse the AWS CLI’s configuration. After installing the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), configure your default profile:

```bash
aws configure
```

This writes credentials to `~/.aws/credentials` and settings to `~/.aws/config`. Verify the configuration by calling any AWS API, for example:

```bash
aws sts get-caller-identity
```

Tenzir picks up the same files through the default credential chain, so no further configuration is required:

```tql
from_s3 "s3://my-bucket/data.json"
```

### Named profiles

To use a profile other than `default`, set the `AWS_PROFILE` environment variable before starting `tenzir` or `tenzir-node`:

```bash
export AWS_PROFILE=my-profile
tenzir 'from_s3 "s3://my-bucket/data.json"'
```

Profiles defined in `~/.aws/config` can chain into other profiles, assume roles with MFA, use SSO, or run an external `credential_process`. Tenzir transparently follows these mechanisms through the AWS SDK, and reruns a `credential_process` when its temporary credentials need to be refreshed, so long-running pipelines keep authenticating without restarts.

### Configuring credentials for the service user

The AWS CLI writes its configuration files under `~/.aws`, which only the owning user can read. Configure credentials for the same user account that runs `tenzir` and `tenzir-node`.

The `tenzir-node` systemd unit by default creates a `tenzir` user and runs as that user, so AWS credentials must be configured for that user and `~/.aws` must be readable by it.

## Ambient credentials

If you omit the `aws_iam` parameter, operators use the AWS SDK’s [default credential provider chain](https://docs.aws.amazon.com/sdk-for-cpp/v1/developer-guide/credentials.html), which searches in this order:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optionally `AWS_SESSION_TOKEN`).
2. Shared credentials and config files (`~/.aws/credentials`, `~/.aws/config`).
3. IAM role for Amazon EC2 or ECS task role.
4. Instance metadata service.

This is the recommended approach on AWS itself: attach an instance profile or task role to the workload and Tenzir picks it up automatically.

## Web identity authentication

For cross-cloud authentication, exchange an OIDC token from an external identity provider (Azure, Google Cloud, a Kubernetes service account, or any custom OIDC issuer) for temporary AWS credentials with `AssumeRoleWithWebIdentity`:

```tql
from_s3 "s3://my-bucket/data.json", aws_iam={
  region: "us-east-1",
  assume_role: "arn:aws:iam::123456789012:role/CrossCloudRole",
  web_identity: {
    token_file: "/var/run/secrets/tokens/aws-token",
  },
}
```

When you set `web_identity`, you must also set `assume_role` to the ARN of the IAM role configured to trust your identity provider.

Exactly one of the following token sources must be specified in `web_identity`:

* **`token_file`**: Path to a file containing the JWT token. This is standard for Kubernetes workload identity (EKS, AKS, GKE) where the platform mounts a service account token into the pod.

* **`token_endpoint`**: Configuration for fetching tokens from an HTTP endpoint. Use this for Azure IMDS or similar metadata services. The nested record contains:

  * `url` (required): The HTTP endpoint URL that returns a token.
  * `headers`: HTTP headers to include in the token request. For Azure IMDS, you typically need `{Metadata: "true"}`.
  * `query_params`: Query parameters to append to `url`. Keys and values are percent-encoded. Existing query parameters in `url` are preserved. Most providers expect the target audience here, which for AWS is `sts.amazonaws.com`.
  * `path`: JSON path to extract the token from the endpoint response. Defaults to `.access_token`. Set to `null` for endpoints that return the token as plain text.

* **`token`**: Direct token value, useful for testing or when the token comes from another source.

Both `headers` and `query_params` take `string` or [`secret`](https://tenzir.com/docs/reference/functions/secret.md) values.

The GitHub Actions token endpoint URL in `ACTIONS_ID_TOKEN_REQUEST_URL` already includes an `api-version` parameter. Use `query_params` to append the audience while preserving that parameter:

```tql
from_s3 "s3://my-bucket/data.json", aws_iam={
  region: "us-east-1",
  assume_role: "arn:aws:iam::123456789012:role/GitHubActionsRole",
  web_identity: {
    token_endpoint: {
      url: env("ACTIONS_ID_TOKEN_REQUEST_URL"),
      query_params: { "audience": "sts.amazonaws.com" },
      headers: {
        "Authorization": "Bearer " + env("ACTIONS_ID_TOKEN_REQUEST_TOKEN"),
      },
      path: ".value",
    },
  },
}
```

Tenzir refreshes credentials automatically before expiration, with exponential backoff retry for transient failures, making this suitable for long-running pipelines.

## IAM Roles Anywhere

For workloads outside AWS that cannot use web identity federation, [IAM Roles Anywhere](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/getting-started.html) exchanges an X.509 client certificate for temporary role credentials. Configure the AWS `aws_signing_helper` as a `credential_process` in a profile:

```ini
[profile tenzir-writer]
region = eu-central-1
credential_process = /usr/local/bin/aws_signing_helper credential-process --certificate /etc/tenzir/aws/client.pem --private-key /etc/tenzir/aws/client-key.pem --trust-anchor-arn arn:aws:rolesanywhere:REGION:ACCOUNT_ID:trust-anchor/TRUST_ANCHOR_ID --profile-arn arn:aws:rolesanywhere:REGION:ACCOUNT_ID:profile/PROFILE_ID --role-arn arn:aws:iam::ACCOUNT_ID:role/TenzirWriter
```

Select the profile and Region in the Tenzir service environment:

```bash
export AWS_PROFILE=tenzir-writer
export AWS_REGION=eu-central-1
```

The signing helper is a separate AWS executable, not included with Tenzir. Download it and verify its published checksum as described in the [AWS credential helper documentation](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/credential-helper.html), and keep the private key readable only by the user that runs `tenzir-node`.

The AWS SDK reruns the `credential_process` before the temporary credentials expire, so long-running pipelines keep authenticating without restarts. Do not copy the temporary credentials the helper returns into static `aws_iam` fields: they never refresh there, and the pipeline stops authenticating when they expire. When one process needs multiple AWS identities, reference the profile explicitly with `aws_iam={profile: "tenzir-writer"}`; otherwise prefer the default chain with `AWS_PROFILE`.

## Static credentials

Pass an access key and secret directly. The `access_key_id` and `secret_access_key` options must be specified together. Wrap secrets with [`secret`](https://tenzir.com/docs/reference/functions/secret.md) to keep them out of pipeline definitions:

```tql
from_s3 "s3://my-bucket/data.json", aws_iam={
  region: "us-east-1",
  access_key_id: secret("aws-access-key-id"),
  secret_access_key: secret("aws-secret-access-key"),
}
```

Use `assume_role` with any of the above mechanisms to call `sts:AssumeRole` and adopt a different role for the request:

```tql
from_s3 "s3://my-bucket/data.json", aws_iam={
  region: "us-east-1",
  assume_role: "arn:aws:iam::123456789012:role/MyRole",
  session_name: "tenzir-session",
}
```

The role’s trust policy must allow your active principal (for example an EC2 instance role or a local SSO role) to assume it.

## See Also

* [`from_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md)
* [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md)
* [`from_s3`](https://tenzir.com/docs/reference/operators/from_s3.md)
* [`from_amazon_sqs`](https://tenzir.com/docs/reference/operators/from_amazon_sqs.md)
* [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md)
* [`to_amazon_security_lake`](https://tenzir.com/docs/reference/operators/to_amazon_security_lake.md)
* [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md)
* [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md)
* [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md)
* [`to_amazon_sqs`](https://tenzir.com/docs/reference/operators/to_amazon_sqs.md)
* [Azure Authentication](azure-authentication.md)
* [Amazon CloudWatch Logs](../integrations/amazon/cloudwatch.md)
* [AWS Glue](../integrations/amazon/glue.md)
* [Amazon MSK](../integrations/amazon/msk.md)
* [Amazon S3](../integrations/amazon/s3.md)
* [Amazon Security Lake](../integrations/amazon/security-lake.md)
* [Amazon SQS](../integrations/amazon/sqs.md)
