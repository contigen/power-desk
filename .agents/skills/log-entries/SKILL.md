---
name: log-entries
description: Parsing natural-language fuel and run entries from Telegram or chat, validating parameters, and returning concise confirmations with running weekly totals.
---

# Log Entries Skill

## Trigger
Use this skill whenever the user texts or types fuel purchases, generator run hours, or combined logs (e.g., "bought 40L at 1250, gen ran 6h", "fill 25L for 1300", "gen ran 8 hours").

## Execution Steps
1. **Extract Quantities:**
   - Litres: Look for numbers preceding or following "L", "litre", "litres", "liters", "jerry can", "keg".
   - Price: Look for numbers following "at", "@", "for", "N", "naira".
   - Hours: Look for numbers preceding "h", "hr", "hrs", "hours", or time intervals (e.g. "from 10am to 4pm").
   - Generator: Match "A", "Gen A", "B", "Gen B", or power rating. Default to primary generator if not mentioned.
   - Load Band: If "chiller", "freezer", "heavy", "cold room" mentioned -> `heavy`. If "light", "fans only" -> `light`. Else default `typical`.

2. **Handle Compound Messages:**
   - If the message has both fuel and run hours (e.g. "bought 40L at 1250, gen ran 6h"), call `log-fuel` FIRST, then call `log-run`.
   - Combine the results into a crisp single reply.

3. **Validation & Boundaries:**
   - Litres must be > 0 and <= 200. (Litres exceeding the tank size are completely valid because owners buy in jerrycans).
   - Hours must be > 0 and <= 24.
   - If litres or price is missing, ask ONE short question: "What was the pump price per litre?" or "How many litres did you buy?"

4. **Confirmation Response:**
   - Keep to 1-2 lines. Example:
     `Logged 40L @ N1,250/L for Gen A (N50,000). Week total: 60L (N75,000). Logged 6h runtime.`
