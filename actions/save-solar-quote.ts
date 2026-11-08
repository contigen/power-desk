import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, solarQuotes, businesses } from "../server/db/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { formatNaira } from "../server/lib/calculations.js";

export default defineAction({
  description: "Save or update a solar installation quote/scenario for break-even comparisons.",
  schema: z.object({
    quoteId: z.string().optional().describe("Existing quote ID to update, if applicable."),
    label: z.string().min(1).describe("Descriptive label (e.g. '5kVA Hybrid Solar System', 'Prag 3.5kVA Inverter')"),
    systemCostNaira: z.number().min(10000).describe("Total system cost in Nigerian Naira"),
    expectedYearsLife: z.number().default(10).describe("Expected system lifespan in years"),
    batteryReplacementCostNaira: z.number().default(0).describe("Battery replacement cost in Naira"),
    batteryYearsLife: z.number().default(4).describe("Battery lifespan in years"),
    notes: z.string().optional().describe("Notes on inverter sizing, battery chemistry, installer name, etc."),
  }),
  http: { method: "POST" },
  run: async (input) => {
    const db = getDb();
    const allBiz = await db.select().from(businesses).limit(1);
    const businessId = allBiz[0]?.id ?? "biz-sample-adewale";
    const nowIso = new Date().toISOString();

    if (input.quoteId) {
      await db
        .update(solarQuotes)
        .set({
          label: input.label,
          systemCostNaira: input.systemCostNaira,
          expectedYearsLife: input.expectedYearsLife,
          batteryReplacementCostNaira: input.batteryReplacementCostNaira,
          batteryYearsLife: input.batteryYearsLife,
          notes: input.notes ?? null,
          updatedAt: nowIso,
        })
        .where(eq(solarQuotes.id, input.quoteId));

      return {
        success: true,
        quoteId: input.quoteId,
        message: `Updated solar quote '${input.label}' (${formatNaira(input.systemCostNaira)}).`,
      };
    } else {
      const quoteId = `solar-${randomUUID().slice(0, 8)}`;
      await db.insert(solarQuotes).values({
        id: quoteId,
        businessId,
        label: input.label,
        systemCostNaira: input.systemCostNaira,
        expectedYearsLife: input.expectedYearsLife,
        batteryReplacementCostNaira: input.batteryReplacementCostNaira,
        batteryYearsLife: input.batteryYearsLife,
        notes: input.notes ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      return {
        success: true,
        quoteId,
        message: `Saved new solar quote '${input.label}' (${formatNaira(input.systemCostNaira)}).`,
      };
    }
  },
});
