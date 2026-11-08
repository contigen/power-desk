import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, solarQuotes } from "../server/db/index.js";
import { desc } from "drizzle-orm";
import { formatNaira } from "../server/lib/calculations.js";

export default defineAction({
  description: "List all saved solar and battery replacement quotes.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const db = getDb();
    const quotes = await db.select().from(solarQuotes).orderBy(desc(solarQuotes.createdAt));

    return {
      quotes: quotes.map((q) => ({
        ...q,
        systemCostFormatted: formatNaira(q.systemCostNaira),
        batteryReplacementCostFormatted: formatNaira(q.batteryReplacementCostNaira),
      })),
      count: quotes.length,
    };
  },
});
