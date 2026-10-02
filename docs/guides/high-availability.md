---
title: How do I run RevenueDot with high availability?
description: Run two or more replicas of the RevenueDot image behind a load balancer on one Postgres with a standby. Migrations and background work run once under Postgres locks. Helm chart, Terraform for AWS and Google Cloud.
---

# How do I run RevenueDot with high availability?

Run **two or more replicas** of the same RevenueDot image behind a load balancer, on **one managed Postgres with a standby** (Amazon RDS Multi-AZ, Cloud SQL with high availability, or Aurora). Every replica serves the SDK API, the REST API, store notifications and the dashboard, and they share all state through Postgres, so any replica can answer any request. Losing a replica, a node or a whole availability zone does not stop purchases, and upgrades replace one replica at a time.

The server repository has three reference setups, all checked in CI and none applied for you:

| Where | Setup | What it creates |
|---|---|---|
| Any Kubernetes (EKS, GKE, AKS, on-premises) | [Helm chart](https://github.com/revenuedot/revenuedot/tree/main/deploy/helm/revenuedot) | Deployment with autoscaling, PodDisruptionBudget, Service, Ingress, probes, a migration Job, non-root pods on a read-only filesystem |
| AWS | [Terraform: `deploy/terraform/aws`](https://github.com/revenuedot/revenuedot/tree/main/deploy/terraform/aws) | VPC over 3 zones, RDS PostgreSQL Multi-AZ, ECS on Fargate (2 to 10 tasks), Application Load Balancer, ACM certificate, Secrets Manager, KMS, 9 CloudWatch alarms |
| Google Cloud | [Terraform: `deploy/terraform/gcp`](https://github.com/revenuedot/revenuedot/tree/main/deploy/terraform/gcp) | Cloud Run (2 to 10 instances), Cloud SQL for PostgreSQL with regional availability and point-in-time recovery, Secret Manager, an uptime check and alert policies |

There is no published image yet. Build it from the repository's `Dockerfile` and push it to your registry (`docker build -t <registry>/revenuedot:<tag> .`), then point the chart's `image.repository` or Terraform's `image` at it.

## What keeps replicas from stepping on each other
| Work | How it runs once |
|---|---|
| Database migrations | A replica that starts takes a Postgres advisory lock before it migrates. The first one migrates; the others wait, then find nothing to do. Or run them once before the rollout (the Helm hook Job, `node --import tsx src/migrate.node.ts`) and start replicas with `REVENUEDOT_MIGRATE=skip` |
| The background job (expirations, Google Play voided purchases, webhooks, integrations, alert emails, win-back emails, credential checks, exports) | Every replica tries every 30 seconds; only the one that gets a Postgres advisory lock runs it, and the others skip that turn. If that replica dies, Postgres drops its lock with its connection and another replica runs the next turn |
| Each webhook delivery | Claimed with a conditional update before it is sent, so two runs never send the same delivery. A run sends batches for up to 20 seconds, to several webhooks in parallel and to each webhook in order |
| Each expiration | Recorded in one transaction that marks the subscription, so it is recorded once |
| Each alert email | Sent only by the run that changed the alert's state |
| Sessions, rate limits, RevenueDot AI answers, OAuth codes | Kept in Postgres already |

Webhooks are delivered **at least once**, as with RevenueCat: a replica killed after your endpoint answered but before the result was saved sends that delivery again 2 minutes later. Deduplicate on `event.id` ([Webhooks](webhooks.md)).

## Settings for several replicas
| Variable | Default | What it does |
|---|---|---|
| `REVENUEDOT_PUBLIC_URL` | unset | **Required.** The address behind the load balancer, used in emails and dashboard links. Without it, a replica guesses from the last request it saw |
| `REVENUEDOT_MIGRATE` | `auto` | `auto` migrates on start under the lock; `skip` never migrates (a separate job does) |
| `REVENUEDOT_BACKGROUND_JOBS` | `on` | `off` keeps a replica to requests only |
| `REVENUEDOT_TICK_INTERVAL_MS` | `30000` | How often each replica tries to run the background job |
| `REVENUEDOT_SHUTDOWN_DELAY_MS` | `5000` | After SIGTERM, how long a replica keeps answering while `/readyz` says 503, so the load balancer stops sending it requests |
| `REVENUEDOT_SHUTDOWN_TIMEOUT_MS` | `20000` | Longest wait for requests in flight and a running background job before the replica exits |
| `DATABASE_POOL_MAX` | `10` | Postgres connections per replica (at least 2). Replicas times this must stay under the database's `max_connections` |
| `REVENUEDOT_ARCHIVE_DIR` | `.data/archives` | Set `db` (or an S3 bucket with `REVENUEDOT_ARCHIVE_S3_*`): a folder on one replica's disk is gone when that replica is replaced. The chart and both Terraform setups set `db` |
| `REVENUEDOT_ENCRYPTION_KEY` | unset | The same value on every replica, from your secret store. It seals integration and export credentials |

Everything else is the same as a single server ([Self-hosting](self-hosting.md#settings)).

## Health checks and shutdown
- `GET /healthz` is **liveness**: 200 while the process runs. It never asks the database, so a database failover does not restart every replica.
- `GET /readyz` is **readiness**: 200 when the database answers within 2 seconds and the replica is not shutting down, 503 otherwise. Point the load balancer's health check here.
- On **SIGTERM** (Kubernetes, ECS, `docker stop`), a replica turns `/readyz` to 503, stops its background job, waits `REVENUEDOT_SHUTDOWN_DELAY_MS`, closes its port, finishes requests in flight and any running background job, then exits 0. A background job that is running stops after the webhooks in flight; the rest waits for the next run on another replica. Keep the delay plus the timeout under your platform's grace period (30 seconds on Kubernetes and in the AWS setup; Cloud Run allows 10, so the Google Cloud setup uses 0 and 8).

## Kubernetes with Helm
Create a Secret with the database URL and one with the server's secrets, then install the chart from a checkout of the server repository:

```bash
kubectl create namespace revenuedot
kubectl -n revenuedot create secret generic revenuedot-db \
  --from-literal=DATABASE_URL='postgres://revenuedot:<password>@<host>:5432/revenuedot?sslmode=require'
kubectl -n revenuedot create secret generic revenuedot-secrets \
  --from-literal=REVENUEDOT_ENCRYPTION_KEY="$(openssl rand -base64 32)" \
  --from-literal=REVENUEDOT_SMTP_URL='smtps://<user>:<password>@smtp.example.com:465'
helm install revenuedot deploy/helm/revenuedot -n revenuedot \
  --set image.repository=<registry>/revenuedot --set image.tag=<tag> \
  --set publicUrl=https://revenuedot.example.com \
  --set database.existingSecret=revenuedot-db --set secrets.existingSecret=revenuedot-secrets \
  --set ingress.enabled=true --set ingress.className=nginx \
  --set ingress.hosts[0].host=revenuedot.example.com \
  --set ingress.hosts[0].paths[0].path=/ --set ingress.hosts[0].paths[0].pathType=Prefix
kubectl -n revenuedot rollout status deploy/revenuedot && helm test revenuedot -n revenuedot
```

What the chart does by default:
- **Two to ten replicas**, scaled on CPU and memory, spread over zones and nodes, with a PodDisruptionBudget that keeps one up during node drains and `maxUnavailable: 0` on rollouts.
- **Migrations** in a `pre-install,pre-upgrade` hook Job when `database.existingSecret` is set (replicas then start with `REVENUEDOT_MIGRATE=skip`); otherwise each replica migrates on start under the lock. Set `migrations.mode` to `job` or `startup` to choose.
- **Probes:** startup and liveness on `/healthz`, readiness on `/readyz`.
- **Security:** uid 1000, no privilege escalation, every capability dropped, read-only root filesystem with a small `/tmp`, no service account token. `networkPolicy.enabled=true` admits traffic only on the HTTP port.
- **Archives** in Postgres unless you set `archives.s3.bucket` (with an access key in your Secret; role credentials such as IRSA are not read yet).

For ingress-nginx, add `nginx.ingress.kubernetes.io/proxy-buffering: "off"` so [RevenueDot AI](revenuedot-ai.md) answers stream. For a quick evaluation without a database, `--set postgresql.enabled=true` adds one Postgres pod with a volume: no failover and no backups, so never for real purchases. All values are documented in the chart's [`values.yaml`](https://github.com/revenuedot/revenuedot/blob/main/deploy/helm/revenuedot/values.yaml).

## AWS with Terraform (ECS on Fargate)
```bash
cd deploy/terraform/aws
cp terraform.tfvars.example terraform.tfvars   # domain_name, route53_zone_id, image, alarm_email
terraform init && terraform plan && terraform apply
```

It creates a VPC across 3 zones (public, private and database subnets, one NAT gateway per zone), RDS PostgreSQL 16 Multi-AZ (KMS-encrypted, TLS required, 14 days of point-in-time recovery, Performance Insights, deletion protection), the ECS service (2 to 10 tasks at 1 vCPU and 2 GiB, CPU target tracking, a deployment circuit breaker that rolls back), an Application Load Balancer with HTTPS only (TLS 1.3 policy, HTTP redirected) and its ACM certificate validated in Route 53, Secrets Manager entries for the database URL and the encryption key, VPC flow logs, and CloudWatch alarms for 5xx answers, p95 latency, healthy targets, running tasks, database CPU, storage, memory and connections, and failed background job runs, all sent to one SNS topic.

Each task migrates on start by default. To migrate as a separate step, set `migrate_on_start = false` and run the `migrate_command` output before each deploy. Extra settings go in `environment`; extra secrets (SMTP URL, signing key, licence key, AI keys) go in `secret_arns` as Secrets Manager ARNs. Keep the Terraform state in an encrypted backend: it holds the database password and the encryption key.

## Google Cloud with Terraform (Cloud Run)
```bash
cd deploy/terraform/gcp
cp terraform.tfvars.example terraform.tfvars   # project_id, region, image, alert_email
terraform init && terraform plan && terraform apply
```

It creates a VPC and private services access, Cloud SQL for PostgreSQL 16 with regional availability (a standby in a second zone, automatic failover), private IP only, TLS required, backups with point-in-time recovery, Secret Manager entries, the Cloud Run service (2 to 10 instances, CPU always allocated so the background job runs between requests, direct VPC egress), a Cloud Run job for migrations, an uptime check of `/readyz` from several regions and alert policies for failed checks, 5xx answers, latency, database CPU and disk, and failed background job runs. Set `public_url` when you map a custom domain; without it the service's `run.app` address is used.

## Postgres
- **Version 16 or later**, with a standby in another zone. Every write is in Postgres, so it is the part to make highly available; the replicas are stateless.
- **Connections:** replicas times `DATABASE_POOL_MAX`, plus a few for migrations. Ten replicas at 10 is 100.
- **Poolers:** connect directly, through RDS Proxy, or through PgBouncer in **session** mode. PgBouncer in transaction mode breaks the advisory locks.
- **Failover:** RDS and Cloud SQL keep the same address. During the minute or so of a failover, requests that need the database fail with 5xx and `/readyz` turns 503; the SDKs retry receipts that got a 5xx, and replicas reconnect by themselves.

## Upgrades without downtime
Migrations run before the new version takes traffic, while the old version still serves requests. Releases keep each migration compatible with the version before it (add a column, ship, then remove the old one in a later release); the release notes say when an upgrade needs more. Then the platform replaces replicas one at a time, and each old replica drains before it exits. See [Upgrades](upgrades.md) for backups and rolling back.

## How it is tested
- Unit tests run two background job runs at once and check that each webhook, expiration and alert email happens once.
- A run on a real Postgres starts **three replicas at once** on an empty database, sends 300 Test Store purchases through a load balancer that health-checks `/readyz`, stops one replica with SIGTERM in the middle (it exits in about 1.5 seconds) and starts it again, forces 40 expirations and points a second webhook at a failing endpoint. It checks each migration ran once, all 300 purchases succeeded, every one of the 340 events reached the working webhook exactly once, the failing webhook's alert email went out once, and no two background job runs overlapped ([`scripts/e2e/cluster/run.ts`](https://github.com/revenuedot/revenuedot/blob/main/scripts/e2e/cluster/run.ts)).
- CI lints and renders the chart, validates it against Kubernetes 1.29 to 1.33, validates and lints both Terraform setups, and runs the image the way the chart does: a migration job first, then two non-root replicas on a read-only filesystem, one stopped with SIGTERM.

## Related
- [Self-hosting](self-hosting.md)
- [Upgrades](upgrades.md)
- [Backups](backups.md)
- [Enterprise](enterprise.md)
