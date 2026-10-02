---
title: How long does RevenueDot keep audit logs, and how do I export signed copies?
description: Owners set audit retention from 30 days to 10 years, or forever; an hourly job deletes older entries. Admins download the audit log and an access review as CSV or JSON, signed with Ed25519, up to 200,000 rows.
---

# How long does RevenueDot keep audit logs, and how do I export signed copies?

**RevenueDot keeps audit logs forever unless an organization sets a retention.** With [RevenueDot Enterprise](enterprise.md), an organization owner picks how long to keep them, from 30 days to 10 years. Organization admins download the audit log and an **access review** as CSV or JSON files, **signed with Ed25519** so an auditor can prove a file came from your server unchanged.

RevenueCat keeps a per-project audit log with a CSV export and publishes no retention period ([Audit logs](https://www.revenuecat.com/docs/dashboard-and-metrics/audit-logs)).

## Two audit logs
- **Project audit logs** record changes in one project. They are in the open-source build: **Project settings → Audit logs**, or `GET /v2/projects/{project_id}/audit_logs`.
- **The organization audit log** records organization changes. Open **Organization settings → Audit log**. Only owners and admins see it.

| Kind | Actions in the organization log |
|---|---|
| Organization | `organization_created`, `organization_updated` |
| Members | `member_added`, `member_role_changed`, `member_removed` |
| Projects | `project_added`, `project_removed`, `project_region_changed`, `project_role_changed` |
| Custom roles and mappings | `role_created`, `role_updated`, `role_deleted`, `role_mapping_saved`, `role_mapping_deleted` |
| Single sign-on | `sso_connection_created`, `sso_connection_updated`, `sso_connection_deleted`, `sso_domain_added`, `sso_domain_verified`, `sso_domain_removed`, `sso_sign_in`, `sso_sign_in_failed` |
| SCIM | `scim_token_created`, `scim_token_revoked`, `scim_user_created`, `scim_user_updated`, `scim_user_deactivated`, `scim_user_reactivated`, `scim_user_deleted`, `scim_group_created`, `scim_group_updated`, `scim_group_deleted` |
| Compliance | `audit_logs_purged`, `compliance_export_created` |

Each entry has who did it (a user, a SCIM token, an SSO connection or the system), the target, details and the time. Failed SSO sign-ins keep the reason, never the SAML assertion.

## Retention
1. Open **Organization settings → Audit log**.
2. Under **Retention**, pick **Keep forever** (the default), 90 days, 1 year, 2, 3, 5, 7 or 10 years.

- **Only owners change retention,** because a shorter retention deletes history for good. The API takes any whole number of days from 30 to 3,650, or `null` for forever.
- **It covers the organization log and the audit logs of every project in the organization.** Projects outside an organization keep their logs forever.
- **An hourly job deletes older entries,** up to 5,000 rows a run. When more are left, it runs again a minute later until it has caught up. Each run that deletes something adds an `audit_logs_purged` entry with the number of rows and the cut-off date.
- Shortening retention in the dashboard asks you to confirm first.

## Compliance exports
Open **Organization settings → Compliance exports**, pick **CSV** or **JSON**, and download:

- **Audit log:** every entry of the organization log and of its projects' logs, oldest first, with the actor's email. The API can limit it to a time range.
- **Access review:** one row per person per organization project: their organization role, project role and role name, the permissions it grants, how they got it (by hand, the organization role, or a group mapping), whether they have a password, their last SSO sign-in, and whether SCIM manages them and they are active. Organization members without project access get a row too.

**Limits and safety**
- **Up to 200,000 rows per file.** More answers 400 "choose a shorter date range"; split the audit log by `start_time` and `end_time`.
- **CSV cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return get a leading `'`,** so a spreadsheet does not run them as formulas.
- **Every download is in the organization audit log** as `compliance_export_created`, with its SHA-256.
- Organization owners and admins can export.

## Check a signature
Each file comes with three response headers:

| Header | Value |
|---|---|
| `X-RevenueDot-Signature` | `ed25519=<base64 signature>` over the exact bytes of the file |
| `X-RevenueDot-Content-SHA256` | The file's SHA-256, in hex |
| `X-RevenueDot-Key-Id` | The first 16 hex characters of the SHA-256 of the public key |

The dashboard shows the SHA-256 and the signature after a download. Give auditors the **public key** from **Compliance exports → Signing key**, or from `GET /v2/organizations/{org_id}/exports/public_key`. It is a raw 32-byte Ed25519 key in base64.

**With Node.js 20 or newer:**

```js
// node verify.mjs <file> <signature without "ed25519=">
import { readFileSync } from "node:fs";
import { createPublicKey, verify } from "node:crypto";
const raw = Buffer.from("<public key base64>", "base64");
const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]), format: "der", type: "spki" });
console.log(verify(null, readFileSync(process.argv[2]), key, Buffer.from(process.argv[3], "base64")) ? "valid" : "INVALID");
```

**With OpenSSL 3:**

```bash
# public.pem: the raw key wrapped in the Ed25519 SubjectPublicKeyInfo header
{ printf '302a300506032b6570032100' | xxd -r -p; echo '<public key base64>' | base64 -d; } > public.der
openssl pkey -pubin -inform DER -in public.der -out public.pem
echo '<signature base64>' | base64 -d > file.sig
openssl pkeyutl -verify -pubin -inkey public.pem -rawin -in revenuedot-audit-logs.csv -sigfile file.sig
```

`Signature Verified Successfully` means the file is unchanged. Any edit, even one byte or a line ending, makes the check fail.

**Where the key comes from.** RevenueDot derives the export signing key from `REVENUEDOT_SIGNING_KEY`, or from `REVENUEDOT_ENCRYPTION_KEY` when there is no signing key. It is never the key that signs SDK responses, so neither can sign for the other. A self-hosted server with neither variable exports unsigned files and says **Not signing**. The key stays the same as long as the variable does.

## Do it with the API
Dashboard session. Details: [Enterprise API](../../api/enterprise.md#compliance-exports).

| Task | Request |
|---|---|
| Set retention (owners) | `POST /v2/organizations/{org_id}` with `{"audit_retention_days": 365}` (`null` keeps forever) |
| Read the organization log | `GET /v2/organizations/{org_id}/audit_logs?start_time=...&end_time=...` |
| Download the audit log | `GET /v2/organizations/{org_id}/exports/audit_logs?format=csv&start_time=...&end_time=...` |
| Download the access review | `GET /v2/organizations/{org_id}/exports/access_review?format=json` |
| The public key | `GET /v2/organizations/{org_id}/exports/public_key` |

Times are epoch milliseconds: `start_time` is inclusive, `end_time` exclusive.

## Related
- [Enterprise](enterprise.md)
- [Single sign-on](single-sign-on.md)
- [SCIM](scim.md)
- [Project settings](project-settings.md)
