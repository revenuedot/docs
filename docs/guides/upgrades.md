---
title: How do I upgrade a self-hosted RevenueDot?
description: Back up the database, pull the new source, rebuild and restart. The server applies new database migrations by itself when it starts; there is no separate migrate step.
---

# How do I upgrade a self-hosted RevenueDot?

Back up, pull, rebuild, restart. The server applies any new database migrations when it starts, before it accepts requests, so there is no separate migration command. Your `.env` stays as it is.

```bash
cd revenuedot
docker compose exec -T db pg_dump -U revenuedot -Fc revenuedot > revenuedot-before-upgrade.dump   # 1. back up
git pull                                                                                        # 2. new source
docker compose up -d --build                                                                    # 3. rebuild and restart
curl -s http://localhost:8787/v1/health                                                         # 4. {"status":"ok"}
```

## What happens during the restart
- The old container stops and the new one starts. Requests in between fail for a few seconds.
- **The SDKs handle this.** A failed receipt post is kept on the device and retried, and customer info comes from the SDK's cache.
- **Stores retry.** Apple and Google resend notifications that got no 2xx answer.
- **Webhooks wait.** Pending deliveries stay in the database and go out after the restart.

For no downtime at all, run the new version next to the old one against the same database only after reading the release notes: RevenueDot has no release process with compatibility guarantees yet (pre-alpha).

## If the new version does not start
1. Read the log: `docker compose logs revenuedot --tail 100`. A failed migration names the statement.
2. Go back to the previous commit and rebuild: `git checkout <previous commit> && docker compose up -d --build`.
3. If a migration already ran, restore the backup as described in [Backups](backups.md#restore), then start the previous version.

## Keep up with changes
- Watch the [server repository](https://github.com/revenuedot/revenuedot) for commits and, later, releases.
- Migrations live in `packages/db/migrations`. Each upgrade applies the ones your database has not seen, in order.
- Accounts made by builds from before 2026-09-30 used 210,000 password-hashing iterations; newer builds use 100,000. Both verify on a self-hosted server, so nobody needs to reset a password.

## Related
- [Backups](backups.md)
- [Self-hosting](self-hosting.md)
- [Going to production](going-to-production.md)
