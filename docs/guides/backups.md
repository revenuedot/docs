---
title: How do I back up and restore a self-hosted RevenueDot?
description: Everything lives in Postgres. Back it up with pg_dump on a schedule, keep copies off the server, and restore with pg_restore while the RevenueDot container is stopped.
---

# How do I back up and restore a self-hosted RevenueDot?

All of RevenueDot's state is in Postgres: projects, apps and their store credentials, the catalog, customers, purchases, events, webhook deliveries and API key hashes. Back up the database with `pg_dump` on a schedule and keep the copies somewhere other than the server. The container itself holds nothing you need to keep.

## Back up
```bash
# A compressed custom-format dump of the bundled Postgres
docker compose exec -T db pg_dump -U revenuedot -Fc revenuedot > revenuedot-$(date +%F).dump
```

Run it daily, for example from cron, and copy the file to object storage:

```cron
15 3 * * * cd /srv/revenuedot && docker compose exec -T db pg_dump -U revenuedot -Fc revenuedot > /backups/revenuedot-$(date +\%F).dump
```

- **The dump contains secrets.** App store credentials (the App Store `.p8` key, Google service account JSON) and webhook signing secrets are stored in the database. Encrypt backups and limit who can read them.
- **Managed Postgres** (RDS, Cloud SQL, Neon, Supabase and others) has its own point-in-time recovery. Turn it on; it covers you between dumps.
- **Store the signing key separately.** `REVENUEDOT_SIGNING_KEY` is not in the database. Keep it in your password manager.

## Restore
Stop the API, restore, start it again:

```bash
docker compose stop revenuedot
docker compose exec -T db pg_restore -U revenuedot -d revenuedot --clean --if-exists < revenuedot-2026-09-30.dump
docker compose start revenuedot
```

After a restore, the database is as it was at the dump. Purchases made since then come back by themselves:
- Apps post receipts again on their next `syncPurchases()`, restore or purchase.
- Store notifications that failed while the server was down are retried by Apple and Google.
- For a long gap, re-run the migration importer from RevenueCat if you are still in a [dual run](../migrate/dual-run.md), or ask users to restore purchases.

## Start over
```bash
docker compose down -v   # deletes the volume: every customer and purchase
```

## Related
- [Upgrades](upgrades.md)
- [Self-hosting](self-hosting.md)
- [Going to production](going-to-production.md)
