---
title: Which alert emails does RevenueDot send?
description: Project admins get an email when store notifications fail, a webhook fails 5 times in a row, an integration keeps failing, or Apple or Google rejects the store credentials. One email when it starts, at most one reminder a day, one when it is fixed.
---

# Which alert emails does RevenueDot send?

RevenueDot emails a project's admins when one of four things breaks: **store notifications are failing**, **a webhook keeps failing**, **an integration keeps failing**, or **Apple or Google rejects the app's store credentials**. You get one email when the problem starts, at most one reminder a day while it lasts, and one email when it is fixed. Each email links to the app, webhook or integration page that shows the details.

## The four alerts
| Alert | When it starts | When it ends |
|---|---|---|
| **Store notifications failing** | An App Store, Mac App Store or Google Play app's setup health says notifications are **failing**: the newest notification the store really sent could not be processed (for example another bundle ID or package name, or an invalid purchase token). Requests without a valid signature are rejected requests and never raise this alert | The next notification from the store is processed |
| **Webhook failing** | The last 5 delivery attempts to one webhook all failed. Paused webhooks do not alert | A delivery succeeds, or you pause the webhook |
| **Integration failing** | An integration that is on (Amplitude, Segment, Slack and the others) had **10 deliveries in a row fail**, or **more than half of its delivery attempts in the last hour failed** with at least 10 attempts. A delivery fails when it runs out of retries, or at once on an error a retry cannot fix (a 4xx other than 429). Skipped deliveries do not count, and attempts made before you last saved the integration's settings or turned it on do not count either | A delivery succeeds, none has failed since, and a quarter or less of the last hour's attempts failed (fewer than 10 attempts also counts). It also closes when you turn the integration off, or when no rule holds and nothing has failed for 7 days. If it fails again within a day of closing, it reopens without a new email, and the next reminder comes a day after the last one |
| **Store credentials failing** | Apple answers 401 to the app's in-app purchase key, or Google answers 401 or 403 to the service account. This counts on any call: receipt checks, store notifications, the Google Play voided-purchases scan and the dashboard's **Check credentials** button | A check with the store succeeds |

RevenueDot checks the store credentials of a failing app again every hour, and the credentials of every app once a day. So a fixed key clears the alert within an hour, and a key revoked in App Store Connect or Google Cloud raises one within a day even when no purchase comes in.

Deleting the app, the webhook or the integration closes its alert without a "fixed" email. Turning an integration off closes its alert with an email that says it was turned off.

### Integration failing
The email names the integration and the partner, says which rule tripped (for example "The last 10 deliveries failed, one after the other" or "7 of 10 delivery attempts in the last hour failed (70%)"), shows the last error, and links straight to the integration's delivery log, where **Replay failed** sends the failed events again once the settings are fixed. The integration's API object shows the count in `status.failed_deliveries_in_row`. See [Integrations](integrations.md#how-every-integration-behaves).

## Who gets them
- **Every admin of the project** gets the emails. Developers and Viewers do not. See [roles](team.md#roles).
- **Each admin can turn them off** in **Account settings** (`/account`, in the menu under your name): switch off **Email me about problems with my projects**. The setting covers every project you administer.
- **Integration failures have their own switch** under it: **Email me when an integration keeps failing**, on by default. It needs the first switch on.
- **With the API:** `POST /auth/me` with `{"alert_emails": false}` turns them off, and `true` turns them back on. `{"integration_alert_emails": false}` turns off integration failures only. `GET /auth/me` shows the current values in `user.alert_emails` and `user.integration_alert_emails`. See [Update account settings](../../api/extensions.md#update-account-settings).

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
- [Integrations](integrations.md)
