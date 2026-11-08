---
name: break-even
description: When and how to render the interactive Generative UI break-even extension in chat, retrieve default generator metrics, and guide the user through solar payback calculations.
---

# Solar Break-Even Skill

## Trigger
Use this skill when the user asks:
- "is solar worth it?"
- "when does solar pay back?"
- "how much would I save with solar?"
- "compare generator vs solar"
- Or when the owner notes repeated heavy generator fuel expenses.

## Protocol
1. Call `break-even` action to compute baseline values using the shop's real generator record (typical L/h, servicing cost) and the last 30 days of average fuel prices and run-hours.
2. Render the interactive break-even extension using `render-inline-extension` with Alpine.js and Tailwind CSS.
3. The extension allows the owner to:
   - Drag sliders for daily run hours (e.g. 4h to 14h)
   - Adjust fuel pump price (N1,200 to N1,700/L)
   - Change solar system capital cost (N2,000,000 to N8,000,000)
   - See live payback months and 5-year net savings
   - Click "Save scenario" to call `save-solar-quote` via `appAction`
   - Click "Ask agent about this" to query payback details via `agentNative.chat.send`
4. Provide a 2-sentence summary in prose pointing to the interactive sliders rendered directly in the transcript.
