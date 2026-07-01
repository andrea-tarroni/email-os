# Deploy Email OS to VPS

Deploys the current local code to the production VPS (91.98.23.209).

## What this does

1. Commits and pushes any uncommitted local changes to GitHub
2. SSHs into the VPS and pulls the latest code
3. Installs dependencies and builds
4. Runs any pending database migrations
5. Restarts the app via PM2

## Note

If `npm run dev` is running in a terminal, that's fine — the deploy runs through Claude's tools directly and doesn't need a separate terminal. No action needed on your part.

## Steps

First, commit and push any local changes:

```bash
cd "a:/Dropbox/ANDREA TARRONI 2026/Email OS" && git status
```

If there are uncommitted changes, stage and commit them (ask the user for a commit message if needed), then push.

Then run the deploy on the VPS in a single SSH command:

```bash
ssh root@91.98.23.209 "cd /var/www/email-os && git checkout package-lock.json && git pull && npm install && npm run build && npm run migrate && pm2 restart email-os --update-env && pm2 status"
```

After the command completes, report the PM2 status shown at the end of the output. If the app shows `online`, the deploy succeeded. If it shows `errored`, run `pm2 logs email-os --lines 20` via SSH to diagnose.
