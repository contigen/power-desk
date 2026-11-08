---
name: weekly-summary
description: How to generate and deliver the weekly generator and fuel briefing, compare week-on-week trends, format structured metrics, and deliver via Telegram.
---

# Weekly Summary Skill

## Trigger
Use this skill when:
- The scheduled automation fires (Sunday 18:00 WAT).
- The user requests: "send weekly summary", "how much did we spend this week?", or triggers "Send summary now" from Settings.

## Protocol
1. Call `weekly-summary` action for the target week.
2. Structure the message concisely with clean Markdown:
   - Week range (Monday to Sunday)
   - Total fuel bought (L)
   - Total fuel spend (Naira) and percentage trend vs previous week
   - Average pump price per litre
   - Total generator run-hours and cost per run-hour
   - Variance flags status (either clean confirmation or neutral notice of open flags with difference and estimated impact)
3. If requested for Telegram, ensure `sendTelegram: true` is passed to transmit via the Telegram Bot API.
