import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, fuelEntries, generators, settings } from "../server/db/index.js";
import { getLagosToday, getWeekStartMonday, formatNaira } from "../server/lib/calculations.js";
import { eq, and, gte, lte } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export default defineAction({
  description:
    "Log a fuel purchase entry for a generator. Litres bought can exceed generator tank capacity because owners buy in jerrycans (10-25L) to refuel. Rejects negative values or litres over 200.",
  schema: z.object({
    generator: z
      .string()
      .optional()
      .describe("Generator name (e.g. 'Gen A', '3.2kVA') or id. Defaults to first/primary generator if omitted."),
    litres: z
      .number()
      .min(0.1, "Litres must be greater than 0")
      .max(200, "Single purchase cannot exceed 200 litres. Please check value.")
      .describe("Litres of fuel purchased (e.g. 20, 25, 40). Maximum 200L."),
    pricePerLitre: z
      .number()
      .min(100, "Price per litre must be at least N100")
      .describe("Fuel pump price per litre in Naira (e.g. 1250, 1350)."),
    date: z
      .string()
      .optional()
      .describe("Date of purchase in YYYY-MM-DD. Defaults to today (Lagos time)."),
    supplier: z
      .string()
      .optional()
      .describe("Vendor or filling station name (e.g. 'NNPC', 'TotalEnergies')."),
    note: z
      .string()
      .optional()
      .describe("Optional notes (e.g. 'Bought in 25L yellow jerrycan')."),
    source: z
      .enum(["telegram", "web", "seed"])
      .default("web")
      .describe("Entry source channel."),
    receiptUploadId: z
      .string()
      .optional()
      .describe("Optional receipt upload ID if attaching a receipt image."),
  }),
  http: { method: "POST" },
  run: async (input) => {
    const db = getDb();

    // 1. Resolve generator
    const allGens = await db.select().from(generators);
    if (allGens.length === 0) {
      throw new Error("No generator found in the system. Please register a generator first.");
    }

    let targetGen = allGens[0];
    if (input.generator) {
      const q = input.generator.toLowerCase().trim();
      const matched = allGens.find(
        (g) =>
          g.id.toLowerCase() === q ||
          g.name.toLowerCase().includes(q) ||
          (q.includes("a") && g.name.toLowerCase().includes("gen a")) ||
          (q.includes("b") && g.name.toLowerCase().includes("gen b"))
      );
      if (matched) {
        targetGen = matched;
      }
    }

    if (!targetGen) {
      throw new Error("No generator found in the system. Please register a generator first.");
    }

    const date = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : getLagosToday();
    const litres = Number(input.litres.toFixed(2));
    const pricePerLitre = Number(input.pricePerLitre.toFixed(2));
    const totalCost = Math.round(litres * pricePerLitre);
    const nowIso = new Date().toISOString();
    const entryId = `fuel-${randomUUID().slice(0, 8)}`;

    const newEntry = {
      id: entryId,
      generatorId: targetGen.id,
      date,
      litres,
      pricePerLitre,
      totalCost,
      supplier: input.supplier ?? null,
      source: input.source ?? "web",
      receiptUploadId: input.receiptUploadId ?? null,
      note: input.note ?? null,
      isSample: false, // User logged entry is real data!
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.insert(fuelEntries).values(newEntry);

    // 2. Compute current week totals
    const monday = getWeekStartMonday(date);
    const weekEntries = await db
      .select()
      .from(fuelEntries)
      .where(
        and(
          eq(fuelEntries.generatorId, targetGen.id),
          gte(fuelEntries.date, monday),
          lte(fuelEntries.date, date)
        )
      );

    const weekLitres = weekEntries.reduce((sum, e) => sum + e.litres, 0);
    const weekSpend = weekEntries.reduce((sum, e) => sum + e.totalCost, 0);

    return {
      success: true,
      entry: newEntry,
      generator: {
        id: targetGen.id,
        name: targetGen.name,
      },
      weekTotals: {
        weekStartMonday: monday,
        totalLitres: Number(weekLitres.toFixed(1)),
        totalSpendNaira: weekSpend,
        totalSpendFormatted: formatNaira(weekSpend),
      },
      confirmation: `Logged ${litres}L @ ${formatNaira(pricePerLitre)}/L for ${targetGen.name} (${formatNaira(totalCost)}). Week total: ${Number(weekLitres.toFixed(1))}L (${formatNaira(weekSpend)}).`,
    };
  },
});
