# POWER DESK — Build Log & Technical Diary

## 0. Context & Project Overview
- **Event:** Builder.io Agent-Native Hackathon (November 2026)
- **Goal:** First Place
- **Product:** **Power Desk** — A fuel and generator ledger for Nigerian small businesses operated by texting an agent on Telegram, which spots unexplained fuel variance and calculates when solar pays back.
- **Author:** Muhammed (Lagos, Nigeria) — Mechanical engineer and web developer.
- **Scaffold Command:** `npx --yes @agent-native/core@latest create power-desk --standalone --template chat`
- **Stack:**
  - Framework: `@agent-native/core` (v0.226.0) + React Router v7 framework mode + Nitro
  - Database: Drizzle ORM (`drizzle-orm` v0.45.4) with `@electric-sql/pglite` (local embedded) and PostgreSQL (`DATABASE_URL` in production)
  - Runtime: Node.js v24.2.0, pnpm v10.34.9
  - UI: Tailwind CSS v4, Radix UI primitives, Tabler Icons, Recharts

---

## 1. Spike Outcomes & Architecture Decisions

### Spike 1: Telegram Messaging Integration
- **Framework Primitive:** `createIntegrationsPlugin` from `@agent-native/core/server` using `telegramAdapter`.
- **Inbound Webhook Endpoint:** `/_agent-native/integrations/telegram/webhook`
- **Environment Variables:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
- **Outcome:** The framework automatically validates the Telegram webhook secret header `x-telegram-bot-api-secret-token` and queues incoming tasks via `integration_pending_tasks` with deduplication and retry sweep. Allows users to text natural-language entries like `"bought 40L at 1250, gen ran 6h"`.

### Spike 2: Telegram Photo / Receipt Attachments
- **Code Inspection:** Direct analysis of `node_modules/@agent-native/core/dist/integrations/adapters/telegram.js` revealed `parseIncomingMessage` checks `const text = message.text?.trim(); if (!text) return null;`. Telegram sends photos under `message.photo` with `message.caption`, which the adapter drops.
- **Sanctioned Fallback:** Per Section 4 & 6.8 of specification:
  - Text-based Telegram logging is primary.
  - Web receipt photo upload is implemented via `upload-receipt` action + UI dropzone.
  - If a receipt image is uploaded via the web UI, image metadata and preview are stored and linked to `fuel_entries.receiptUploadId`.
  - Documented as the sanctioned fallback.

### Spike 3: Automations & Recurring Jobs
- **Framework Primitive:** `jobs/<name>.md` with YAML frontmatter parsed by the Agent-Native scheduler.
- **Weekly Summary Job:** Defined in `jobs/weekly-summary.md` configured for Sunday 18:00 WAT (`schedule: "0 17 * * 0"` UTC).
- **Manual Trigger:** Settings screen includes a "Send weekly summary now" button invoking `weekly-summary` action with `sendTelegram: true` and dispatching proactive Telegram messages.

### Spike 4: Generative UI Inline Extension
- **Framework Primitive:** `render-break-even-extension` returning sandboxed iframe running Alpine.js + Tailwind CSS.
- **Interaction Model:**
  - Two-way reactive sliders for daily run hours, petrol pump price, generator L/h, servicing cost, solar capital cost, battery cost/life.
  - Live crossover timeline chart displaying generator cumulative spend vs solar capital + battery maintenance.
  - Action bridge: `appAction('save-solar-quote', ...)` and `agentNative.chat.send(...)`.
  - Native Fallback: Full native React `/break-even` route sharing the identical deterministic calculation engine.

### Spike 5: Real-time Live Sync
- **Framework Primitive:** `useDbSync({ queryClient, ignoreSource: TAB_ID })` listening to Server-Sent Events (SSE).
- **Outcome:** Any mutation from Telegram or actions bumps database sync version; open ledger and dashboard screens automatically invalidate queries and refetch without manual page refresh.

---

## 2. Data Honesty & Non-Negotiables
- **Sample Data Flag:** Pre-loaded business (*"Sample: Adewale Provisions Store, Lagos"*), its generators, fuel purchases, and run hours have `is_sample: true` and a persistent 🧪 **Sample Data** badge in the UI.
- **Zero Fabricated Claims:** Zero fake customer reviews, zero simulated user counts, and zero fabricated deployments.
- **Real User Logs:** All real entries submitted via Telegram or the Web interface are stored with `is_sample = false` and `source = 'telegram' | 'web'`. Sample data can be toggled on/off or reseeded in Settings at any time without touching real user logs.
- **Neutral Variance Terminology:** Discrepancies are always designated as **"unexplained variance"**. The copy never accuses staff or uses words like "theft" or "fraud". It highlights legitimate physical explanations first (stored jerrycans, high thermal load, tank carry-over).
- **Sourced Anchors:**
  - NBS April 2026 petrol price: ₦1,532.93/L; Lagos May 2026: ₦1,200 - ₦1,350/L.
  - GE 3500 KBM 3.2 kVA generator: 1.2 L/h at 75% load, 4L tank.
  - SEforALL / Lagos State MSME generator fuel spend: ₦5.3 trillion/yr (~6.6B litres).

