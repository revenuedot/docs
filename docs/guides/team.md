---
title: How do I invite my team to a RevenueDot project?
description: Project admins invite people by email with the Admin, Developer or Viewer role. The link lasts 7 days. Admins change roles and remove members; a project always keeps one admin.
---

# How do I invite my team to a RevenueDot project?

Open **Project settings → Collaborators** and click **Invite**. Enter the person's email address, pick a role and send. They get an email with a link that works for 7 days. Only project admins can invite, change roles and remove people. Everyone in a project is a **member** with one role in that project; a person can have a different role in each project.

## Roles
The roles follow RevenueCat's collaborator roles ([Collaborators](https://www.revenuecat.com/docs/projects/collaborators)). RevenueDot has three of them today.

| Role | Can do | Cannot do | Name in API v2 |
|---|---|---|---|
| **Admin** | Everything: apps, store credentials, products, entitlements, offerings, customers, webhooks, secret API keys, invites, members, deleting the project | Nothing is off limits | `admin` |
| **Developer** | Read everything. Edit apps, store credentials, the catalog, customers, webhooks and project settings | Create or revoke secret API keys, invite people, change roles, remove other members, delete the project | `developer` |
| **Viewer** | Read everything the dashboard shows | Change anything | `read_only` (RevenueCat's "View Only") |

`GET /v2/projects/{project_id}/collaborators` answers with RevenueCat's role names, so the Viewer role comes back as `read_only`. Requests that set a role take `admin`, `developer` or `viewer`.

**Custom roles** (for example a support agent who can refund but not edit the catalog) are included with Pro on Cloud, or with an Enterprise licence when self-hosting ([Custom roles](enterprise.md#custom-roles)). A member with one shows **Custom role** in Collaborators, and the API returns the role's id (`role_...`). Single sign-on comes with the same plans ([Single sign-on](single-sign-on.md)); SCIM needs Enterprise ([SCIM](scim.md)).

## Invite someone
1. Open **Project settings → Collaborators** and click **Invite**.
2. Enter the email address and pick **Admin**, **Developer** or **Viewer**.
3. Click **Send invite**. The invite shows under **Pending invites** until the person accepts it.

- **The link lasts 7 days.** An expired invite stays in the list, so you can send it again.
- **Resend** sends a new link that lasts another 7 days. The old link stops working.
- **Revoke** makes the link stop working at once. You can invite the same address again later.
- **Inviting an address that already has a pending invite** replaces it: the new role applies, and only the newest link works.
- **Inviting someone who is already a member** fails with a message that they are already in the project.
- **A project can send 50 invites a day**, resends included. After that, try again the next day.
- **On RevenueDot Cloud, you need a confirmed email address to invite people.** A banner at the top of the dashboard offers a new confirmation email if you lost the first one. Self-hosted servers treat every account as confirmed.

If the dashboard says the invite was saved but the email could not be sent, the mail server refused it. Fix the mail settings, then click **Resend**. On a self-hosted server without email, the invite link is printed to the server log; see [Email](self-hosting.md#email).

## Accept an invite
The link in the email opens the invite page. It shows the project, the role and who invited you.

- **You already have an account:** sign in with the invited address and click **Accept invite**. If you are signed in with another address, sign out and sign in with the invited one. If you are already a member of the project, you keep your current role.
- **You are new:** create an account on the invite page. The email address is fixed to the invited one, and it counts as confirmed, so you get no confirmation email. You join the project instead of getting an empty one.

A self-hosted server closes sign-up after the first account (the owner). An invite still lets the invited address create an account. Nobody else can sign up unless the server runs with `REVENUEDOT_ALLOW_SIGNUP=true`.

## Change a role, remove a member, or leave
- **Change a role:** admins pick a new role in the member's row.
- **Remove a member:** admins open the member's menu and click **Remove from project**. The person loses access at once.
- **Leave a project:** any member can open their own menu and click **Leave project**.
- **A project always keeps at least one admin.** The last admin cannot be demoted, removed or leave. Make someone else an admin first, or delete the project.

## Do it with the API
These are RevenueDot extensions. They need a dashboard session (the `rd_session` cookie from `POST /auth/login`); secret API keys cannot manage members. See [Members and invites](../../api/extensions.md#members-and-invites) for request and response details.

| Task | Request |
|---|---|
| List members | `GET /v2/projects/{project_id}/collaborators` |
| List pending and expired invites | `GET /v2/projects/{project_id}/invites` |
| Invite by email | `POST /v2/projects/{project_id}/invites` with `{"email": "sam@example.com", "role": "developer"}` |
| Resend an invite | `POST /v2/projects/{project_id}/invites/{invite_id}/actions/resend` |
| Revoke an invite | `DELETE /v2/projects/{project_id}/invites/{invite_id}` |
| Change a member's role | `POST /v2/projects/{project_id}/collaborators/{user_id}` with `{"role": "viewer"}` |
| Remove a member, or leave (your own `user_id`) | `DELETE /v2/projects/{project_id}/collaborators/{user_id}` |
| Look up an invite from its link | `GET /auth/invites/{token}` (no session) |
| Accept as an existing user | `POST /auth/invites/{token}/accept` |
| Sign up from an invite | `POST /auth/signup` with `invite_token` |

## Related
- [Alert emails](alerts.md): what admins get told when something breaks
- [Self-hosting: Email](self-hosting.md#email)
- [Projects, apps and API keys](../concepts/projects-and-apps.md)
- [Enterprise](enterprise.md): organizations, custom roles, single sign-on and SCIM
