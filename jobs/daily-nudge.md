---
schedule: "0 19 * * *"
enabled: true
runAs: creator
---

# Daily Evening Run-Hours Nudge

Every evening at 20:00 WAT (19:00 UTC):
1. Check if generator run-hours have been logged for today using `get-ledger` (range: '7d').
2. If today's run hours are missing, send a gentle Telegram prompt:
   "Good evening! Did the generator run today? Reply with hours operated (e.g. 'gen ran 5 hours') or 'no gen used today'."
