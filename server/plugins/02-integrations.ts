import {
  createIntegrationsPlugin,
  telegramAdapter,
  loadActionsFromStaticRegistry,
  recordChange,
} from "@agent-native/core/server";
import actionsRegistry from "../../.generated/actions-registry.js";
import logFuelAction from "../../actions/log-fuel.js";
import logRunAction from "../../actions/log-run.js";
import checkVarianceAction from "../../actions/check-variance.js";
import breakEvenAction from "../../actions/break-even.js";
import undoLastEntryAction from "../../actions/undo-last-entry.js";
import weeklySummaryAction from "../../actions/weekly-summary.js";

export default createIntegrationsPlugin({
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  adapters: [telegramAdapter()],
  systemPrompt: `You are Power Desk, an automated fuel and generator ledger assistant for Nigerian businesses operated via Telegram.

When the user texts fuel purchases (e.g. "bought 40L at 1250") or run-hours ("gen ran 6 hours"):
1. Call 'log-fuel' and/or 'log-run' to persist the records.
2. Confirm concisely in 1-2 lines with what was logged and the running week total.
3. For questions like "is anything off this week?", call 'check-variance' and report in neutral terms: 'unexplained variance', showing litres and Naira impact, listing plausible benign causes first (stored jerrycans, heavy cooling, tank carryover).
4. For questions like "is solar worth it?", call 'break-even' and provide payback months and 5-year savings.
5. If the user sends "/start", introduce yourself, your capabilities, and how to text fuel and run logs.
6. If the user sends "/week", call 'weekly-summary' and reply with the summary.
7. If the user sends "/variance", call 'check-variance' and reply with the current status.
8. If the user sends "/undo", call 'undo-last-entry' ({ confirm: true }).`,
  beforeProcess: async (incoming) => {
    const text = (incoming.text || "").trim();
    const lower = text.toLowerCase();

    // 1. Welcome & Start command
    if (lower === "/start" || lower === "start" || lower === "hi" || lower === "hello") {
      return {
        handled: true,
        responseText: `Welcome to Power Desk.

Fuel and generator ledger assistant for Nigerian businesses.

You can text naturally:
- "bought 40L at 1250, gen ran 6h"
- "I buy 25 litre for 1320 at Total"
- "gen ran like 6 hours heavy load"
- "is anything off this week?"
- "is solar worth it?"
- "/undo" to revert your last entry
- "/week" to get this week's briefing

All entries update your live ledger.`,
      };
    }

    // 2. Undo command
    if (lower === "/undo" || lower === "undo" || lower.includes("undo last")) {
      const res = await undoLastEntryAction.run({ confirm: true });
      await recordChange({ source: "action", type: "change", key: "undo-last-entry" });
      return {
        handled: true,
        responseText: res.message,
      };
    }

    // 3. Weekly briefing
    if (lower === "/week" || lower.includes("weekly summary") || lower === "summary") {
      const res = await weeklySummaryAction.run({ sendTelegram: false });
      return {
        handled: true,
        responseText: res.formattedText,
      };
    }

    // 4. Variance review
    if (
      lower.includes("variance") ||
      lower.includes("anything off") ||
      lower.includes("off this week") ||
      lower === "/variance"
    ) {
      const res = await checkVarianceAction.run({});
      const openFlags = (res.flags || []).filter((item: any) => item.status === "open");
      if (openFlags.length > 0 && openFlags[0]) {
        const f = openFlags[0] as any;
        return {
          handled: true,
          responseText: `Unexplained variance detected for ${f.generatorName}:
- Week: ${f.weekStart}
- Fuel bought: ${f.litresBought}L
- Expected burn: ${f.litresExpected}L (${f.variancePct > 0 ? "+" : ""}${Number(f.variancePct).toFixed(1)}%)
- Estimated impact: ${f.estimatedNairaFormatted}

Plausible benign explanations to check first:
1. Jerrycan reserve: Fuel bought in jerrycans and stored for later.
2. Tank carry-over: Fuel from prior week remained in tank.
3. Heavy load: Extra refrigeration or machinery running.
4. Missing run hours: Generator operated without being logged.

Document or explain this in the web app at /variance.`,
        };
      }
      return {
        handled: true,
        responseText: `Generator consumption is within normal tolerance band. No open unexplained variance flags.`,
      };
    }

    // 5. Solar break-even analysis
    if (
      lower.includes("solar") ||
      lower.includes("break-even") ||
      lower.includes("payback") ||
      lower.includes("solar worth it")
    ) {
      const res = await breakEvenAction.run({});
      return {
        handled: true,
        responseText: `Solar vs Generator Analysis:
- Current generator monthly spend: ${res.formatted.monthlyGeneratorCost} (fuel + servicing)
- Equivalent solar monthly cost: ${res.formatted.monthlySolarEquivalent}
- Net monthly savings: ${res.formatted.monthlySavings}
- Payback period: ${res.paybackMonths ?? "N/A"} months
- 5-Year cumulative net savings: ${res.formatted.net5YearSavings}

Open your Power Desk web app to use the interactive simulator and save quotes.`,
      };
    }

    // 6. Natural Language Fuel and/or Run Logging
    const fuelMatch = text.match(
      /(?:bought|buy|fill)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:l|litres?|liters?)\s*(?:@|at|for)?\s*(?:n|ngn|₦)?\s*([0-9]+(?:\.[0-9]+)?)/i
    );

    const runMatch = text.match(
      /(?:ran|run|operated)?\s*(?:like|about)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs?|hours?)/i
    );

    if (fuelMatch || runMatch) {
      const confirmations: string[] = [];

      if (fuelMatch) {
        const litres = parseFloat(fuelMatch[1] || "0");
        const price = parseFloat(fuelMatch[2] || "0");
        let supplier: string | undefined = undefined;
        if (/total/i.test(text)) supplier = "TotalEnergies";
        else if (/nnpc/i.test(text)) supplier = "NNPC Retail";
        else if (/mobil/i.test(text)) supplier = "Mobil";

        let gen: string | undefined = undefined;
        if (/gen\s*b/i.test(text) || /firman/i.test(text) || /backup/i.test(text)) gen = "Gen B";
        else if (/gen\s*a/i.test(text) || /maxima/i.test(text)) gen = "Gen A";

        if (litres > 0 && price >= 100) {
          const fuelRes = await logFuelAction.run({
            litres,
            pricePerLitre: price,
            supplier,
            source: "telegram",
            generator: gen,
          });
          await recordChange({ source: "action", type: "change", key: "log-fuel" });
          if (fuelRes.confirmation) {
            confirmations.push(fuelRes.confirmation);
          }
        }
      }

      if (runMatch) {
        const hours = parseFloat(runMatch[1] || "0");
        let loadBand: "light" | "typical" | "heavy" = "typical";
        if (/heavy/i.test(text)) loadBand = "heavy";
        else if (/light/i.test(text)) loadBand = "light";

        let gen: string | undefined = undefined;
        if (/gen\s*b/i.test(text) || /firman/i.test(text) || /backup/i.test(text)) gen = "Gen B";
        else if (/gen\s*a/i.test(text) || /maxima/i.test(text)) gen = "Gen A";

        if (hours > 0 && hours <= 24) {
          const runRes = await logRunAction.run({
            hours,
            loadBand,
            source: "telegram",
            generator: gen,
          });
          await recordChange({ source: "action", type: "change", key: "log-run" });
          if (runRes.confirmation) {
            confirmations.push(runRes.confirmation);
          }
        }
      }

      if (confirmations.length > 0) {
        return {
          handled: true,
          responseText: confirmations.join("\n"),
        };
      }
    }

    return { handled: false };
  },
});
