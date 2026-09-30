---
title: Which alert emails does RevenueDot send?
description: Project admins get an email when store notifications fail, a webhook fails 5 times in a row, or Apple or Google rejects the store credentials. One email when it starts, at most one reminder a day, one when it is fixed.
---

# Which alert emails does RevenueDot send?

RevenueDot emails a project's admins when one of three things breaks: **store notifications are failing**, **a webhook keeps failing**, or **Apple or Google rejects the app's store credentials**. You get one email when the problem starts, at most one reminder a day while it lasts, and one email when it is fixed. Each email links to the app or webhook page that shows the details.

## The three alerts
| Alert | When it starts | When it ends |
|---|---|---|
| **Store notifications failing** | An App Store, Mac App Store or Google Play app's setup health says notifications are **failing**: the newest notification from the store could not be processed (for example a bad signature, another bundle ID or package name, or an invalid purchase token) | The next notification from the store is processed |
| **Webhook failing** | The last 5 delivery attempts to one webhook all failed. Paused webhooks do not alert | A delivery succeeds, or you pause the webhook |
| **Store credentials failing** | Apple answers 401 to the app's in-app purchase key, or Google answers 401 or 403 to the service account. This counts on any call: receipt checks, store notifications, the Google Play voided-purchases scan and the dashboard's **Check credentials** button | A check with the store succeeds |

RevenueDot checks the store credentials of a failing app again every hour, and the credentials of every app once a day. So a fixed key clears the alert within an hour, and a key revoked in App Store Connect or Google Cloud raises one within a day even when no purchase comes in.

Deleting the app or the webhook closes its alert without a "fixed" email.

## Who gets them
- **Every admin of the project** gets the emails. Developers and Viewers do not. See [roles](team.md#roles).
- **Each admin can turn them off** in **Account settings** (`/account`, in the menu under your name): switch off **Email me about problems with my projects**. The setting covers every project you administer.
- **With the API:** `POST /auth/me` with `{"alert_emails": false}` turns them off, and `true` turns them back on. `GET /auth/me` shows the current value in `user.alert_emails`. See [Update account settings](../../api/extensions.md#update-account-settings).

## How often
- **One email when the alert opens.**
- **At most one reminder every 24 hours** while it stays open.
- **One email when it resolves.**

RevenueDot looks for problems about every minute on RevenueDot Cloud, and every 30 seconds on a self-hosted server.

## On a self-hosted server
Alert emails need mail settings. Without `REVENUEDOT_SMTP_URL`, each alert email is printed to the server log instead of sent (`docker compose logs revenuedot`). Set `REVENUEDOT_PUBLIC_URL` so the links in the email point at your dashboard. See [Email](self-hosting.md#email).

## Related
- [Why are store notifications not arriving?](../help/store-notifications-not-arriving.md)
- [Why are webhooks not arriving?](../help/webhooks-not-arriving.md)
- [Connect the App Store](app-store.md) and [Connect Google Play](google-play.md)
- [Webhooks](webhooks.md)
