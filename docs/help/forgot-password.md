---
title: What do I do if I forgot my RevenueDot password?
description: Click Forgot password? on the sign-in page and follow the emailed link within 1 hour. Self-hosted servers without email print the link to the server log, or an admin resets the password from the command line.
---

# What do I do if I forgot my RevenueDot password?

Click **Forgot password?** on the sign-in page, enter your email address and open the link RevenueDot emails you. The link works **once** and expires after **1 hour**. Choose a new password (at least 8 characters) and you are signed in. Setting it **signs you out on every other device** and makes older reset links stop working.

## What to expect
- **The page always says the same thing:** "If an account uses this email, we sent it a link". It says this whether or not an account exists, so nobody can use the form to find out who has an account.
- **The email comes from RevenueDot.** On RevenueDot Cloud the sender is `no-reply@mail.revenuedot.app`. Check your spam folder if it does not arrive within a few minutes.
- **Limits:** 5 requests per network address per 15 minutes, then the page asks you to wait. At most 3 reset emails per address per hour; more requests show the same message but send nothing.
- **An expired or used link** shows a message on the reset page. Ask for a new one.

## On a self-hosted server
A self-hosted server sends email only when its admin set `REVENUEDOT_SMTP_URL`. Without it:

1. **The link is in the server log.** Request the reset, then run `docker compose logs revenuedot` and copy the link from the email printed there. See [Email](../guides/self-hosting.md#email).
2. **Or reset the password from the command line**, straight against the database: `revenuedot admin reset-password <email>`. See [Reset a password without email](../guides/self-hosting.md#reset-a-password-without-email).

## Related
- [Invite your team](../guides/team.md)
- [Self-hosting](../guides/self-hosting.md)
- [Password reset endpoints](../../api/extensions.md#email-a-password-reset-link)
