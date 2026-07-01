# Sync local database from VPS

Downloads the live VPS database and imports it into the local Docker Postgres,
so local testing uses real data without touching production.

## When to use

Run this when your local database is out of date and you want to test against
real contacts, campaigns, or events from the VPS.

## Prerequisites

- Docker Desktop must be running (local Postgres must be up)
- VPS must be reachable at 91.98.23.209

## Steps

1. Dump the VPS database to a local temp file:

```bash
ssh root@91.98.23.209 "pg_dump postgres://email_os:VuXg7lKqjZg4UCnQVT1lFBAK92sDhdj@localhost:5432/email_os --no-owner --no-acl" > "a:/Dropbox/ANDREA TARRONI 2026/Email OS/misc/vps-db-dump.sql"
```

2. Clear local tables so the import is clean:

```bash
cd "a:/Dropbox/ANDREA TARRONI 2026/Email OS" && docker-compose exec -T postgres psql -U email_os -d email_os -c "TRUNCATE contacts, events, campaigns, tags, contact_tags, sequences, sequence_steps, sequence_enrollments RESTART IDENTITY CASCADE;"
```

3. Import into local Docker Postgres:

```bash
cd "a:/Dropbox/ANDREA TARRONI 2026/Email OS" && docker-compose exec -T postgres psql -U email_os -d email_os < misc/vps-db-dump.sql
```

4. Verify the import by checking the contacts table:

```bash
cd "a:/Dropbox/ANDREA TARRONI 2026/Email OS" && docker-compose exec -T postgres psql -U email_os -d email_os -c "SELECT email, name, status FROM contacts ORDER BY created_at DESC;"
```

Note: harmless "already exists" errors on constraints and types are expected — they just mean the schema is already in place locally.

Report the contacts shown in step 3 to confirm the sync succeeded.