---

## 3. Implementation History & Verification Log

### Milestone 1: Environment & Scaffolding
- Scaffolded project with `@agent-native/core@latest` standalone chat template.
- Upgraded runtime to Node `v24.2.0` (surpassing `>=22.22` requirement) and `pnpm@10.34.9`.
- Added `@electric-sql/pglite`, `drizzle-orm`, `@agent-native/toolkit`, `@agent-native/agentkit`, `react-router@8.1.0`.

### Milestone 2: Schema & Migrations
- Created `server/db/schema.ts` defining all tables: `businesses`, `generators`, `fuel_entries`, `run_entries`, `variance_flags`, `settings`, `solar_quotes`, `receipt_uploads`.
- Created raw DDL bootstrap in `server/db/init.ts` with `ensureTables()` ensuring zero-config initial boot.
- Created `server/plugins/01-db.ts` registering startup migrations.

### Milestone 3: Seed Script (`pnpm db:seed`)
- Created `scripts/seed.ts` (idempotent, wipes only `is_sample: true` rows).
- Seeded Adewale Provisions Store with Gen A (3.2 kVA) and Gen B (2.5 kVA), 10 fuel purchases, 35 run entries over 30 days, 1 open unexplained variance flag (+22.5%, ~₦12,696 impact), and 1 explained flag (+20.8% reserve jerrycan).
- Verified `pnpm db:seed` runs cleanly with exit code 0.

### Milestone 4: Pure Calculations & Vitest Test Suites
- Created `server/lib/calculations.ts` implementing `calculateBreakEven`, `calculateVariance`, `getWeekStartMonday`, `getLagosToday`, `formatNaira`.
- Created `test/calculations.test.ts` (9 tests covering 15% tolerance boundary, zero run-hours, multi-band hours, payback crossover, zero fuel edge case).
- Created `test/actions.test.ts` (8 tests covering Zod validations: negative litres/hours rejected, max 200L limit, jerrycan 20L allowed for 4L tank, plus 20 natural-language message mapping fixtures).
- Executed `pnpm test`: 17 of 17 tests passed in 1.31s.

### Milestone 5: 16 Orthogonal Actions in `actions/`
1. `log-fuel.ts`
2. `log-run.ts`
3. `get-ledger.ts`
4. `check-variance.ts`
5. `resolve-variance.ts`
6. `break-even.ts`
7. `save-solar-quote.ts`
8. `list-solar-quotes.ts`
9. `upload-receipt.ts`
10. `weekly-summary.ts`
11. `get-settings.ts`
12. `set-settings.ts`
13. `list-generators.ts`
14. `create-generator.ts`
15. `update-generator.ts`
16. `export-ledger.ts`
17. `reset-sample-data.ts`
18. `undo-last-entry.ts`
19. `render-break-even-extension.ts`

### Milestone 6: Agent Personality & Specialized Skills
- Created root `AGENTS.md` specifying persona (experienced Lagos operations accountant, NGN currency, metric units, actions first, four-area parity, neutral variance etiquette).
- Created 4 specialized skills:
  - `.agents/skills/log-entries/SKILL.md`
  - `.agents/skills/variance-review/SKILL.md`
  - `.agents/skills/break-even/SKILL.md`
  - `.agents/skills/weekly-summary/SKILL.md`

