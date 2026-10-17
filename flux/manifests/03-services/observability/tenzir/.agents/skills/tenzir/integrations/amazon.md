---
title: "Amazon integration"
description: "Stream events through MSK, store and replay them in S3, ship them to CloudWatch or Amazon Security Lake in OCSF, and pull messages from SQS, all with first-class IAM integration."
canonical: https://tenzir.com/integrations/amazon
source: https://tenzir.com/integrations/amazon.md
section: "Integrations"
---

# Amazon integration

> Stream events through MSK, store and replay them in S3, ship them to CloudWatch or Amazon Security Lake in OCSF, and pull messages from SQS, all with first-class IAM integration.

Tenzir runs natively on [Amazon Web Services (AWS)](https://aws.amazon.com) and connects to the AWS services security teams rely on every day. Stream events through managed Kafka, store and replay them in S3, ship them to CloudWatch or Amazon Security Lake in OCSF, and pull messages from SQS - all from the same pipeline language, using the AWS SDK directly and with first-class IAM integration.

## Supported services

| Service                                                                         | Operators                                                                                                                                                                                        | Use case                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| [Amazon CloudWatch Logs](amazon/cloudwatch.md)  | [`from_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md), [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md) | Read and write CloudWatch log events.          |
| [AWS Glue](amazon/glue.md)                      | [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md)                                                                                                                        | Write Iceberg tables to the Glue Data Catalog. |
| [Amazon MSK](amazon/msk.md)                     | [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md), [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md)                                                 | Stream events through managed Kafka.           |
| [Amazon S3](amazon/s3.md)                       | [`from_s3`](https://tenzir.com/docs/reference/operators/from_s3.md), [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md)                                                             | Read and write S3 objects.                     |
| [Amazon Security Lake](amazon/security-lake.md) | [`to_amazon_security_lake`](https://tenzir.com/docs/reference/operators/to_amazon_security_lake.md)                                                                                              | Send OCSF events to Security Lake.             |
| [Amazon SQS](amazon/sqs.md)                     | [`from_amazon_sqs`](https://tenzir.com/docs/reference/operators/from_amazon_sqs.md), [`to_amazon_sqs`](https://tenzir.com/docs/reference/operators/to_amazon_sqs.md)                             | Receive and send SQS messages.                 |

All AWS operators share the same authentication mechanisms. See [AWS Authentication](../reference/aws-authentication.md) for details.

## See Also

* [AWS Authentication](../reference/aws-authentication.md)
* [Deploy a node](../guides/node-setup/deploy-a-node.md)
