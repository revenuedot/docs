---
title: How do I provision RevenueDot users and groups with SCIM?
description: Create a SCIM token, paste it and the base URL into Okta or Microsoft Entra ID, and map identity provider groups to project roles. Deactivating someone removes their access and ends their sessions at once.
---

# How do I provision RevenueDot users and groups with SCIM?

SCIM is part of [RevenueDot Enterprise](enterprise.md). Your identity provider creates people in your RevenueDot organization, keeps their details current, pushes groups, and deactivates people when they leave. **Group role mappings** turn those groups into project roles. Deactivating someone removes their access to the organization's projects and signs them out at once.

RevenueDot follows SCIM 2.0 ([RFC 7643](https://datatracker.ietf.org/doc/html/rfc7643), [RFC 7644](https://datatracker.ietf.org/doc/html/rfc7644)) and accepts the request forms Okta and Microsoft Entra ID send. RevenueCat offers SCIM only on its Enterprise plan, through WorkOS ([SSO](https://www.revenuecat.com/docs/projects/sso)).

## Before you start
- **An Enterprise licence with the `scim` feature,** or development mode ([Turn it on](enterprise.md#turn-it-on)).
- **A verified email domain.** SCIM only creates people whose email is on a domain your organization verified ([Verify your email domain](single-sign-on.md#verify-your-email-domain)). Anyone else is refused, so an identity provider can never take over someone else's account.
- **Single sign-on,** so the people SCIM creates can sign in. They get no password ([Single sign-on](single-sign-on.md)).
- **Self-hosted servers: set `REVENUEDOT_PUBLIC_URL`,** or the base URL shown in the dashboard follows whatever address you opened it on.

## Create a token
1. Open **Organization settings → SCIM provisioning** and click **New token**.
2. Name it after the identity provider, such as Okta.
3. Copy the **SCIM base URL** and the **bearer token**. The token is shown only this once.

- **The base URL** is `https://<your dashboard>/scim/v2`; on RevenueDot Cloud, `https://app.revenuedot.app/scim/v2`.
- **The token** starts with `rdscim_`. It works only on the SCIM service, for this one organization. RevenueDot stores only its SHA-256 hash.
- **Revoke** a token from its row. Requests with it answer 401 at once. The list shows each token's first characters and when it was last used.

## Okta
Turn on SCIM provisioning in the app integration you use for single sign-on ([Okta's guide](https://help.okta.com/en-us/content/topics/apps/apps_app_integration_wizard_scim.htm)):

1. Set **SCIM connector base URL** to the base URL.
2. Set the unique identifier field for users to `userName`.
3. Choose **Push New Users**, **Push Profile Updates** and **Push Groups**.
4. Choose the **HTTP Header** authentication mode and paste the token.
5. Under **To App**, turn on **Create Users**, **Update User Attributes** and **Deactivate Users** ([Okta's SCIM settings](https://developer.okta.com/docs/guides/scim-provisioning-integration-connect/main/)).
6. Assign people to the app, and push the groups you want to map.

## Microsoft Entra ID
Open the enterprise application you use for single sign-on, then **Provisioning** ([Microsoft's guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups)):

1. Put the base URL in **Tenant URL** and the token in **Secret Token**.
2. Click **Test Connection**. Entra looks up a user that does not exist; RevenueDot answers with an empty list.
3. Assign users and groups to the application. Entra provisions only assigned users and groups.
4. Start provisioning. Entra syncs about every 40 minutes after its first cycle.

## What SCIM does to people
| Identity provider does | RevenueDot does |
|---|---|
| **Creates a user** | Links the RevenueDot account with that email, or creates one without a password. The person becomes an active organization member, and their group role mappings apply |
| **Updates a user** | Saves the new details. A new email must also be on a verified domain. The account's own email changes only when the new address is free and the old one is on your verified domains |
| **Deactivates a user** (`active: false`) or **deletes** them | Deprovisions them, below |
| **Reactivates a user** | Makes them an active member again and restores the access their groups give. Their email must be on a verified domain |
| **Creates, renames or changes a group** | Saves it and re-applies the role mappings of everyone who joined or left (everyone in it, after a rename) |
| **Deletes a group** | Removes the access its mappings gave |

**Which email counts:** the primary address, else the work address, else the first one, else `userName` when it is an email address.

### Deprovisioning
When the identity provider deactivates or deletes someone:

- **They lose every membership in the organization's projects,** including memberships added by hand.
- **Every session they have ends at once.** They are signed out of RevenueDot everywhere.
- **They cannot get back in.** SSO sign-in answers "Your access to this organization was removed." The organization's projects answer 404, even if someone adds them to a project by hand later.
- **Their account and the audit history stay.** Deleting the SCIM user does not delete the RevenueDot account.
- **Project API keys stay.** Secret API keys belong to the project, not to a person, including the keys MCP clients got through OAuth (named after the client, such as "OAuth: Claude"). Revoke the ones the person made under **API keys** in each project.
- **The organization's last owner cannot be deactivated.** SCIM answers 400; make someone else an owner first.
- Deactivation works even after you removed the person's email domain.

## Group role mappings
A mapping says: people in this group get this role in this project.

1. Open **Organization settings → SCIM provisioning** and click **Map a group**.
2. Pick or type the group name, the project and the role: Admin, Developer, Viewer or a [custom role](enterprise.md#custom-roles).
3. Save. RevenueDot applies it to every member of the organization at once.

- **Groups come from SCIM and from single sign-on.** RevenueDot matches the name against SCIM group names and against the groups attribute or claim of each person's last SSO sign-in. Case does not matter.
- **One mapping per group and project.** Saving the same group and project again replaces the role.
- **Highest role wins.** Someone in several mapped groups gets the highest role for each project: Admin, then Developer, then custom roles (the one with more permissions first), then Viewer.
- **Organization owners and admins are always Admins** of every organization project, whatever their groups say.
- **Roles set by hand stay.** A mapping never changes a membership someone added by hand (an invite, for example), or a role someone set in **Organization settings → Projects → Members and roles**, while the person is active. A role changed in **Project settings → Collaborators** on a membership a mapping made goes back to the mapped role the next time mappings apply (a group change, a mapping change or an SSO sign-in).
- **Mappings clean up after themselves.** When a mapping no longer applies (the person left the group, or you deleted the mapping), the membership it made is removed or lowered.

## What the SCIM service supports
| Endpoint | Methods |
|---|---|
| `/ServiceProviderConfig`, `/ResourceTypes`, `/Schemas` | GET |
| `/Users` | GET (list and filter), POST |
| `/Users/{id}` | GET, PUT, PATCH, DELETE |
| `/Groups` | GET (list and filter), POST |
| `/Groups/{id}` | GET, PUT, PATCH, DELETE |

- **Filters:** `eq`, `ne`, `co`, `sw`, `ew`, `pr`, `gt`, `ge`, `lt`, `le`, with `and`, `or`, `not` and parentheses, and value paths such as `emails[type eq "work"].value`. Attribute names and operators ignore case.
- **Paging:** `startIndex` starts at 1; `count` is 100 by default and at most 200.
- **`attributes` and `excludedAttributes`** pick the returned attributes. `excludedAttributes=members` skips group members.
- **PATCH:** `add`, `replace` and `remove`, with or without a path. Okta's `replace` without a path, Entra's capitalised operations (`Replace`), `"False"` and `"True"` strings, and dotted keys such as `name.givenName` all work.
- **ETags:** every resource has a version. `If-Match` with an old version answers 412; `If-None-Match` with the current one answers 304.
- **Users** keep the attributes you send, such as `phoneNumbers`, `title` and the enterprise extension (`department`, `manager` and so on), and return them.
- **Errors** are RFC 7644 bodies with `application/scim+json`, such as `{"schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"], "status": "409", "scimType": "uniqueness", "detail": "..."}`. A `userName` or group name that is taken answers 409.

### Not supported
- **Bulk** (`/Bulk`) and **`/Me`**: 404.
- **Sorting** (`sortBy`).
- **Passwords:** `password` is ignored; SCIM-created accounts sign in with SSO.
- **Nested groups:** a group member that is a group is refused. Add its users instead.
- Bodies over 1 MB, and groups over 50,000 members.
- Filters run in memory, which suits up to tens of thousands of users per organization.

## Do it with the API
Token and group endpoints take a dashboard session of an organization owner or admin. The SCIM service takes the token. Details: [SCIM API](../../api/enterprise.md#scim-20).

| Task | Request |
|---|---|
| List or create tokens | `GET` or `POST /v2/organizations/{org_id}/scim/tokens` |
| Revoke a token | `DELETE /v2/organizations/{org_id}/scim/tokens/{token_id}` |
| Groups the identity provider pushed | `GET /v2/organizations/{org_id}/scim/groups` |
| List or add role mappings | `GET` or `POST /v2/organizations/{org_id}/role_mappings` |
| Delete a role mapping | `DELETE /v2/organizations/{org_id}/role_mappings/{mapping_id}` |

## Related
- [Single sign-on](single-sign-on.md)
- [Enterprise](enterprise.md): organizations and custom roles
- [Audit retention and exports](audit-retention-and-exports.md): every SCIM change is in the organization audit log
