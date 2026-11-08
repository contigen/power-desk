import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, settings, businesses } from "../server/db/index.js";
import { eq } from "drizzle-orm";

export default defineAction({
  description: "Update application settings (tolerance percentage, showSampleData toggle, summary schedule, telegramChatId, allowedChatIds).",
  schema: z.object({
    tolerancePct: z.number().min(1).max(100).optional().describe("Variance alert tolerance percentage (e.g. 15)."),
    showSampleData: z.boolean().optional().describe("Whether to show seeded sample data."),
    weeklySummaryDay: z.string().optional().describe("Day of week to run weekly summary (default Sunday)."),
    weeklySummaryTime: z.string().optional().describe("Time to run weekly summary in 24h format (default 18:00 WAT)."),
    telegramChatId: z.string().nullable().optional().describe("Linked Telegram Chat ID for automated updates."),
    allowedChatIds: z.string().optional().describe("Comma-separated list of allowed Telegram user IDs."),
  }),
  http: { method: "POST" },
  run: async (input) => {
    const db = getDb();
    const existing = await db.select().from(settings).limit(1);
    const nowIso = new Date().toISOString();

    if (existing.length === 0) {
      const allBiz = await db.select().from(businesses).limit(1);
      const bizId = allBiz[0]?.id ?? "biz-sample-adewale";
      const newSettings = {
        id: "settings-primary",
        businessId: bizId,
        tolerancePct: input.tolerancePct ?? 15,
        currency: "NGN",
        showSampleData: input.showSampleData ?? true,
        weeklySummaryDay: input.weeklySummaryDay ?? "Sunday",
        weeklySummaryTime: input.weeklySummaryTime ?? "18:00",
        telegramChatId: input.telegramChatId ?? null,
        allowedChatIds: input.allowedChatIds ?? "",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await db.insert(settings).values(newSettings);
      return { success: true, settings: newSettings };
    }

    const current = existing[0];
    if (!current) {
      throw new Error("Settings record not found.");
    }
    await db
      .update(settings)
      .set({
        tolerancePct: input.tolerancePct !== undefined ? input.tolerancePct : current.tolerancePct,
        showSampleData: input.showSampleData !== undefined ? input.showSampleData : current.showSampleData,
        weeklySummaryDay: input.weeklySummaryDay ?? current.weeklySummaryDay,
        weeklySummaryTime: input.weeklySummaryTime ?? current.weeklySummaryTime,
        telegramChatId: input.telegramChatId !== undefined ? input.telegramChatId : current.telegramChatId,
        allowedChatIds: input.allowedChatIds !== undefined ? input.allowedChatIds : current.allowedChatIds,
        updatedAt: nowIso,
      })
      .where(eq(settings.id, current.id));

    const updated = await db.select().from(settings).where(eq(settings.id, current.id));
    return { success: true, settings: updated[0] || current };
  },
});
