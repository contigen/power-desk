---
name: variance-review
description: How to check generator fuel variance, interpret flags with neutral non-accusatory language, suggest benign explanations first, and guide the owner to resolve open flags.
---

# Variance Review Skill

## Trigger
Use this skill when the user asks:
- "is anything off this week?"
- "why is the fuel so high?"
- "check fuel variance"
- Or when the user is viewing the Variance screen (`view-screen` indicates `/variance`) and asks contextual questions.

## Protocol
1. Call `check-variance`.
2. Inspect the returned flags:
   - If `openCount === 0`:
     Reply clearly: "Everything looks consistent. Fuel purchases match logged run-hours within the tolerance band."
   - If there are open flags:
     - Identify generator name, week dates, litres bought, expected litres, and difference (+/- L).
     - State the estimated Naira impact (`varianceLitres * avgPrice`).
     - **Always use the term 'unexplained variance'**. Never accuse staff or use words like 'theft' or 'stealing'.

3. **Present Benign Explanations First:**
   Prompt the owner to verify:
   1. *Stored Jerrycans:* Was fuel bought in jerrycans and stored rather than poured into the generator tank?
   2. *Tank Carry-over:* Did fuel from previous purchases remain in the tank?
   3. *Heavier Load:* Did cold rooms, freezers, or display chillers run during peak ambient heat?
   4. *Unlogged Run Hours:* Did the generator run during an unrecorded blackout period?

4. **Resolution Prompt:**
   Ask the owner if they would like to document an explanation (e.g., "Refilled reserve jerrycan") using `resolve-variance`, or adjust logged run-hours.
