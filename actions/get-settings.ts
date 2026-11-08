import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, settings, businesses } from "../server/db/index.js";

export default defineAction({
  description: "Get application settings (tolerance percentage, currency, sample data toggle, telegram connection).",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const db = getDb();
    const list = await db.select().from(settings).limit(1);
    if (list.length === 0) {
      const allBiz = await db.select().from(businesses).limit(1);
      const bizId = allBiz[0]?.id ?? "biz-sample-adewale";
      const nowIso = new Date().toISOString();
      const defaultSettings = {
        id: "settings-primary",
        businessId: bizId,
        tolerancePct: 15,
        currency: "NGN",
        showSampleData: true,
        weeklySummaryDay: "Sunday",
        weeklySummaryTime: "18:00",
        telegramChatId: null,
        allowedChatIds: "",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await db.insert(settings).values(defaultSettings);
      return defaultSettings;
    }
    return list[0];
  },
});
