import { table, text, real, boolean, integer } from "@agent-native/core/db/schema";

export const businesses = table("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const generators = table("generators", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  name: text("name").notNull(),
  fuelType: text("fuel_type").notNull().default("petrol"),
  kva: real("kva").notNull(),
  litresPerHourLight: real("litres_per_hour_light").notNull(),
  litresPerHourTypical: real("litres_per_hour_typical").notNull(),
  litresPerHourHeavy: real("litres_per_hour_heavy").notNull(),
  tankLitres: real("tank_litres").notNull(),
  servicingCostPerHour: real("servicing_cost_per_hour").notNull(),
  installDate: text("install_date"),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const fuelEntries = table("fuel_entries", {
  id: text("id").primaryKey(),
  generatorId: text("generator_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  litres: real("litres").notNull(),
  pricePerLitre: real("price_per_litre").notNull(),
  totalCost: real("total_cost").notNull(),
  supplier: text("supplier"),
  source: text("source").notNull().default("web"), // 'telegram' | 'web' | 'seed'
  receiptUploadId: text("receipt_upload_id"),
  note: text("note"),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const runEntries = table("run_entries", {
  id: text("id").primaryKey(),
  generatorId: text("generator_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  hours: real("hours").notNull(),
  loadBand: text("load_band").notNull().default("typical"), // 'light' | 'typical' | 'heavy'
  source: text("source").notNull().default("web"), // 'telegram' | 'web' | 'seed'
  note: text("note"),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const varianceFlags = table("variance_flags", {
  id: text("id").primaryKey(),
  generatorId: text("generator_id").notNull(),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD (Monday)
  litresBought: real("litres_bought").notNull(),
  litresExpected: real("litres_expected").notNull(),
  varianceLitres: real("variance_litres").notNull(),
  variancePct: real("variance_pct").notNull(),
  estimatedNairaImpact: real("estimated_naira_impact").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'explained' | 'dismissed'
  explanation: text("explanation"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const settings = table("app_settings", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  tolerancePct: real("tolerance_pct").notNull().default(15),
  currency: text("currency").notNull().default("NGN"),
  showSampleData: boolean("show_sample_data").notNull().default(true),
  weeklySummaryDay: text("weekly_summary_day").notNull().default("Sunday"),
  weeklySummaryTime: text("weekly_summary_time").notNull().default("18:00"),
  telegramChatId: text("telegram_chat_id"),
  allowedChatIds: text("allowed_chat_ids"), // JSON array or comma separated
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const solarQuotes = table("solar_quotes", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  label: text("label").notNull(),
  systemCostNaira: real("system_cost_naira").notNull(),
  expectedYearsLife: real("expected_years_life").notNull().default(10),
  batteryReplacementCostNaira: real("battery_replacement_cost_naira").notNull().default(0),
  batteryYearsLife: real("battery_years_life").notNull().default(4),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const receiptUploads = table("receipt_uploads", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  extractedData: text("extracted_data"),
  createdAt: text("created_at").notNull(),
});
