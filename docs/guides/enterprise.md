---
title: What does RevenueDot Enterprise add, and how do I turn it on?
description: Enterprise adds organizations, custom roles, single sign-on, SCIM, data location, audit retention and signed compliance exports. A licence key turns it on; without one the open-source build is unchanged.
---

# What does RevenueDot Enterprise add, and how do I turn it on?

RevenueDot Enterprise is the paid code in the `ee/` folder of the server. It groups projects into **organizations** and adds **custom roles**, **single sign-on**, **SCIM provisioning**, **data location**, **audit retention** and **signed compliance exports**. You turn it on with a licence key in `REVENUEDOT_LICENSE_KEY`. Without the key, the server never loads `ee/`: no route, page or response changes.

The `ee/` folder is under the RevenueDot Enterprise License, not AGPL-3.0. You may use it for development and testing without paying. Production use needs a RevenueDot Enterprise subscription; contact sales from the [pricing page](https://revenuedot.app/pricing).

## Features
A licence lists the features it covers. Each one is off unless the licence has it.

| Feature | Name in the licence | What it does | Guide |
|---|---|---|---|
| Organizations | `organizations` | Group projects, members and settings under one organization | This page |
| Custom roles | `custom_roles` | Roles built from API permissions, for every project or one | [Custom roles](#custom-roles) |
| Single sign-on | `sso` | SAML 2.0 and OpenID Connect, verified email domains, required SSO | [Single sign-on](single-sign-on.md) |
| SCIM | `scim` | Your identity provider creates, updates and deactivates people and groups | [SCIM](scim.md) |
| Data location | `data_location` | A region (US or EU) on each organization and project | [Data location](data-location.md) |
| Audit retention | `audit_retention` | Keep audit logs 30 days to 10 years, or forever | [Audit retention and exports](audit-retention-and-exports.md) |
| Compliance exports | `compliance_exports` | Signed CSV or JSON files of the audit log and an access review | [Audit retention and exports](audit-retention-and-exports.md#compliance-exports) |

How it compares with RevenueCat:
- **Roles.** RevenueCat has six fixed collaborator roles and no custom roles ([Collaborators](https://www.revenuecat.com/docs/projects/collaborators)). RevenueDot has Admin, Developer and Viewer in the open-source build, and custom roles in Enterprise.
- **SSO and SCIM.** RevenueCat offers SSO and SCIM on its Enterprise plan only, through WorkOS ([SSO](https://www.revenuecat.com/docs/projects/sso)). RevenueDot's set-up is in the dashboard.
- **Data location.** RevenueCat stores data in the US ([DPA](https://www.revenuecat.com/dpa)).

## Turn it on
**Self-hosted.** Add the licence key to `.env` and pass it to the container. The default `docker-compose.yml` does not pass it, so add a `docker-compose.override.yml`, which Compose reads automatically:

```yaml
# docker-compose.override.yml
services:
  revenuedot:
    environment:
      REVENUEDOT_LICENSE_KEY: ${REVENUEDOT_LICENSE_KEY}
```

Restart the server. The log prints `RevenueDot Enterprise: licensed`. Also set `REVENUEDOT_PUBLIC_URL` to the address people use to open the dashboard; single sign-on needs it ([why](single-sign-on.md#before-you-start)).

**RevenueDot Cloud.** The licence key is a setting of RevenueDot's own servers, so you do not set it. To use Enterprise on Cloud, contact sales from the [pricing page](https://revenuedot.app/pricing).

**Check it.** Open the project switcher menu: **Organization settings** appears when organizations are on. **General** shows the licence. The API answers `GET /v2/enterprise` with the mode and the features:

```json
{ "object": "enterprise", "mode": "licensed", "features": ["organizations", "custom_roles", "sso", "scim", "data_location", "audit_retention", "compliance_exports"], "licensee": "Acme Inc.", "expires_at": 1822348800000, "message": null }
```

### What the licence key is
- The key looks like `rdl1_<payload>.<signature>`. The server checks its Ed25519 signature offline; it never calls home.
- The payload names the licensee, the features (or all of them), when it expires, the number of organizations allowed on the server (or no limit), and whether it is for self-hosted servers, RevenueDot Cloud or both.
- **When the licence expires,** the features keep working for 14 days and the organization pages show a warning. After that they turn off. Password sign-in keeps working. People who only ever signed in with SSO have no password: they reset their password, or you renew the key.
- **A key that fails the check** (wrong format, bad signature, expired more than 14 days ago) turns no feature on. `GET /v2/enterprise` answers `mode: "invalid"` with the reason in `message`.
- **An organization limit:** creating one more organization than the licence allows answers 403.

### Development mode
`REVENUEDOT_EE_DEV=true` turns every feature on without a key, for development and testing only. Production use needs a licence. The organization pages show a "Development licence" banner. RevenueDot Cloud refuses development mode.

## Organizations
An organization owns projects. It holds the members, single sign-on, SCIM, custom roles, the default data location, audit retention, seats and a billing email.

1. Open the project switcher menu and click **Organization settings**.
2. Enter a name and click **Create organization**. You become its owner.
3. Open **Projects** and click **Move a project in**.

### Organization roles
| Role | Can do |
|---|---|
| **Owner** | Everything. Only owners change audit retention, seats and the billing email, delete the organization, and make or remove owners |
| **Admin** | Members, projects, custom roles, group role mappings, single sign-on, SCIM, data location, the organization audit log and exports |
| **Member** | See the organization, its members and its projects. Work in the projects they were given |

- **Owners and admins are Admins of every project in the organization.** Making someone a member again removes that access.
- **An organization always keeps one owner.** The last owner cannot be demoted, removed or deactivated by SCIM.
- **Add a member** with **Members → Add member**. The address must already have a RevenueDot account. New people join through [single sign-on](single-sign-on.md), [SCIM](scim.md) or a project invite.
- **Removing a member** removes them from every project of the organization, including projects they were added to by hand. Anyone can leave an organization, except its last owner.

### Moving projects in and out
- **Who:** an organization owner or admin who is also an Admin of the project.
- **A project belongs to one organization at a time.** Move it out of the other organization first.
- **Moving in** changes no data. Everyone on the project becomes an organization member, and the organization's owners and admins become project Admins.
- **Moving out** keeps every membership. People with a custom role become Viewers, because the organization's roles no longer apply there.
- **Deleting an organization:** move every project out first. Deleting it also deletes its SSO connections, domains, SCIM tokens, custom roles, mappings and the organization audit log.

### Seats
**Seats used** counts everyone who is an active organization member or a member of one of its projects. **Seats bought** is a number owners record on **General**. RevenueDot counts seats; it does not block anyone when the count goes over.

## Custom roles
A custom role is a list of the same permissions secret API keys use. The server checks it on every request: in the dashboard, through RevenueDot AI and through the API. Built-in roles stay as they are: Admin, Developer and Viewer ([Invite your team](team.md#roles)).

1. Open **Organization settings → Roles** and click **New role**.
2. Enter a name (unique in the organization) and a description.
3. Pick the permissions.
4. Pick **Every organization project**, or one project.

### The permissions
A "Edit" permission includes its "View" permission.

| Group | Permissions |
|---|---|
| **Customers** | View customers · Edit customers (attributes, grants, delete) · View subscriptions · Cancel, refund and extend subscriptions · View purchases · Refund purchases and make test purchases · View invoices |
| **Product catalog** | View and edit products · entitlements · offerings, paywalls, web and funnels · packages · in-app currencies · web discounts |
| **Targeting** | View and edit audiences, targeting and experiments |
| **Charts** | View the overview metrics · View charts · Save charts |
| **Project** | View and edit project settings · View and edit apps and store credentials · View and edit webhooks, integrations and exports · View the audit log · View collaborators · View API keys |

That is 33 permissions. The API names them as API v2 scopes, such as `customer_information:purchases:read_write`; `GET /v2/organizations/{org_id}/scopes` lists them all.

**Creating or revoking secret API keys, inviting people and changing roles stay with the built-in Admin role.** A custom role cannot include `project_configuration:api_keys:read_write`.

Example: a **Support agent** role with View customers, Cancel, refund and extend subscriptions, and Refund purchases can look up a customer and refund them, but cannot change the catalog or the apps.

### Assign a role
- **Dashboard:** **Organization settings → Projects**, open the project's menu, click **Members and roles**, then pick the role in the person's row. Organization admins and the project's Admins can do this.
- **API:** `POST /v2/organizations/{org_id}/projects/{project_id}/members/{user_id}` with `{"role": "role_8f2kq0x1m3zv"}`. The role is `admin`, `developer`, `viewer` or a custom role id.
- **From your identity provider:** map a group to a role in a project. See [group role mappings](scim.md#group-role-mappings).
- The person must already be on the project: invite them first ([Invite your team](team.md)).
- A project always keeps at least one Admin, and the project owner stays an Admin.

### How custom roles show up elsewhere
- **Project settings → Collaborators** shows **Custom role** in the person's row. Change it in Organization settings, not there.
- **`GET /v2/projects/{project_id}/collaborators`** returns the custom role's id (`role_...`) as the `role`. Built-in roles keep their names (`admin`, `developer`, `read_only`).
- **A refused request** answers 403 `authorization_error`: "Your role in this project (a custom role) does not allow this. Ask a project admin."
- **RevenueDot AI** only reads for someone with a custom role. Each read is still checked against the role.
- **MCP clients connected with OAuth** get a key with only the role's own permissions, and only the reads among them: a role that can view products but not customers gives a key that cannot read customers. A role with none of the permissions an MCP key carries cannot connect that project.
- **Changing a role's permissions** applies on each person's next request.
- **Deleting a role** turns everyone who had it into a Viewer and deletes the group role mappings that gave it.
- **A role the server cannot find** gives no access at all, never more.

## Do it with the API
Organization endpoints take a dashboard session (the `rd_session` cookie from `POST /auth/login`). Secret API keys belong to one project and cannot call them. Every endpoint is on [Enterprise API](../../api/enterprise.md).

| Task | Request |
|---|---|
| Licence state | `GET /v2/enterprise` |
| List or create organizations | `GET` or `POST /v2/organizations` |
| Update an organization | `POST /v2/organizations/{org_id}` |
| Members | `GET` or `POST /v2/organizations/{org_id}/members`, `POST` or `DELETE .../members/{user_id}` |
| Move a project in or out | `POST /v2/organizations/{org_id}/projects`, `DELETE .../projects/{project_id}` |
| Custom roles | `GET` or `POST /v2/organizations/{org_id}/roles`, `GET`, `POST` or `DELETE .../roles/{role_id}` |
| Give someone a role in a project | `POST /v2/organizations/{org_id}/projects/{project_id}/members/{user_id}` |
| The organization audit log | `GET /v2/organizations/{org_id}/audit_logs` |

## Related
- [Single sign-on](single-sign-on.md)
- [SCIM](scim.md)
- [Data location](data-location.md)
- [Audit retention and exports](audit-retention-and-exports.md)
- [Invite your team](team.md)
- [Enterprise API](../../api/enterprise.md)
