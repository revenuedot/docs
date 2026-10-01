---
title: How do I sign users in with Firebase or OpenID Connect and link them to their purchases?
description: RevenueDot Auth (beta) checks your identity provider's ID token, signs the user in as their app user ID with logIn semantics, and returns a token your app uses to read customer info, attributes and in-app currency balances without a backend of its own.
---

# How do I sign users in with Firebase or OpenID Connect and link them to their purchases?

Turn on **Auth** in the dashboard, add your identity provider, and have your app send RevenueDot the ID token it already gets when the user signs in. RevenueDot verifies the token with the provider's published keys, signs the user in as their app user ID, moves purchases made before sign-in to them (like `logIn`), and returns an access token. With that token the app reads its own customer info, attributes and balances. You do not need a backend to call `logIn` safely, and nobody can sign in as someone else by changing an app user ID in the app.

Auth is in beta. It works with Firebase Authentication and with any OpenID Connect provider: Auth0, Clerk, Supabase, Amazon Cognito, Okta, Keycloak, Google (`https://accounts.google.com`) and Sign in with Apple (`https://appleid.apple.com`).

## Providers

1. Open **Auth** in the sidebar and switch **Auth is on for this project**.
2. Click **Add provider**.
   - **Firebase:** enter the Firebase project ID (Firebase console → Project settings → General). RevenueDot accepts tokens whose `iss` is `https://securetoken.google.com/<project id>` and whose `aud` is the project ID, signed with Google's published keys.
   - **OpenID Connect:** enter the **issuer** exactly as your tokens' `iss` claim (Auth0's ends with a slash), the **audiences** (the client IDs in `aud`), and optionally a JWKS URL. Without one, RevenueDot reads `jwks_uri` from `<issuer>/.well-known/openid-configuration`.
3. Choose how a user becomes an app user ID: the claim (`sub` by default, which never changes) and an optional prefix such as `firebase:`. A user who signed in once keeps their app user ID even if you change this later.
4. Use **Test a token** with an ID token from your app. It runs every check and shows the app user ID it would sign in as, without signing anyone in.

What RevenueDot checks on every sign-in: the signature (RS256/384/512, PS256/384/512, ES256/384 or EdDSA; never `none` or HMAC), the issuer, the audience, that `exp` is in the future and `nbf`, `iat` and Firebase's `auth_time` are not (60 seconds of leeway), a subject of at most 255 characters, and a token of at most 16 KB. Keys are fetched over https from public addresses only (on RevenueDot Cloud), never through a redirect, and cached for as long as the provider says (5 minutes to 24 hours). A new key ID makes RevenueDot fetch the keys again, at most once a minute. If the provider is down, keys already fetched keep working.

**Anonymous sign-in.** With **Allow anonymous sign-in** on, `method: "anonymous"` (no ID token) creates an anonymous app user ID and signs it in. Leave it off unless you want every install to get tokens.

## Sign in from your app

Call `POST /v1/auth/login` with your app's **public SDK key** (never a secret key) and the provider's ID token. Pass the app user ID the app used before sign-in as `link_to_id`: when it is anonymous (`$RCAnonymousID:…`), its purchases move to the signed-in user, exactly like `Purchases.logIn`.

```bash
curl -X POST https://api.revenuedot.app/v1/auth/login \
  -H "Authorization: Bearer $PUBLIC_SDK_KEY" -H "Content-Type: application/json" \
  -d '{"method":"firebase","id_token":"'"$FIREBASE_ID_TOKEN"'","link_to_id":"$RCAnonymousID:9f3c1a0e2b7d4c5a8e6f1b2d3c4a5e6f"}'
```

