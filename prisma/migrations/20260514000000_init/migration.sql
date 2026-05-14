-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260514_init
-- Description: Initial schema — users, companies, interns, attendance_logs
--
-- Reversible: YES
-- Down migration: see bottom of this file (commented out)
--
-- Cascade policy:
--   users → interns        : CASCADE  (row-level: auth account drives profile)
--   companies → interns    : RESTRICT (prevents orphaning enrolled interns)
--   interns → attendance_logs: CASCADE (logs are child records of the intern)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "AttendanceStatus" AS ENUM (
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY'
);

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE "users" (
  "id"         TEXT        NOT NULL,
  "auth_id"    TEXT        NOT NULL,   -- Supabase auth.users.id (UUID stored as text)
  "email"      TEXT        NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "companies" (
  "id"               TEXT        NOT NULL,
  "name"             TEXT        NOT NULL,
  "address"          TEXT        NOT NULL,
  "supervisor_name"  TEXT        NOT NULL,
  "supervisor_email" TEXT        NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interns" (
  "id"             TEXT          NOT NULL,
  "intern_id"      TEXT          NOT NULL,   -- School-assigned number, globally unique
  "name"           TEXT          NOT NULL,
  "required_hours" DECIMAL(6, 2) NOT NULL,   -- e.g. 500.00 — Decimal avoids float drift
  "enrolled_at"    DATE          NOT NULL,   -- DATE only, no time component
  "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "user_id"        TEXT          NOT NULL,
  "company_id"     TEXT          NOT NULL,

  CONSTRAINT "interns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_logs" (
  "id"              TEXT               NOT NULL,
  "date"            DATE               NOT NULL,   -- Calendar date, no time zone shift
  "time_in"         TIME(0),                        -- NULL for ABSENT entries
  "time_out"        TIME(0),                        -- NULL for ABSENT entries
  "hours_rendered"  DECIMAL(4, 2)      NOT NULL DEFAULT 0, -- 0.00–99.99; stored, not computed
  "status"          "AttendanceStatus" NOT NULL,
  "notes"           TEXT,                           -- Optional free-form text
  "created_at"      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "intern_id"       TEXT               NOT NULL,

  CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- ── Unique Constraints ────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "users_auth_id_key"       ON "users"("auth_id");
CREATE UNIQUE INDEX "users_email_key"          ON "users"("email");

CREATE UNIQUE INDEX "interns_intern_id_key"   ON "interns"("intern_id");
CREATE UNIQUE INDEX "interns_user_id_key"     ON "interns"("user_id");  -- 1-to-1 with User

-- One attendance log per intern per calendar day
CREATE UNIQUE INDEX "attendance_logs_intern_id_date_key"
  ON "attendance_logs"("intern_id", "date");

-- ── Performance Indexes ───────────────────────────────────────────────────────

-- FK index on users.auth_id for RLS lookups (auth.uid()::text = auth_id)
CREATE INDEX "users_auth_id_idx"              ON "users"("auth_id");

-- FK indexes for join performance
CREATE INDEX "interns_company_id_idx"         ON "interns"("company_id");
CREATE INDEX "attendance_logs_intern_id_idx"  ON "attendance_logs"("intern_id");
CREATE INDEX "attendance_logs_date_idx"        ON "attendance_logs"("date");

-- Dashboard filter: "show all LATE entries this month"
CREATE INDEX "attendance_logs_status_idx"     ON "attendance_logs"("status");

-- ── Foreign Keys ─────────────────────────────────────────────────────────────

-- CASCADE: deleting a user removes their intern profile.
ALTER TABLE "interns"
  ADD CONSTRAINT "interns_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RESTRICT: a company cannot be deleted while interns are enrolled.
-- Intentional guard — admin must reassign/graduate interns first.
ALTER TABLE "interns"
  ADD CONSTRAINT "interns_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CASCADE: deleting an intern removes all their attendance records.
ALTER TABLE "attendance_logs"
  ADD CONSTRAINT "attendance_logs_intern_id_fkey"
  FOREIGN KEY ("intern_id")
  REFERENCES "interns"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- DOWN MIGRATION (reversible — run manually or via `prisma migrate reset`)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- DROP TABLE IF EXISTS "attendance_logs";
-- DROP TABLE IF EXISTS "interns";
-- DROP TABLE IF EXISTS "companies";
-- DROP TABLE IF EXISTS "users";
-- DROP TYPE  IF EXISTS "AttendanceStatus";
--
-- ─────────────────────────────────────────────────────────────────────────────
