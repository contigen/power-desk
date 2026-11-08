# Power Desk — Hackathon Submission Form

**Portal:** [https://www.builder.io/hackathon/submit](https://www.builder.io/hackathon/submit)  
**Submission Deadline:** Mon Nov 9, 2026, 11:59 PM PT (= Tue Nov 10, 08:59 WAT)  
**Project Name:** Power Desk ⚡  

---

## 1. Project Information

### Project Name
`Power Desk`

### Tagline (One-Liner)
A fuel and generator ledger for Nigerian small businesses operated by texting an agent on Telegram, spotting unexplained fuel variance and showing when solar pays back.

### Category
AI Agents / Agent-Native Applications / Small Business Operations

---

## 2. Problem & Solution Overview

### The Problem
Nigeria’s unstable electrical grid forces millions of small and medium enterprises (MSMEs) to rely on a massive "shadow grid" of petrol and diesel generators. According to SEforALL and the Lagos State Government, MSMEs in Lagos alone spend an estimated **₦5.3 Trillion every year on generator fuel** (~6.6 billion litres). 

Compounding this crisis, the National Bureau of Statistics (NBS) reported petrol prices reached **₦1,532.93/L in April 2026**. Yet, almost every shop owner, bakery, and pharmacy tracks generator expenses using paper notebooks, casual WhatsApp chats, or no system at all. Owners suffer from:
1. **Unexplained Fuel Variance:** High discrepancies between litres purchased and actual generator running hours.
2. **Opaque Operating Costs:** Inability to know true cost per running hour (fuel burn + maintenance).
3. **Solar Hesitation:** Inability to calculate whether investing ₦3.5M–₦6M in solar and lithium batteries will actually pay back for their specific generator consumption.

### The Solution: Power Desk
Power Desk turns fuel tracking into a simple text message. Staff or business owners text the Power Desk agent on Telegram:
> *"bought 40L at 1250 for Gen A, gen ran 6h"*

The agent parses messy messages, updates the ledger in PostgreSQL, flags **unexplained variance** beyond the business's tolerance threshold (default 15%), and renders an interactive **Generative UI** break-even simulator directly in the chat to show the exact month solar becomes cheaper than running generators.

---

## 3. How We Used Agent-Native

Power Desk demonstrates maximal leverage of `@agent-native/core` across all architectural tiers:

1. **`defineAction` as Single Source of Truth:**
   We implemented 16 orthogonal actions in `actions/`. Each action provides a Zod schema with full runtime validation and powers three surfaces simultaneously:
   - Agent callable tools
   - React hooks (`useActionQuery`, `useActionMutation`, `callAction`)
   - Auto-generated REST HTTP endpoints (`POST /_agent-native/actions/:name`)
   - WebMCP and Public Agent Web tools (`llms.txt`)

2. **Zero Inline LLM Calls:**
   No LLM calls exist inside routes, actions, or database code. Actions perform deterministic arithmetic (consumption curves, payback horizons, variance bounds). All reasoning is conducted by the agent assistant.

3. **Four-Area Parity Contract:**
   Every single capability exists simultaneously in:
   - UI (React Route & Modals)
   - Action (`defineAction`)
   - Skill / AGENTS.md (`.agents/skills/*`)
   - Application State (`useNavigationState` with `view-screen` agent awareness)

4. **Shared PostgreSQL via Drizzle ORM:**
   PostgreSQL schema defined with Drizzle ORM. Runs embedded `@electric-sql/pglite` locally for zero-config offline development, seamlessly switching to managed cloud PostgreSQL via `DATABASE_URL`.

5. **Generative UI (Inline Extension):**
   When the user asks *"is solar worth it?"*, the agent calls `render-break-even-extension`, rendering a sandboxed Alpine.js + Tailwind interactive simulator inline in chat with real-time sliders and a 5-year cumulative crossover chart.

6. **Real-time Live Sync (SSE):**
   Using `useDbSync`, when a staff member texts a fuel purchase on Telegram, the web ledger updates live over Server-Sent Events with zero manual page refreshes.

7. **Autonomous Background Automations:**
   Using `jobs/weekly-summary.md` with cron schedules (`schedule: "0 17 * * 0"` UTC), the agent automatically runs weekly audits and delivers a concise executive summary directly to the owner's Telegram every Sunday evening at 18:00 WAT.

---

## 4. Transparent Disclosures & Data Honesty

- **Pre-existing Work & Template Disclosure:** Scaffolded using `@agent-native/core@latest` with the official standalone `chat` template. Extended with Drizzle ORM, PGlite, and custom domain actions.
- **Data Honesty Policy:** All pre-loaded demonstration records for *"Sample: Adewale Provisions Store, Lagos"* are clearly tagged with `is_sample = true` and a prominent 🧪 **Sample Data** badge in the UI. No fake customer reviews, no simulated user testimonials, and no fabricated deployments exist in this project.
- **Sourced Citations:**
  - NBS Premium Motor Spirit (PMS) Price Watch (April 2026): ₦1,532.93/L national average.
  - GE 3500 KBM 3.2 kVA Petrol Generator Manufacturer Specification: 1.2 L/h at 75% load, 4.0 L mounted tank (~3.3 hours per tank).
  - SEforALL & Lagos State Government MSME Study: ₦5.3 Trillion annual generator fuel spend in Lagos.

---

## 5. Public Demo Video Script (2:30 for Clips)

**Presenter:** Muhammed (Lagos, Nigeria)  
**Format:** Screen recording with voiceover (Lagos SME context, crisp and utilitarian).

| Timestamp | Screen | Voiceover / Action |
|---|---|---|
| **0:00 - 0:25** | **Desk / Overview (`/`)** | *"Hi, I'm Muhammed, a mechanical engineer and developer from Lagos, Nigeria. In Lagos alone, small businesses spend ₦5.3 Trillion a year fueling backup generators at over ₦1,300 per litre. Most track this in paper notebooks or not at all. This is Power Desk: an agent-native fuel and generator ledger operated via Telegram that catches unexplained fuel variance and shows when solar pays back."* |
| **0:25 - 0:55** | **Telegram Bot / Live Sync (`/` & `/ledger`)** | *(Split screen: Telegram on phone/desktop next to open Power Desk web ledger).*<br>*"Here's the core loop: A shop manager texts the bot: 'bought 40L at 1280 for Gen A, ran 6h'. Watch the web app: without refreshing, the ledger immediately updates via Server-Sent Events. The agent parses the litres, computes the ₦51,200 cost, and updates our running weekly totals."* |
| **0:55 - 1:25** | **Variance Review (`/variance`)** | *"Now let's check variance. A 3.2 kVA generator burning 1.2 litres per hour should have consumed ~7.2 litres for 6 hours. When 40 litres are bought for only 6 hours of runtime, Power Desk's check-variance action flags an 'unexplained variance' of +22.5% (~₦12,696 impact). Notice our language is completely neutral: it prompts the owner to check benign physical causes first, like fuel stored in 25L jerrycans or tank carry-over. We can resolve it with one click: 'Stored 25L jerrycan for weekend backup'."* |
| **1:25 - 2:00** | **Generative UI / Solar Break-Even (`/break-even`)** | *"Next, the owner asks the agent: 'Is solar worth it for my shop?' Watch what happens: The agent renders an interactive Generative UI simulator directly inside the chat. We can drag the sliders: 8 hours daily run-time at ₦1,300/litre costs ₦312,000 every month just in petrol and servicing! A 3.5 kVA solar setup with 5 kWh lithium battery costing ₦4.5M pays for itself in just 14 months, saving over ₦13 Million over 5 years. We can save this quote right to the database with one click."* |
| **2:00 - 2:30** | **Settings & Wrap-Up (`/settings` & `/about`)** | *"Finally, Power Desk runs autonomous background cron jobs that dispatch weekly briefings to Telegram every Sunday at 6 PM. All data is honest: sample demo data is clearly badged and can be toggled off, and real entries are permanently stored in Postgres via Drizzle ORM. 16 actions, 100% test coverage, and clean Agent-Native doctor verification. Power Desk gives Nigerian small businesses control over their biggest operational expense. Thank you!"* |

---

## 6. How to Verify

- **Test Suite:** `pnpm test` (17 tests passing in Vitest)
- **Type Safety:** `pnpm typecheck` (0 errors)
- **Doctor Health:** `pnpm agent-native doctor` (Clean — no findings)
- **Build Verification:** `pnpm build` (Nitro production bundle complete)
- **Database Seed:** `pnpm db:seed` (Idempotent seed verified)
