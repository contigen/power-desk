# Power Desk

> **A fuel and generator ledger for Nigerian small businesses operated by texting an agent on Telegram, spotting unexplained fuel variance and calculating when solar pays back.**

## 1. Why Power Desk Matters

In Nigeria, millions of micro, small, and medium enterprises (MSMEs) run on an informal "shadow grid" of petrol and diesel generators to cope with frequent grid outages and load shedding.

Until now, shop owners and managers tracked fuel purchases and operating hours in paper notebooks, mental math, or not at all. Power Desk replaces manual logs with an AI agent you text on Telegram or the web, grounded in real mechanical engineering principles and certified market data.

### Sourced Anchors & Real-World Reality

- **Macroeconomic Spend:** Sustainable Energy for All (SEforALL) in partnership with the Lagos State Government reports that Lagos MSMEs spend approximately **₦5.3 Trillion annually** on generator fuel (~6.6 billion litres).  
  _Source:_ [Nairametrics / Lagos State & SEforALL Report](https://nairametrics.com/2024/10/11/small-business-owners-in-lagos-spend-n5-3-trillion-annually-on-fueling-generators-report)
- **Volatile Fuel Prices:** The National Bureau of Statistics (NBS) Premium Motor Spirit (PMS/Petrol) Price Watch reported national average petrol at **₦1,532.93/L in April 2026** (up 18.97% month-on-month). Retail surveys in Lagos retailed between **₦1,200 and ₦1,350/L in May 2026**.  
  _Source:_ [NBS PMS Report via Nairametrics](https://nairametrics.com/2026/05/29/petrol-price-jumps-19-to-n1533-litre-in-april-nbs/)
- **Certified Engineering Consumption Baseline:** Certified bench test specifications for a standard 3.2 kVA petrol generator (GE 3500 KBM class) record **1.2 L/h at 75% of prime rating**, with a **4.0 L mounted tank (~3.3 hours run-time per full tank)**. Shop owners typically buy fuel in 10L, 25L, or 50L plastic jerrycans to store on-site.  
  _Source:_ [Wilkinson Star GE 3500 KBM Specification Sheet](https://www.sitebox.ltd.uk/docs/wilkinsonstar/pdf/35.CJ6G5010.pdf)

---

## 2. The Core User Loop

```
           [Shop Owner / Staff]
                     │
         Text Telegram or Web Chat:
      "bought 40L at 1250 for Gen A, ran 6h"
                     │
                     ▼
             [Power Desk Agent]
                     │
         Calls deterministic actions:
          1. log-fuel(litres: 40, price: 1250)
          2. log-run(hours: 6, band: 'typical')
                     │
                     ▼
          [PostgreSQL / PGlite DB]
                     │
    ┌────────────────┴────────────────┐
    ▼                                 ▼
[Live UI Updates via SSE]    [check-variance Action]
• Instant ledger entry       • Compares bought vs expected burn
• Updated 7d spend & KPI     • Flags unexplained variance (>15%)
                             • Prompts benign physical checks
```

1. **Texting Natural Log Entries:** Staff text the bot: `"bought 40L at 1250, gen ran 6h"`.
2. **Zero-Friction Parsing & Confirmation:** The agent resolves the generator, records the fuel entry and run session, and replies with a concise two-line confirmation with running week totals.
3. **Live Syncing UI:** The web dashboard updates instantly over Server-Sent Events (SSE) with no page refresh.
4. **Spotting Unexplained Variance:** The system compares litres bought against theoretical litres consumed from engine hours. Discrepancies exceeding the tolerance band (default 15%) trigger a neutral **"unexplained variance"** flag.
5. **Interactive Generative UI:** When the owner asks _"is solar worth it?"_, the agent renders an interactive Alpine.js + Tailwind simulator inline in the chat with sliders for run-hours, fuel prices, and solar/battery quotes.
6. **Autonomous Weekly Summary:** Scheduled background jobs compile weekly rollups and dispatch structured briefings to Telegram every Sunday at 18:00 WAT.

---

## 3. Data Honesty & Sample Data Policy

Power Desk strictly adheres to non-negotiable data integrity:

- **Sample Data Flag:** Pre-loaded demonstration records for _"Sample: Adewale Provisions Store, Lagos"_ are clearly tagged with `is_sample = true` and a persistent **Sample Data** badge in the UI.
- **Zero Fabricated Claims:** Zero fake customer reviews, zero simulated user counts, and zero fabricated deployments.
- **Real User Logs:** All real entries submitted via Telegram or the Web interface are stored with `is_sample = false` and `source = 'telegram' | 'web'`. Sample data can be toggled on/off or reseeded in Settings at any time without touching real user logs.
- **Neutral Variance Terminology:** Discrepancies are always designated as **"unexplained variance"**. The copy never accuses staff or uses words like "theft" or "fraud". It highlights legitimate physical explanations first:
  1. _Jerrycan reserve:_ Fuel was bought in plastic kegs and stored rather than poured into the engine tank.
  2. _High thermal load:_ Heavy afternoon refrigeration/AC loads burn up to 25% more fuel.
  3. _Tank carry-over:_ Fuel from late Sunday is used during Monday operations.

---

## 4. Agent-Native Architecture

Power Desk is built from the ground up using Builder.io's open-source **Agent-Native** framework (`@agent-native/core`):

### 1. `defineAction` as Single Source of Truth

Every app capability is implemented as a deterministic action in `actions/`. One implementation serves:

- Agent Tools (callable by the model during conversation)
- Frontend Hooks (`useActionQuery`, `useActionMutation`, `callAction` via `@agent-native/core/client/hooks`)
- REST HTTP Endpoints (`POST /_agent-native/actions/:name`)
- Model Context Protocol (MCP tools exposed via WebMCP & publicAgent)
- CLI execution (`pnpm action <name>`)

### 2. Zero Inline LLM Calls

No LLM API calls are embedded inside routes, server endpoints, or actions. Actions are 100% deterministic arithmetic and database mutations. The agent reasons, decides which tools to call, and returns plain conversational confirmations.

### 3. Four-Area Parity Contract

Every feature exists simultaneously across all four areas:

1. **UI:** Reactive screens and modal dialogs.
2. **Action:** Zod-validated `defineAction` in `actions/`.
3. **Skill & AGENTS.md:** Instruction guides under `.agents/skills/<name>/SKILL.md`.
4. **Application State:** Real-time route context tracked via `useNavigationState` (`view-screen` tool).

### 4. Shared PostgreSQL via Drizzle ORM

Shared database architecture running embedded `@electric-sql/pglite` locally (in `./data/pglite`) and connecting to managed PostgreSQL (e.g., Neon) via `DATABASE_URL` in cloud environments.

### 5. Generative UI Inline Extension

Action `render-break-even-extension` serves an Alpine.js + Tailwind interactive calculator inside an iframe bridge (`appAction`, `agentNative.chat.send`).

### 6. Background Automations

Defined in `jobs/weekly-summary.md` and `jobs/daily-nudge.md`. Autonomous cron jobs that wake up, execute actions, and dispatch proactive messages to Telegram.

---

## 5. Complete Action Directory

| Action                        | HTTP   | Schema / Parameters                                                                     | Description                                                                                             |
| ----------------------------- | ------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `log-fuel`                    | `POST` | `generator?`, `litres`, `pricePerLitre`, `date?`, `supplier?`, `note?`, `source?`       | Record fuel purchase. Updates running totals and checks for variance flags.                             |
| `log-run`                     | `POST` | `generator?`, `hours`, `loadBand?`, `date?`, `note?`, `source?`                         | Record generator run hours (`light`, `typical`, `heavy`).                                               |
| `get-ledger`                  | `GET`  | `range?`, `startDate?`, `endDate?`, `generatorId?`, `includeSample?`                    | Chronological merged fuel and runtime entries, averages, and cost per run-hour.                         |
| `check-variance`              | `GET`  | `generatorId?`, `weekStart?`                                                            | Compares litres bought vs expected consumption (`hours × L/h`). Flags unexplained variance > tolerance. |
| `resolve-variance`            | `POST` | `flagId`, `status` (`explained`/`dismissed`/`open`), `explanation?`                     | Updates a variance flag with a documented benign explanation or dismisses it.                           |
| `break-even`                  | `GET`  | `dailyRunHours?`, `fuelPricePerLitre?`, `litresPerHour?`, `solarSystemCostNaira?`, etc. | Pure calculation engine for solar & battery payback and 5-year cumulative savings.                      |
| `save-solar-quote`            | `POST` | `label`, `systemCostNaira`, `expectedYearsLife`, `batteryReplacementCostNaira?`, etc.   | Persists a solar & battery replacement scenario.                                                        |
| `list-solar-quotes`           | `GET`  | _(none)_                                                                                | Retrieves saved solar quotes for side-by-side comparison.                                               |
| `upload-receipt`              | `POST` | `filename`, `fileBase64`, `mimeType`, `supplier?`, `date?`                              | Uploads fuel receipt metadata/preview for staff records.                                                |
| `weekly-summary`              | `POST` | `weekStart?`, `sendTelegram?`                                                           | Generates weekly fuel spend rollup and delivers briefing to Telegram.                                   |
| `get-settings`                | `GET`  | _(none)_                                                                                | Retrieves business profile, tolerance threshold (±%), and Telegram Chat ID.                             |
| `set-settings`                | `POST` | `tolerancePct?`, `showSampleData?`, `weeklySummaryDay?`, `telegramChatId?`              | Updates system sensitivity, sample data toggle, and automation schedules.                               |
| `list-generators`             | `GET`  | _(none)_                                                                                | Lists all registered generators with consumption specs and tank sizes.                                  |
| `create-generator`            | `POST` | `name`, `fuelType`, `kva`, `litresPerHourTypical`, `tankLitres?`, etc.                  | Registers a new generator set in the business fleet.                                                    |
| `update-generator`            | `POST` | `id`, `name?`, `kva?`, `litresPerHourTypical?`, `tankLitres?`, etc.                     | Updates generator ratings and consumption bands.                                                        |
| `export-ledger`               | `GET`  | `range?`, `generatorId?`, `includeSample?`                                              | Generates RFC 4180 compliant CSV export for external business accountants.                              |
| `reset-sample-data`           | `POST` | _(none)_                                                                                | Reseeds demonstration entries without touching real user logs.                                          |
| `undo-last-entry`             | `POST` | `confirm?`                                                                              | Deletes the single latest user-logged fuel or run entry.                                                |
| `render-break-even-extension` | `GET`  | `kva?`, `dailyHours?`, `fuelPrice?`                                                     | Renders the interactive Generative UI Alpine.js extension inline in chat.                               |
| `view-screen`                 | `GET`  | _(none)_                                                                                | Inspects the active route, screen title, and visible operational context for the agent.                 |
| `navigate`                    | `POST` | `path` (`/`, `/ledger`, `/variance`, `/break-even`, `/generators`, `/settings`, `/about`) | Navigates the web user interface to a specified route programmatically.                                |

---

## 6. Project Structure

```
power-desk/
├── actions/                     # Agent-Native defineAction implementations
│   ├── break-even.ts
│   ├── check-variance.ts
│   ├── create-generator.ts
│   ├── export-ledger.ts
│   ├── get-ledger.ts
│   ├── get-settings.ts
│   ├── list-generators.ts
│   ├── list-solar-quotes.ts
│   ├── log-fuel.ts
│   ├── log-run.ts
│   ├── navigate.ts
│   ├── render-break-even-extension.ts
│   ├── reset-sample-data.ts
│   ├── resolve-variance.ts
│   ├── save-solar-quote.ts
│   ├── set-settings.ts
│   ├── undo-last-entry.ts
│   ├── update-generator.ts
│   ├── upload-receipt.ts
│   ├── view-screen.ts
│   └── weekly-summary.ts
├── .agents/skills/              # Domain guidance skills for agent assistant
│   ├── actions/SKILL.md
│   ├── adding-a-feature/SKILL.md
│   ├── agent-native-docs/SKILL.md
│   ├── break-even/SKILL.md
│   ├── capture-learnings/SKILL.md
│   ├── create-skill/SKILL.md
│   ├── delegate-to-agent/SKILL.md
│   ├── frontend-design/SKILL.md
│   ├── log-entries/SKILL.md
│   ├── no-ai-slop/SKILL.md
│   ├── real-time-sync/SKILL.md
│   ├── security/SKILL.md
│   ├── self-modifying-code/SKILL.md
│   ├── shadcn-ui/SKILL.md
│   ├── variance-review/SKILL.md
│   └── weekly-summary/SKILL.md
├── app/                         # Frontend React Router application (Terminal Minimal UI)
│   ├── components/layout/       # AppLayout, TopNav, HeaderActions, Sidebar
│   ├── components/modals/       # Quick Log Fuel & Quick Log Hours modal dialogs
│   ├── components/ui/           # shadcn + Radix primitives
│   ├── hooks/                   # useNavigationState, live sync hooks
│   ├── lib/                     # utils, formatNaira, formatNumber, app-config
│   └── routes/                  # 7 Domain screens
│       ├── _index.tsx           # Desk: 7d overview KPIs & chat interface
│       ├── ledger.tsx           # Transactions ledger, filters, CSV export
│       ├── variance.tsx         # Unexplained variance flags & explanation
│       ├── break-even.tsx       # Solar & battery payback simulator
│       ├── generators.tsx       # Fleet management & engineering specs
│       ├── settings.tsx         # Tolerance %, Telegram config, sample data
│       └── about.tsx            # Transparent disclosures & citations
├── data/pglite/                 # Local embedded PostgreSQL database
├── jobs/                        # Automated background cron jobs
│   ├── weekly-summary.md        # Sunday 18:00 WAT rollup
│   └── daily-nudge.md           # 20:00 WAT daily reminder
├── public/                      # Static assets, llms.txt, robots.txt
├── scripts/                     # Seed scripts (pnpm db:seed)
├── server/                      # Server plugins, Telegram adapter, DB schema
│   ├── db/                      # Drizzle ORM schema, table init, getDb()
│   └── lib/                     # Pure calculation engine (calculations.ts)
├── test/                        # Vitest unit & integration test suites
│   ├── actions.test.ts          # Zod validation & NL message mapping fixtures
│   └── calculations.test.ts     # Variance math, payback, load bands
├── agent-native.json            # Agent-Native doctor & security configuration
├── AGENTS.md                    # Agent operational contract & conversational guide
├── BUILD_LOG.md                 # Complete engineering build log & spike outcomes
└── package.json
```

---

## 7. Getting Started

### Prerequisites

- Node.js `>= 22.22.0` (Recommended: Node 24)
- `pnpm` `>= 10.0.0`

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/muhammed/power-desk.git
cd power-desk

# 2. Install dependencies
pnpm install

# 3. Seed initial database (PGlite)
pnpm db:seed

# 4. Start local development server
pnpm dev
```

Visit `http://localhost:3000` to view the application.

### Running Tests & Health Checks

```bash
# Run unit & integration test suites
pnpm test

# Run TypeScript strict typecheck
pnpm typecheck

# Run Agent-Native doctor health check
pnpm agent-native doctor

# Test an action directly from CLI
pnpm action list-generators
pnpm action check-variance
pnpm action break-even
```

### Production Build

```bash
pnpm build
```

---

## 8. Environment Variables

Create a `.env` file in the project root:

```env
# Application Server
PORT=3000
DATABASE_URL=pglite:./data/pglite    # Local; use postgres://... in cloud deploy
AUTH_DISABLED=true                   # Single SME mode

# Telegram Integration (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
TELEGRAM_WEBHOOK_SECRET=your_secret_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

---

## 9. Hackathon Disclosures

- **Template Disclosed:** Scaffolded from `@agent-native/core@latest` with the `chat` template.
- **Third-Party Libraries:** Drizzle ORM, PGlite, Tabler Icons, Radix UI, Recharts, Tailwind CSS v4.
- **Data Disclosure:** All seed data is labeled `is_sample = true` and clearly marked in the UI. No fake users or simulated client testimonials exist in this project.
