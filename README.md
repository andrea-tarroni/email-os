# Email OS

Self-hosted, lightweight email marketing system replacing GetResponse: contacts, newsletter campaigns, automated welcome sequences, unsubscribe handling, and bounce/complaint suppression — sent via Amazon SES.

See `misc/Email_OS_Project_Brief.pdf` and `misc/Email_OS_Notes_2026-06-18.md` for the original brief and scoping notes.

## Stack

Node.js + TypeScript, Express, PostgreSQL (raw SQL via `pg`), server-rendered views (EJS). One deployable process, runs under systemd/pm2 on the same Hetzner VPS as andreatarroni.com.

## Setup

```bash
npm install
cp .env.example .env   # fill in real DB / SES / API key values
npm run build
npm run migrate         # applies migrations/*.sql
npm run dev              # local development
```

## Sending domain

Email OS sends from a **dedicated subdomain** (`mail.andreatarroni.com`), not the root domain, so its SPF/DKIM/DMARC and sending reputation are isolated from Andrea's regular email deliverability. Contacts arrive as genuine opt-ins (no bulk list import) via the public signup endpoint below, so no multi-week warm-up ramp is needed — volume stays low and organic.

## Infrastructure prerequisites (must exist before real sending volume)

1. **SES identity verification** for `mail.andreatarroni.com`, with SPF, DKIM, and DMARC records published on that subdomain.
2. **SES → SNS → webhook for bounce/complaint handling.** This is not optional and not just an app-code concern: SES must be configured to publish bounce and complaint notifications to an SNS topic, and that topic must be subscribed to a **public HTTPS endpoint** on this VPS (e.g. `https://mail.andreatarroni.com/webhooks/ses-notifications`). Without this, bounces/complaints are never recorded, contacts are never suppressed, and the SES account is at risk of suspension. Needs a reverse proxy (nginx/Caddy) + subdomain + TLS cert set up alongside the app deploy. Not yet implemented — Phase 2.
3. **SES production access request** — sandbox mode is fine for development, but real sends to contacts need production access approved by AWS.

## Routes

### `POST /signup`

Public endpoint for the landing page opt-in form (replaces GetResponse's `<getresponse-form>` embed in `index.html`'s `#intro` section). Body: `{ email, name? }`. Creates/reactivates an active contact with `consent_source = "andreatarroni_signup_form"`.

### `GET /contacts`, `GET /contacts/new`, `POST /contacts`, `POST /contacts/:id/status`, `POST /contacts/:id/delete`

Minimal server-rendered contacts CRUD UI.

### `GET /campaigns`, `GET /campaigns/:id`, `POST /campaigns/:id/send`

List/view campaigns and trigger a manual send to all `active` contacts. Sends are paced with a small delay between each (no queue infra needed at this volume).

### `POST /api/campaigns/draft`

Integration point for pushing HTML-generated newsletters in as drafts (replaces the old GetResponse draft-via-API workflow).

Headers: `x-api-key: <DRAFT_API_KEY>`

Body:
```json
{ "subject": "...", "html": "<html>...</html>", "text": "optional plain-text version" }
```

Response: `{ "id": 123, "status": "draft" }`

### `GET /unsubscribe/:token`, `POST /unsubscribe/:token`

One-click unsubscribe target, linked from both the `List-Unsubscribe` header and the footer of every sent email. `POST` supports Gmail/Yahoo's one-click unsubscribe (RFC 8058).

## Build order

1. Contacts + manual single-send newsletter
2. Bounce/complaint suppression (SES → SNS → webhook)
3. Unsubscribe system (one-click + List-Unsubscribe headers)
4. Email sequences (Day 0/2/5/10 automation)
5. Click tracking
6. Open tracking (pixel) — low priority, unreliable due to Apple Mail Privacy Protection
