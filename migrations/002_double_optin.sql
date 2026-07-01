-- Add pending status and confirm event type for double opt-in flow.
-- Existing active contacts are unaffected; confirmation_token is generated
-- for all rows but only checked for pending ones.

ALTER TYPE contact_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'active';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'confirm';

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT UNIQUE
    DEFAULT encode(gen_random_bytes(16), 'hex');
