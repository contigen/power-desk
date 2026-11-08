---
schedule: "0 17 * * 0"
enabled: true
runAs: creator
---

# Weekly Generator & Fuel Summary Automation

Every Sunday at 18:00 WAT (17:00 UTC), execute the weekly generator and fuel summary:
1. Call `weekly-summary` with `sendTelegram: true`.
2. Inspect the summary: total litres bought, Naira spend, run-hours, cost per run-hour, and open variance flags.
3. Send the structured briefing to the linked Telegram chat so the business owner receives it before Monday morning operations.
