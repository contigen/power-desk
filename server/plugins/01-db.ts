import { runMigrations } from "@agent-native/core/db";

export default runMigrations(
  [
    {
      version: 1,
      name: "power_desk_schema_init",
      sql: `
        CREATE TABLE IF NOT EXISTS businesses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          location TEXT NOT NULL,
          is_sample BOOLEAN NOT NULL DEFAULT false,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS generators (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          name TEXT NOT NULL,
          fuel_type TEXT NOT NULL DEFAULT 'petrol',
          kva REAL NOT NULL,
          litres_per_hour_light REAL NOT NULL,
          litres_per_hour_typical REAL NOT NULL,
          litres_per_hour_heavy REAL NOT NULL,
          tank_litres REAL NOT NULL,
          servicing_cost_per_hour REAL NOT NULL,
          install_date TEXT,
          is_sample BOOLEAN NOT NULL DEFAULT false,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS fuel_entries (
          id TEXT PRIMARY KEY,
          generator_id TEXT NOT NULL,
          date TEXT NOT NULL,
          litres REAL NOT NULL,
          price_per_litre REAL NOT NULL,
          total_cost REAL NOT NULL,
          supplier TEXT,
          source TEXT NOT NULL DEFAULT 'web',
          receipt_upload_id TEXT,
          note TEXT,
          is_sample BOOLEAN NOT NULL DEFAULT false,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS run_entries (
          id TEXT PRIMARY KEY,
          generator_id TEXT NOT NULL,
          date TEXT NOT NULL,
          hours REAL NOT NULL,
          load_band TEXT NOT NULL DEFAULT 'typical',
          source TEXT NOT NULL DEFAULT 'web',
          note TEXT,
          is_sample BOOLEAN NOT NULL DEFAULT false,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS variance_flags (
          id TEXT PRIMARY KEY,
          generator_id TEXT NOT NULL,
          week_start TEXT NOT NULL,
          litres_bought REAL NOT NULL,
          litres_expected REAL NOT NULL,
          variance_litres REAL NOT NULL,
          variance_pct REAL NOT NULL,
          estimated_naira_impact REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          explanation TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          tolerance_pct REAL NOT NULL DEFAULT 15,
          currency TEXT NOT NULL DEFAULT 'NGN',
          show_sample_data BOOLEAN NOT NULL DEFAULT true,
          weekly_summary_day TEXT NOT NULL DEFAULT 'Sunday',
          weekly_summary_time TEXT NOT NULL DEFAULT '18:00',
          telegram_chat_id TEXT,
          allowed_chat_ids TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS solar_quotes (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          label TEXT NOT NULL,
          system_cost_naira REAL NOT NULL,
          expected_years_life REAL NOT NULL DEFAULT 10,
          battery_replacement_cost_naira REAL NOT NULL DEFAULT 0,
          battery_years_life REAL NOT NULL DEFAULT 4,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS receipt_uploads (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          file_url TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          extracted_data TEXT,
          created_at TEXT NOT NULL
        );
      `,
    },
  ],
  { table: "power_desk_migrations" },
);
