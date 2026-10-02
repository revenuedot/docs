---
title: Where is my RevenueDot data stored, and can I keep it in the EU?
description: Self-hosted, your data stays wherever you run the server. Enterprise records a US or EU region on each organization and project; on Cloud each region is its own deployment that refuses other regions' projects. Cloud has no EU region yet.
---

# Where is my RevenueDot data stored, and can I keep it in the EU?

**Self-hosted, your data is wherever you run RevenueDot and its Postgres.** Nothing leaves your servers, so you choose the country. **RevenueDot Cloud runs in the US today.** It has no EU region yet.

Data location is part of [RevenueDot Enterprise](enterprise.md) (the `data_location` feature). It records a region, **United States** (`us`) or **European Union** (`eu`), on each organization and each of its projects. RevenueCat stores data in the US ([DPA](https://www.revenuecat.com/dpa)).

## Set a region
- **Organization default:** **Organization settings → Data location → Default for new projects**. Organization admins change it.
- **A project:** pick its region in the **Projects** list on the same tab.
- **A project you move into an organization** is recorded in the region of the server it lives on. Moving it in moves no data.

## Self-hosted servers
The region is a record for you and for a later move to RevenueDot Cloud. RevenueDot moves nothing and refuses nothing because of it. Both regions can be picked.

## RevenueDot Cloud
Each region is meant to be a separate deployment, with its own server, database and addresses, and nothing shared between them. A project's customers, purchases, events and audit logs live only in its region's database.

When more than one region is set up, each deployment refuses requests for projects stored in another region before any route runs:

| Request | Answer |
|---|---|
| REST API v2 and the dashboard (`/v2/projects/{project_id}/...`) | **421** with the right region's addresses |
| SDK calls (`/v1/...`, `/rcbilling/...`) and store notifications | **503** with `Retry-After: 60` |

The 421 body names the region and where to go:

```json
{ "object": "error", "type": "invalid_request", "message": "This project's data is stored in the European Union region; use https://app.eu.revenuedot.app. This server does not process it.", "region": "eu", "api_url": "https://api.eu.revenuedot.app", "app_url": "https://app.eu.revenuedot.app", "doc_url": "https://revenuedot.app/docs/guides/data-location", "retryable": false }
```

SDK calls get a 503, not a 4xx, on purpose. A 4xx would make the RevenueCat SDK finish a purchase this deployment never recorded. A 503 makes the app retry and the stores redeliver their notifications.

**A project stays in the region where its data is.** With several regions, the dashboard only offers the deployment's own region. Asking for the other one answers 422 with that region's dashboard address. Moving a project's existing data between regions is a support job: write to support@revenuedot.app.

**Today Cloud has one region, the US.** No EU deployment exists yet, so the Cloud dashboard offers only the US region and the Data location tab says so.

## Do it with the API
Organization admins, with a dashboard session. Details: [Enterprise API](../../api/enterprise.md#organizations).

| Task | Request |
|---|---|
| Set the organization's default region | `POST /v2/organizations/{org_id}` with `{"region": "eu"}` |
| Set a project's region | `POST /v2/organizations/{org_id}/projects/{project_id}/region` with `{"region": "eu"}` |
| See every project's region | `GET /v2/organizations/{org_id}/projects` |

`GET /v2/organizations/{org_id}` returns `selectable_regions` (the regions this server accepts) and `region_enforced` (whether it refuses other regions' projects).

## Related
- [Self-hosting](self-hosting.md)
- [Enterprise](enterprise.md)
- [Audit retention and exports](audit-retention-and-exports.md)
