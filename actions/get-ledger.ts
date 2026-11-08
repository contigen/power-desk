import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, fuelEntries, runEntries, generators, settings } from "../server/db/index.js";
import { getLagosToday, formatNaira } from "../server/lib/calculations.js";
import { desc, eq, and, gte, lte } from "drizzle-orm";

export interface LedgerItem {
  id: string;
  type: "fuel" | "run";
  generatorId: string;
  generatorName: string;
  date: string;
  litres?: number;
  pricePerLitre?: number;
  totalCostNaira?: number;
  supplier?: string | null;
  hours?: number;
  loadBand?: string;
  source: string;
  note?: string | null;
  isSample: boolean;
  createdAt: string;
}

export default defineAction({
  description:
    "Retrieve merged chronological ledger of fuel purchases and generator run hours, with calculated summary metrics (spend, litres, hours, cost per run-hour).",
  schema: z.object({
    range: z
      .enum(["7d", "30d", "all", "custom"])
      .default("30d")
      .describe("Date range window: '7d' (last 7 days), '30d' (last 30 days), 'all', or 'custom'."),
    startDate: z.string().optional().describe("Start date for custom range (YYYY-MM-DD)."),
    endDate: z.string().optional().describe("End date for custom range (YYYY-MM-DD)."),
    generatorId: z.string().optional().describe("Filter by specific generator ID."),
    includeSample: z
      .boolean()
      .optional()
      .describe("Whether to include sample/seed rows. If omitted, uses business settings."),
  }),
  http: { method: "GET" },
  mcpTool: true,
  publicAgent: {
    expose: true,
    readOnly: true,
    requiresAuth: false,
    isConsequential: false,
    title: "Get Generator and Fuel Ledger",
  },
  run: async (input) => {
    const db = getDb();

    // 1. Fetch settings to determine default sample data visibility
    const settingsList = await db.select().from(settings).limit(1);
    const appSettings = settingsList[0];
    const shouldIncludeSample =
      input.includeSample !== undefined
        ? input.includeSample
        : appSettings?.showSampleData ?? true;

    // 2. Determine date filter
    const today = getLagosToday();
    let minDate: string | undefined = undefined;
    let maxDate: string | undefined = today;

    if (input.range === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      minDate = d.toISOString().split("T")[0];
    } else if (input.range === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      minDate = d.toISOString().split("T")[0];
    } else if (input.range === "custom") {
      minDate = input.startDate;
      maxDate = input.endDate ?? today;
    }

    // 3. Fetch generators mapping
    const allGens = await db.select().from(generators);
    const genMap = new Map(allGens.map((g) => [g.id, g.name]));

    // 4. Fetch fuel entries
    let fuelQuery = db.select().from(fuelEntries);
    const allFuel = await fuelQuery.orderBy(desc(fuelEntries.date), desc(fuelEntries.createdAt));

    // 5. Fetch run entries
    let runQuery = db.select().from(runEntries);
    const allRuns = await runQuery.orderBy(desc(runEntries.date), desc(runEntries.createdAt));

    // 6. Filter in memory for robust multi-condition support
    const filteredFuel = allFuel.filter((f) => {
      if (!shouldIncludeSample && f.isSample) return false;
      if (input.generatorId && f.generatorId !== input.generatorId) return false;
      if (minDate && f.date < minDate) return false;
      if (maxDate && f.date > maxDate) return false;
      return true;
    });

    const filteredRuns = allRuns.filter((r) => {
      if (!shouldIncludeSample && r.isSample) return false;
      if (input.generatorId && r.generatorId !== input.generatorId) return false;
      if (minDate && r.date < minDate) return false;
      if (maxDate && r.date > maxDate) return false;
      return true;
    });

    // 7. Merge into unified chronological list
    const merged: LedgerItem[] = [
      ...filteredFuel.map((f) => ({
        id: f.id,
        type: "fuel" as const,
        generatorId: f.generatorId,
        generatorName: genMap.get(f.generatorId) ?? "Unknown Generator",
        date: f.date,
        litres: f.litres,
        pricePerLitre: f.pricePerLitre,
        totalCostNaira: f.totalCost,
        supplier: f.supplier,
        source: f.source,
        note: f.note,
        isSample: f.isSample,
        createdAt: f.createdAt,
      })),
      ...filteredRuns.map((r) => ({
        id: r.id,
        type: "run" as const,
        generatorId: r.generatorId,
        generatorName: genMap.get(r.generatorId) ?? "Unknown Generator",
        date: r.date,
        hours: r.hours,
        loadBand: r.loadBand,
        source: r.source,
        note: r.note,
        isSample: r.isSample,
        createdAt: r.createdAt,
      })),
    ];

    // Sort descending by date, then createdAt
    merged.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    });

    // 8. Calculate summary aggregates
    const totalLitres = Number(
      filteredFuel.reduce((sum, f) => sum + f.litres, 0).toFixed(1)
    );
    const totalSpendNaira = Math.round(
      filteredFuel.reduce((sum, f) => sum + f.totalCost, 0)
    );
    const totalRunHours = Number(
      filteredRuns.reduce((sum, r) => sum + r.hours, 0).toFixed(1)
    );

    const averagePricePerLitre =
      totalLitres > 0 ? Math.round(totalSpendNaira / totalLitres) : 0;
    const costPerRunHour =
      totalRunHours > 0 ? Math.round(totalSpendNaira / totalRunHours) : 0;

    const hasSampleData = merged.some((item) => item.isSample);

    return {
      entries: merged,
      summary: {
        totalLitres,
        totalSpendNaira,
        totalSpendFormatted: formatNaira(totalSpendNaira),
        totalRunHours,
        averagePricePerLitre,
        averagePriceFormatted: formatNaira(averagePricePerLitre),
        costPerRunHour,
        costPerRunHourFormatted: formatNaira(costPerRunHour),
        entryCount: merged.length,
        fuelCount: filteredFuel.length,
        runCount: filteredRuns.length,
        hasSampleData,
        range: input.range,
        minDate: minDate ?? "earliest",
        maxDate: maxDate ?? today,
      },
      generators: allGens.map((g) => ({
        id: g.id,
        name: g.name,
        kva: g.kva,
        fuelType: g.fuelType,
      })),
    };
  },
});
