-- Run this once in Neon's dashboard → SQL Editor, after the integration is installed.
-- This is separate from Firebase — nothing here touches your existing data.
-- It's specifically for the relational reporting use case (clients + their
-- projects + payment history in one query), which is what Firebase RTDB
-- is genuinely bad at.

CREATE TABLE clients (
  id            SERIAL PRIMARY KEY,
  firebase_uid  TEXT UNIQUE,        -- links back to the client's Firebase account, if they have one
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  city          TEXT,               -- Lagos / Abuja / Other
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id              SERIAL PRIMARY KEY,
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',  -- active / completed / cancelled
  project_type    TEXT,             -- Full Home / Single Room / etc — matches Start a Project form
  budget_estimate NUMERIC(14,2),
  start_date      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount        NUMERIC(14,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'NGN',
  method        TEXT,               -- transfer / card / cash
  paid_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up the exact query the report endpoint below runs
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_payments_project_id ON payments(project_id);