### Milestone 7: 7 Domain UI Screens
- Screen 1: **Desk & Chat (`app/routes/_index.tsx`)**: 7-day overview KPIs, open variance callout, quick fuel & hours modal forms, embedded agent chat with suggestions.
- Screen 2: **Ledger (`app/routes/ledger.tsx`)**: Merged fuel and run records, filters (7d/30d/all), summary stats, fuel purchase modal with receipt dropzone, run hours modal, CSV export, undo last entry.
- Screen 3: **Variance Review (`app/routes/variance.tsx`)**: Weekly consumption audits vs tolerance, benign causes education panel, explanation update modal calling `resolve-variance`.
- Screen 4: **Break-Even Simulator (`app/routes/break-even.tsx`)**: Interactive sliders for hours, fuel price, solar system cost, battery cycles; 5-year cumulative crossover table; saved solar quotes gallery.
- Screen 5: **Generators Fleet (`app/routes/generators.tsx`)**: Generator inventory cards, consumption rates across light/typical/heavy load bands, add & edit modals.
- Screen 6: **Settings (`app/routes/settings.tsx`)**: Tolerance ±% slider, sample data toggle & reset dialog, Telegram bot config & test summary trigger, weekly cron schedule.
- Screen 7: **About & Honesty (`app/routes/about.tsx`)**: Non-negotiable honesty policy, NBS April 2026 petrol price citation, GE 3500 KBM spec citation, SEforALL Lagos MSME study citation, Agent-Native architecture breakdown.

### Milestone 8: Quality Gates & Verification
1. **TypeScript Typecheck:**
   - Ran `pnpm typecheck`: Completed with **0 errors**.
2. **Vitest Test Suite:**
   - Ran `pnpm test`: **17 tests passed** (100% success).
3. **Agent-Native Doctor:**
   - Ran `pnpm agent-native doctor`: **Clean — no findings**. (All 15 guards verified).
4. **Production Build:**
   - Ran `pnpm build`: Completed successfully. Nitro server bundle (`.output/server/index.mjs`) and client assets generated.
5. **CLI Action Execution:**
   - Verified `pnpm action list-generators`, `pnpm action check-variance`, `pnpm action break-even` execute with expected structured JSON output.

### Milestone 9: Post-Scaffold Deep Audit & Fixes
1. **Resolved Database Table Collision on `settings`:**
   - Problem: `@agent-native/core` internal settings store uses `public.settings (key TEXT PRIMARY KEY, value TEXT, updated_at BIGINT)`. The application's domain table was also named `"settings"`, which triggered `column "value" does not exist` and HTTP 500 errors across all HTTP action calls.
   - Solution: Renamed the application table to `"app_settings"` in `server/db/schema.ts`, `server/db/init.ts`, `server/plugins/01-db.ts`, and `agent-native.json`. Preserved the TypeScript export `export const settings = table("app_settings", ...)`, maintaining 100% backwards-compatibility across all action queries and mutations.

2. **Fixed HTTP Method Mismatch on Query Actions:**
   - Problem: UI hooks (`useActionQuery("check-variance")` and `useActionQuery("break-even")`) issue HTTP `GET` requests, but the actions were configured with `http: { method: "POST" }`, resulting in HTTP 405 Method Not Allowed.
   - Solution: Configured `http: { method: "GET" }` in `actions/check-variance.ts` and `actions/break-even.ts`.

3. **Data Safety Enforcement in `undo-last-entry`:**
   - Problem: `actions/undo-last-entry.ts` fell back to deleting sample seed entries if no real user entries were present.
   - Solution: Guarded the action to strictly target user entries (`is_sample: false`). When no user entries exist, it cleanly returns `{ success: false, message: "No user-logged entries found to undo. Sample demonstration entries cannot be undone." }`.

4. **Mathematically Calibrated Benchmark Seed Data:**
   - Problem: Seed run hours had an expression `((dayOffset * 7) % 3.5)` that always evaluated to 0 (since 7 is a multiple of 3.5), keeping Week 3 (Oct 26-Nov 1) variance at +8.2% (< 15% tolerance). Calling `check-variance` would dynamically re-evaluate Week 3 and auto-dismiss the open flag. Gen B also ran without seeded fuel entries, triggering an unintended -100% variance flag.
   - Solution: Calibrated realistic daily run hours and fuel purchases. Gen A Week 1 has +20.8% variance (`status: "explained"`), Week 2 has 0.0% variance, Week 3 has +29.9% variance with ₦19,044 impact (`status: "open"`, preserved), and Week 4 has +0.4% variance. Gen B runs are paired with corresponding 3L refuels, keeping Gen B within normal ±11.1% tolerance. Updated seed script to only delete sample flags (`flag-sample-%`).

5. **End-to-End Verification:**
   - All HTTP action endpoints tested over HTTP returning HTTP 200 OK.
   - 17/17 Vitest tests passing.
   - `pnpm typecheck` with 0 errors.
   - `pnpm agent-native doctor`: Clean — no findings.
   - `pnpm build`: Nitro production build generated cleanly.

---

## 4. Current State
The project is complete, fully audited, mathematically verified, and ready for deployment and submission.
