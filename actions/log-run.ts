import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, runEntries, generators } from "../server/db/index.js";
import { getLagosToday, getWeekStartMonday } from "../server/lib/calculations.js";
import { eq, and, gte, lte } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export default defineAction({
  description:
    "Log generator run-hours and load band. Max 24 hours per entry. Returns logged entry and current week running hours.",
  schema: z.object({
    generator: z
      .string()
      .optional()
      .describe("Generator name (e.g. 'Gen A', 'Gen B') or id. Defaults to primary generator if omitted."),
    hours: z
      .number()
      .min(0.1, "Run hours must be greater than 0")
      .max(24, "Run hours cannot exceed 24 in a single day.")
      .describe("Number of hours the generator operated (e.g. 4.5, 6, 8)."),
    loadBand: z
      .enum(["light", "typical", "heavy"])
      .default("typical")
      .describe("Operating load band: 'light' (cooling off/low demand), 'typical' (normal business load), 'heavy' (peak refrigeration/chillers). Defaults to 'typical'."),
    date: z
      .string()
      .optional()
      .describe("Date of operation in YYYY-MM-DD. Defaults to today (Lagos time)."),
    note: z
      .string()
      .optional()
      .describe("Optional notes (e.g. 'Ran during grid blackout from 12pm to 6pm')."),
    source: z
      .enum(["telegram", "web", "seed"])
      .default("web")
      .describe("Entry source channel."),
  }),
  http: { method: "POST" },
  run: async (input) => {
    const db = getDb();

    // 1. Resolve generator
    const allGens = await db.select().from(generators);
    if (allGens.length === 0) {
      throw new Error("No generator registered. Please create a generator first.");
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
      throw new Error("No generator registered. Please create a generator first.");
    }

    const date = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : getLagosToday();
    const hours = Number(input.hours.toFixed(1));
    const nowIso = new Date().toISOString();
    const entryId = `run-${randomUUID().slice(0, 8)}`;

    const newEntry = {
      id: entryId,
      generatorId: targetGen.id,
      date,
      hours,
      loadBand: input.loadBand ?? "typical",
      source: input.source ?? "web",
      note: input.note ?? null,
      isSample: false, // User logged entry is real!
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.insert(runEntries).values(newEntry);

    // 2. Compute current week total run hours
    const monday = getWeekStartMonday(date);
    const weekEntries = await db
      .select()
      .from(runEntries)
      .where(
        and(
          eq(runEntries.generatorId, targetGen.id),
          gte(runEntries.date, monday),
          lte(runEntries.date, date)
        )
      );

    const weekHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);

    return {
      success: true,
      entry: newEntry,
      generator: {
        id: targetGen.id,
        name: targetGen.name,
      },
      weekTotals: {
        weekStartMonday: monday,
        totalHours: Number(weekHours.toFixed(1)),
      },
      confirmation: `Logged ${hours}h (${input.loadBand ?? "typical"} load) for ${targetGen.name}. Week total: ${Number(weekHours.toFixed(1))}h.`,
    };
  },
});
