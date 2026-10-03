---
title: How do I set up single sign-on for RevenueDot with SAML or OpenID Connect?
description: Verify your email domain with a DNS TXT record, connect Okta, Microsoft Entra ID, Google Workspace or any SAML 2.0 or OpenID Connect provider, then optionally require SSO. Owners and contractors keep passwords.
---

# How do I set up single sign-on for RevenueDot with SAML or OpenID Connect?

Single sign-on (SSO) is part of RevenueDot Cloud Standard and Enterprise, and of self-hosted servers with an Enterprise licence key ([which plan has which feature](enterprise.md)). An organization admin does three things in **Organization settings → Single sign-on**:

1. **Verify your email domain** with a DNS TXT record.
2. **Add a connection** to your identity provider (SAML 2.0 or OpenID Connect) and turn it on.
3. **Optionally require SSO** for everyone on your verified domains.

People then click **Continue with SSO** on the sign-in page and enter their work email. RevenueDot sends them to your identity provider and back.

RevenueCat offers SSO only on its Enterprise plan, on request, through WorkOS ([SSO](https://www.revenuecat.com/docs/projects/sso)).

## Before you start
- **On RevenueDot Cloud, Cloud Standard or Enterprise** for an owner of the organization. **On a self-hosted server, an Enterprise licence key with the `sso` feature,** or development mode. See [Turn it on](enterprise.md#turn-it-on).
- **An organization** with your projects in it ([Organizations](enterprise.md#organizations)).
- **Self-hosted servers: set `REVENUEDOT_PUBLIC_URL`** to the address people use to open the dashboard, such as `https://revenuedot.example.com`. The SAML entity ID, the ACS URL, the OpenID Connect redirect URI and the SCIM base URL are built from it. Without it, RevenueDot builds them from the address of each request (`X-Forwarded-Host` behind a proxy), so they change if someone opens the dashboard under another name, and your identity provider then refuses the sign-in. On RevenueDot Cloud the addresses start with `https://app.revenuedot.app`.

## Verify your email domain
SSO only signs in addresses on domains your organization verified. This stops an identity provider from signing in as someone else's account.

1. Under **Verified domains**, click **Add domain** and enter the domain, such as `acme.com`.
2. Add the TXT record RevenueDot shows at your DNS provider:

   | Type | Name | Value |
   |---|---|---|
   | TXT | `_revenuedot-sso.acme.com` | `revenuedot-sso-verification=<token>` |

3. Click **Check DNS**. RevenueDot looks the record up through Cloudflare's DNS over HTTPS. DNS changes can take a few minutes; you can check up to 10 times a minute.

- **Public mail domains are refused,** such as gmail.com, outlook.com and icloud.com.
- **A domain belongs to one organization.** Once another organization verified it, adding it answers "Another organization verified this domain." An unverified claim by someone else does not block you: add the domain and publish your record.
- **Keep the record.** RevenueDot does not re-check a verified domain on its own. A later failed check leaves it verified.
- **Removing a domain** stops SSO and SSO enforcement for addresses on it.

## Add a SAML connection
1. Click **New connection**, pick **SAML 2.0** and give it a name, such as Okta.
2. In your identity provider, create a SAML app with the values below. Open the connection's menu → **Values for your identity provider** to copy them.
3. Back in RevenueDot, paste the identity provider's **metadata XML**, or enter its **entity ID (issuer)**, **single sign-on URL** (HTTP-Redirect binding) and **signing certificate** (PEM). Paste two certificates during a rotation.
4. Turn the connection on, then open **Test sign-in** in a private window.

**The values for your identity provider:**

| Value | What it is |
|---|---|
| **ACS URL** (assertion consumer service, single sign-on URL, reply URL) | `https://<your dashboard>/sso/saml/<connection id>/acs` |
| **Entity ID** (audience, identifier) | `https://<your dashboard>/sso/saml/<connection id>/metadata`. This URL also serves RevenueDot's service provider metadata |
| **NameID** | The person's email address (email address format) |
| **Groups attribute** (optional) | An attribute named `groups` that lists the person's groups, for [group role mappings](scim.md#group-role-mappings) |

RevenueDot reads the email from an `email`, `mail` or `emailaddress` attribute (or Microsoft's emailaddress claim), else from the NameID when it is an email address. It reads groups from `groups` or Microsoft's groups claim unless you name another attribute in **Groups attribute**. First and last name come from common attribute names such as `givenname` and `surname`.

### Okta
Create a SAML 2.0 app integration in the Okta Admin Console ([Okta's SAML field reference](https://help.okta.com/en-us/content/topics/apps/aiw-saml-reference.htm)). Put the ACS URL in **Single sign-on URL** and the entity ID in **Audience URI (SP Entity ID)**. Set **Name ID format** to EmailAddress and **Application username format** to Email. To send groups, add a **Group Attribute Statement** named `groups` with a filter that matches the groups you map. Then copy the app's metadata URL contents into RevenueDot, and assign people to the app.

### Microsoft Entra ID
Create an enterprise application (non-gallery) and choose SAML ([Microsoft's guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/add-application-portal-setup-sso)). In **Basic SAML Configuration**, put the entity ID in **Identifier (Entity ID)** and the ACS URL in **Reply URL (Assertion Consumer Service URL)**. Make the unique user identifier (NameID) the user's email. Download **Federation Metadata XML** and paste it into RevenueDot.

For groups, use **Add a group claim**. Entra sends group object IDs by default, and RevenueDot matches group **names**. To send names, choose **Groups assigned to the application** and the source attribute **Cloud-only group display names**, or `sAMAccountName` for groups synced from Active Directory ([Microsoft's group claims guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims)). Otherwise map the object IDs as group names.

### Google Workspace
In the Admin console, add a custom SAML app ([Google's guide](https://support.google.com/a/answer/6087519)). Download the IdP metadata and paste it into RevenueDot. In the service provider details, put the ACS URL in **ACS URL** and the entity ID in **Entity ID**, set **Name ID format** to EMAIL and **Name ID** to the primary email. To send groups, add a group membership mapping named `groups`. Turn the app on for the people who should use it.

### Sign-in started from the identity provider
**Allow sign-in started from the identity provider** lets people open RevenueDot from their Okta or Entra dashboard. It is **off by default**, and RevenueDot refuses such sign-ins until you turn it on.

Why: a normal sign-in starts in RevenueDot, and RevenueDot only accepts the answer in the browser that started it. A sign-in started at the identity provider has no such start, so RevenueDot cannot tell whether the person in front of the browser asked for it. An attacker could sign a victim's browser into the attacker's own account. Each assertion is still accepted only once. Turn it on only if your people need the app tile.

## Add an OpenID Connect connection
1. In your identity provider, register a web application with the redirect URI `https://<your dashboard>/sso/oidc/<connection id>/callback` and the scopes `openid email profile`.
2. Click **New connection**, pick **OpenID Connect**, and enter the **Issuer URL**, **Client ID** and **Client secret**. RevenueDot reads `<issuer>/.well-known/openid-configuration`.
3. To use groups, enter the ID token claim that lists them in **Groups claim**, such as `groups`. Without it, RevenueDot reads no groups.
4. Turn the connection on and open **Test sign-in**.

RevenueDot uses the authorization code flow with PKCE, a state and a nonce. It checks the ID token's signature, issuer, audience, expiry and nonce. The token must carry an `email` claim, and an `email_verified` claim of false is refused. On RevenueDot Cloud the issuer and its endpoints must be public https addresses. The client secret is stored encrypted and never shown again.

## Accounts made at first sign-in
**Create accounts at first sign-in** (just-in-time provisioning) is on for new connections.

- **On:** a person's first SSO sign-in creates their RevenueDot account, with no password and a confirmed email, and makes them an organization member. Someone who already has an account with that address keeps it and joins the organization.
- **An existing account whose email was never confirmed loses its password and sessions** at its first SSO sign-in (or when SCIM creates the person). Anyone could have signed up with that address before you set up SSO, so RevenueDot does not let that sign-up share the account. Owners and admins of your organization keep their passwords. The person can set a new password with **Forgot password** unless you require SSO.
- **Off:** only people who are already organization members can sign in, for example people [SCIM](scim.md) created or members you added.
- **Groups:** the groups your identity provider sends are saved at each sign-in, and [group role mappings](scim.md#group-role-mappings) give the person their project roles at once.
- **Projects:** a new member sees only the projects their organization role, a group mapping or an invite gives them.

## Require single sign-on
Turn on **Require single sign-on** after you have an enabled connection and a verified domain. Then, for addresses on your verified domains:

- **Password sign-in, sign-up and password reset are refused.** The sign-in page says "Acme Inc. requires single sign-on for @acme.com addresses." and offers **Continue with SSO**. The API answers 403 with `type: "sso_required"` and an `sso_url`.
- **Sessions that did not start with your organization's SSO lose access to its projects.** They get 403: "This project's organization requires single sign-on. Sign out, then sign in with SSO."
- **The same goes for Organization settings.** An admin whose password session started before you required SSO must sign in with SSO to manage the organization, so that session cannot turn the requirement off.
- **MCP clients and RevenueDot AI follow the same rule.** Connecting an MCP client with OAuth needs an SSO session; RevenueDot AI acts with the session of the chat.
- **Owners keep password sign-in.** If your identity provider is down, an owner can still sign in with a password and fix the connection or turn the requirement off.
- **People on other domains keep their passwords,** such as contractors and agencies. RevenueDot only requires SSO for domains you verified. RevenueCat removes every existing collaborator when it turns SSO on ([SSO](https://www.revenuecat.com/docs/projects/sso)).
- **Your last enabled connection** cannot be turned off or deleted while SSO is required.

## What people see when sign-in fails
A failed SSO sign-in goes back to the sign-in page with a message. The exact reason goes to the organization audit log as `sso_sign_in_failed` (never the SAML assertion itself).

| Message | Why | What to do |
|---|---|---|
| Single sign-on is not set up for this email address. | The domain is not verified, or the organization has no enabled connection | Verify the domain and turn a connection on |
| This single sign-on connection is turned off. | The connection is off | Turn it on |
| Your email address is not on a domain this organization verified. | The identity provider sent an address on another domain | Verify that domain, or fix the email the identity provider sends |
| Ask your administrator to add you to the organization before you sign in with SSO. | Accounts at first sign-in are off and the person is not a member | Add them, provision them with SCIM, or turn on accounts at first sign-in |
| Your access to this organization was removed. Ask your administrator. | SCIM deactivated the person | Reactivate them in the identity provider |
| This sign-in was started in another browser or has expired. Start it again here. | The answer reached a different browser, or more than 10 minutes passed | Start again from the RevenueDot sign-in page |
| Your identity provider did not complete the sign-in. | The identity provider returned an error (OpenID Connect) | Check the app's assignment in the identity provider |
| Too many sign-in attempts. Try again in a minute. | More than 30 starts a minute from one IP address | Wait a minute |
| Single sign-on failed. Try again, or ask your administrator to check the connection. | Anything else: a bad signature, the wrong audience or entity ID, an expired or reused assertion, IdP-initiated sign-in while it is off, a missing email claim | Read the organization audit log for the reason |

## Limits
- SAML: no encrypted assertions, no signed sign-in requests and no single logout.
- `/sso/start` uses the organization's oldest enabled connection. Other connections work through their own **Test sign-in** link (`/sso/connections/<id>/start`).
- OpenID Connect: the client authenticates with its secret (`client_secret_basic` or `client_secret_post`), not with a private key JWT.

## Do it with the API
These take a dashboard session of an organization owner or admin. Details: [Single sign-on API](../../api/enterprise.md#single-sign-on).

| Task | Request |
|---|---|
| List or add connections | `GET` or `POST /v2/organizations/{org_id}/sso/connections` |
| Change, turn on or off, or delete a connection | `POST` or `DELETE /v2/organizations/{org_id}/sso/connections/{connection_id}` |
| List or add domains | `GET` or `POST /v2/organizations/{org_id}/sso/domains` |
| Check a domain's TXT record | `POST /v2/organizations/{org_id}/sso/domains/{domain}/actions/verify` |
| Remove a domain | `DELETE /v2/organizations/{org_id}/sso/domains/{domain}` |
| Require SSO | `POST /v2/organizations/{org_id}` with `{"sso_enforced": true}` |

## Related
- [SCIM](scim.md): create, update and deactivate people from your identity provider
- [Enterprise](enterprise.md): organizations and custom roles
- [Audit retention and exports](audit-retention-and-exports.md)
