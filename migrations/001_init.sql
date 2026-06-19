-- Email OS initial schema
-- Entities: Contacts, Tags, ContactTags, Campaigns, Sequences, SequenceSteps, Events

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE contact_status AS ENUM ('active', 'unsubscribed', 'bounced', 'complained');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent');
CREATE TYPE event_type AS ENUM ('sent', 'bounce', 'complaint', 'open', 'click', 'unsubscribe');

CREATE TABLE contacts (
  id              SERIAL PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  source          TEXT,
  status          contact_status NOT NULL DEFAULT 'active',
  unsubscribe_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  consent_source    TEXT,
  consent_ip        TEXT,
  consent_timestamp TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE contact_tags (
  contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE campaigns (
  id          SERIAL PRIMARY KEY,
  subject     TEXT NOT NULL,
  html        TEXT NOT NULL,
  text        TEXT,
  status      campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sequences (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sequence_steps (
  id            SERIAL PRIMARY KEY,
  sequence_id   INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  day_offset    INTEGER NOT NULL, -- e.g. 0, 2, 5, 10
  subject       TEXT NOT NULL,
  html          TEXT NOT NULL,
  text          TEXT,
  step_order    INTEGER NOT NULL,
  UNIQUE (sequence_id, step_order)
);

CREATE TABLE sequence_enrollments (
  id            SERIAL PRIMARY KEY,
  sequence_id   INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  contact_id    INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_step  INTEGER NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  UNIQUE (sequence_id, contact_id)
);

CREATE TABLE events (
  id            SERIAL PRIMARY KEY,
  contact_id    INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  campaign_id   INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  sequence_step_id INTEGER REFERENCES sequence_steps(id) ON DELETE CASCADE,
  type          event_type NOT NULL,
  url           TEXT, -- for click events
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_events_contact_id ON events(contact_id);
CREATE INDEX idx_events_type ON events(type);
