import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import {
  getDb,
  fuelEntries,
  runEntries,
  generators,
  varianceFlags,
  settings,
} from "../server/db/index.js";
import {
  getWeekStartMonday,
  getLagosToday,
  formatNaira,
} from "../server/lib/calculations.js";
import { eq, and, gte, lte } from "drizzle-orm";

export default defineAction({
  description:
    "Generate structured weekly fuel and generator summary (litres, spend, run-hours, cost/hour, price trend, open variance flags) and optionally deliver it to Telegram.",
  schema: z.object({
    weekStart: z
      .string()
      .optional()
      .describe("Monday of the week to summarize (YYYY-MM-DD). Defaults to current week's Monday."),
    sendTelegram: z
      .boolean()
      .default(false)
      .describe("Whether to proactively post the drafted summary to the linked Telegram chat."),
  }),
  http: { method: "POST" },
  run: async (input) => {
    const db = getDb();
    const today = getLagosToday();
    const monday = input.weekStart ? getWeekStartMonday(input.weekStart) : getWeekStartMonday(today);

    // Compute Sunday of target week
    const sundayDate = new Date(monday);
    sundayDate.setDate(sundayDate.getDate() + 6);
    const sunday = sundayDate.toISOString().split("T")[0] || "";

    // Compute prior week Monday and Sunday
    const priorMondayDate = new Date(monday);
    priorMondayDate.setDate(priorMondayDate.getDate() - 7);
    const priorMonday = priorMondayDate.toISOString().split("T")[0] || "";
    const priorSundayDate = new Date(priorMonday);
    priorSundayDate.setDate(priorSundayDate.getDate() + 6);
    const priorSunday = priorSundayDate.toISOString().split("T")[0] || "";

    // 1. Fetch current week data
    const allFuel = await db.select().from(fuelEntries);
    const allRuns = await db.select().from(runEntries);
    const allFlags = await db.select().from(varianceFlags);
    const allGens = await db.select().from(generators);
    const appSettings = (await db.select().from(settings).limit(1))[0];

    const curWeekFuel = allFuel.filter((f) => f.date >= monday && f.date <= sunday);
    const curWeekRuns = allRuns.filter((r) => r.date >= monday && r.date <= sunday);

    const priorWeekFuel = allFuel.filter((f) => f.date >= priorMonday && f.date <= priorSunday);
    const priorWeekRuns = allRuns.filter((r) => r.date >= priorMonday && r.date <= priorSunday);

    // Current week aggregates
    const totalLitres = Number(curWeekFuel.reduce((sum, f) => sum + f.litres, 0).toFixed(1));
    const totalSpendNaira = Math.round(curWeekFuel.reduce((sum, f) => sum + f.totalCost, 0));
    const totalRunHours = Number(curWeekRuns.reduce((sum, r) => sum + r.hours, 0).toFixed(1));
    const avgPricePerLitre = totalLitres > 0 ? Math.round(totalSpendNaira / totalLitres) : 0;
    const costPerHour = totalRunHours > 0 ? Math.round(totalSpendNaira / totalRunHours) : 0;

    // Prior week aggregates
    const priorSpend = Math.round(priorWeekFuel.reduce((sum, f) => sum + f.totalCost, 0));
    const priorPrice = priorWeekFuel.length > 0
      ? Math.round(priorSpend / Math.max(1, priorWeekFuel.reduce((sum, f) => sum + f.litres, 0)))
      : 0;

    const spendDeltaPct = priorSpend > 0 ? Math.round(((totalSpendNaira - priorSpend) / priorSpend) * 100) : 0;
    const priceDelta = avgPricePerLitre - priorPrice;

    // Open flags for this week
    const openFlags = allFlags.filter((f) => f.weekStart === monday && f.status === "open");

    // Human formatted message
    const lines = [
      `📊 *Power Desk — Weekly Generator & Fuel Summary*`,
      `📅 Week: ${monday} to ${sunday}`,
      ``,
      `• *Total Fuel Bought:* ${totalLitres} L`,
      `• *Total Spend:* ${formatNaira(totalSpendNaira)}${priorSpend > 0 ? ` (${spendDeltaPct >= 0 ? "+" : ""}${spendDeltaPct}% vs prior week)` : ""}`,
      `• *Average Pump Price:* ${formatNaira(avgPricePerLitre)}/L${priorPrice > 0 ? ` (${priceDelta >= 0 ? "+" : ""}${priceDelta} NGN/L)` : ""}`,
      `• *Run Hours:* ${totalRunHours} hrs`,
      `• *Cost per Run-Hour:* ${formatNaira(costPerHour)}/hr`,
    ];

    if (openFlags.length > 0) {
      lines.push(``);
      lines.push(`⚠️ *Notice — Unexplained Variance:*`);
      for (const flag of openFlags) {
        const genName = allGens.find((g) => g.id === flag.generatorId)?.name ?? "Generator";
        lines.push(
          `• ${genName}: ${flag.varianceLitres > 0 ? "+" : ""}${flag.varianceLitres}L (${flag.variancePct > 0 ? "+" : ""}${flag.variancePct}%) ~ ${formatNaira(flag.estimatedNairaImpact)}.`
        );
      }
      lines.push(`_Prompt: Check if jerrycans were refilled for reserve or if heavy cooling load was used._`);
    } else {
      lines.push(``);
      lines.push(`✅ *Fuel burn is consistent with run-hours within normal tolerance.*`);
    }

    const messageText = lines.join("\n");

    let telegramSent = false;
    let telegramError: string | undefined = undefined;

    if (input.sendTelegram) {
      // guard:allow-env-credential — Deploy-level Telegram bot token for scheduled automations
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      // guard:allow-env-credential — Fallback deploy-level Telegram chat id
      const chatId = appSettings?.telegramChatId || process.env.TELEGRAM_CHAT_ID;

      if (!botToken) {
        telegramError = "TELEGRAM_BOT_TOKEN is not configured in environment.";
      } else if (!chatId) {
        telegramError = "No Telegram Chat ID linked in Settings or environment.";
      } else {
        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: messageText,
              parse_mode: "Markdown",
            }),
          });
          const data = (await res.json()) as { ok: boolean; description?: string };
          if (data.ok) {
            telegramSent = true;
          } else {
            telegramError = data.description ?? "Failed to send message via Telegram API.";
          }
        } catch (err) {
          telegramError = (err as Error).message;
        }
      }
    }

    return {
      weekStart: monday,
      weekEnd: sunday,
      metrics: {
        totalLitres,
        totalSpendNaira,
        totalSpendFormatted: formatNaira(totalSpendNaira),
        totalRunHours,
        avgPricePerLitre,
        avgPriceFormatted: formatNaira(avgPricePerLitre),
        costPerHour,
        costPerHourFormatted: formatNaira(costPerHour),
        openFlagsCount: openFlags.length,
        spendDeltaPct,
      },
      openFlags,
      formattedText: messageText,
      telegramSent,
      telegramError,
    };
  },
});