```json
{
  "access_token": "eyJhbGciOiJFZERTQSIsInR5cCI6ImF0K2p3dCJ9.…",
  "refresh_token": "rdrf_9b0c…",
  "id_token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.…",
  "scope": "openid offline_access",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

- The **access token** lasts one hour and speaks for one app user ID of one app. Send it as `Authorization: Bearer` to the `/v1/customer/*` paths. Its `rc.app_user_id` claim is the app user ID.
- **Refresh** before it expires with `POST /v1/auth/token` and `{"grant_type":"refresh_token","refresh_token":"rdrf_…"}`. The refresh token lasts 30 days and is replaced on every refresh; an old one is refused.
- **Sign out** with `POST /v1/auth/revoke` and `{"token":"rdrf_…","token_type_hint":"refresh_token"}`. The session and every access token it issued stop working at once.

Use `firebase` for Firebase tokens and `oidc` for any OpenID Connect provider (`google`, `apple` and `facebook` are accepted as names for OpenID Connect providers too). Errors use the SDK's format: `401` with code `7224` for a token that fails a check, `403` with `7224` when Auth is off or no provider fits, `503` when the provider's keys cannot be loaded (retry).

The same calls also answer at `/auth/login`, `/auth/token` and `/auth/revoke` in the wire format of the RevenueCat SDKs' token login ([iOS](https://github.com/revenuedot/purchases-ios/blob/main/Sources/Networking/Operations/TokenOperations.swift), [Android](https://github.com/revenuedot/purchases-android/blob/main/purchases/src/main/kotlin/com/revenuecat/purchases/common/networking/TokenManager.kt)). That mode is internal to the SDKs today, so most apps call `/v1/auth/*` directly as above.

## Attributes

With the access token, the app reads what belongs to its user without a backend:

| Call | Answer |
|---|---|
| `GET /v1/customer` | Customer info: entitlements, subscriptions, purchases |
| `GET /v1/customer/attributes` | The attributes the SDK or your server set, such as `$displayName` or your own keys |
| `POST /v1/customer/attributes` | Set attributes |
| `GET /v1/customer/virtual_currencies` | In-app currency balances |
| `POST /v1/customer/virtual_currencies/spend` | Spend currency (all or nothing, never below zero) |
| `GET /v1/customer/offerings` | The offerings this user should see |

Attributes can hold an email address or a phone number, so a public SDK key alone cannot read them: `GET /v1/subscribers/{app_user_id}/attributes` needs this user's access token or a secret key.

## Backend

Your backend can look a user up by the provider's user ID (a Firebase uid, an Auth0 `sub`) and read their balances and entitlements with a secret key:

```bash
curl https://api.revenuedot.app/v2/projects/$PROJECT_ID/auth/identities/$PROVIDER_ID/$FIREBASE_UID \
  -H "Authorization: Bearer $SECRET_KEY"
```

```json
{
  "object": "auth_identity", "provider_id": "idp_4f1c9a2b7e3d", "subject": "Xk2f9QpL0aZ", "app_user_id": "Xk2f9QpL0aZ",
  "logins": 12, "last_login_at": 1790894800000, "created_at": 1790800000000, "customer_id": "Xk2f9QpL0aZ",
  "active_entitlements": [{ "lookup_key": "pro", "expires_at": 1793486800000 }],
  "virtual_currencies": { "GEMS": { "balance": 40, "name": "Gems", "code": "GEMS" } }
}
```

- `GET /v2/projects/{project_id}/auth/identities` lists sign-ins, newest first, filtered by `provider_id`, `subject` or `app_user_id`.
- `DELETE /v2/projects/{project_id}/auth/identities/{provider_id}/{subject}` unlinks an identity and signs it out everywhere.
- To trust a RevenueDot `id_token` in your backend, verify it with the key at `GET /.well-known/jwks.json` (Ed25519, `alg: EdDSA`) and check `iss` (your RevenueDot server) and `aud` (your app's ID).

## Good to know

- [Blocked](project-settings.md#blocked-customers) app user IDs can still sign in, but they get no entitlements.
- Deleting a provider signs out everyone who signed in through it. App user IDs, purchases and balances stay.
- Self-hosted servers sign tokens with a key derived from `REVENUEDOT_SIGNING_KEY` (or `REVENUEDOT_ENCRYPTION_KEY`). Without either, sign-in answers 503. Self-hosted servers may also use identity providers on their own network; RevenueDot Cloud only calls public https addresses.
- Every change to providers, settings and identities is in the [audit log](project-settings.md).
