import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import {
  getDb,
  generators,
  fuelEntries,
  runEntries,
  varianceFlags,
  settings,
} from "../server/db/index.js";
import {
  calculateVariance,
  getWeekStartMonday,
  getLagosToday,
  formatNaira,
} from "../server/lib/calculations.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export default defineAction({
  description:
    "Check fuel variance for generator(s) over a given week or recent weeks. Compares litres bought vs litres expected from run-hours and consumption bands. Upserts variance flags with estimated Naira impact. Neutral copy: always 'unexplained variance', never accusations.",
  schema: z.object({
    generatorId: z
      .string()
      .optional()
      .describe("Optional generator ID to check. If omitted, checks all generators."),
    weekStart: z
      .string()
      .optional()
      .describe("Monday of the week to analyze in YYYY-MM-DD format. Defaults to current week's Monday."),
    recalculateAll: z
      .boolean()
      .optional()
      .describe("If true, re-analyzes all historical weeks in the database."),
  }),
  http: { method: "GET" },
  run: async (input) => {
    const db = getDb();

    // 1. Fetch settings (tolerance percentage)
    const settingsList = await db.select().from(settings).limit(1);
    const tolerancePct = settingsList[0]?.tolerancePct ?? 15;

    // 2. Fetch generators
    let genList = await db.select().from(generators);
    if (input.generatorId) {
      genList = genList.filter((g) => g.id === input.generatorId);
    }
    if (genList.length === 0) {
      return { flags: [], summary: "No generators found to check." };
    }

    // 3. Determine which weeks to evaluate
    const targetMonday = input.weekStart
      ? getWeekStartMonday(input.weekStart)
      : getWeekStartMonday(getLagosToday());

    const allFuel = await db.select().from(fuelEntries);
    const allRuns = await db.select().from(runEntries);

    // Identify all distinct week Mondays across fuel and run records
    const weekMondays = new Set<string>();
    if (input.recalculateAll) {
      allFuel.forEach((f) => weekMondays.add(getWeekStartMonday(f.date)));
      allRuns.forEach((r) => weekMondays.add(getWeekStartMonday(r.date)));
    } else {
      weekMondays.add(targetMonday);
    }

    const createdFlags = [];

    for (const gen of genList) {
      for (const monday of Array.from(weekMondays).sort()) {
        const sundayDate = new Date(monday);
        sundayDate.setDate(sundayDate.getDate() + 6);
        const sunday = sundayDate.toISOString().split("T")[0] || "";

        // Filter fuel and runs for this generator and week
        const genFuel = allFuel.filter(
          (f) => f.generatorId === gen.id && f.date >= monday && f.date <= sunday
        );
        const genRuns = allRuns.filter(
          (r) => r.generatorId === gen.id && r.date >= monday && r.date <= sunday
        );

        if (genFuel.length === 0 && genRuns.length === 0) {
          continue;
        }

        const litresBought = genFuel.reduce((sum, f) => sum + f.litres, 0);
        const totalFuelCost = genFuel.reduce((sum, f) => sum + f.totalCost, 0);
        const avgPrice =
          litresBought > 0 ? totalFuelCost / litresBought : 1350;

        const hoursLight = genRuns
          .filter((r) => r.loadBand === "light")
          .reduce((sum, r) => sum + r.hours, 0);
        const hoursTypical = genRuns
          .filter((r) => r.loadBand === "typical" || !r.loadBand)
          .reduce((sum, r) => sum + r.hours, 0);
        const hoursHeavy = genRuns
          .filter((r) => r.loadBand === "heavy")
          .reduce((sum, r) => sum + r.hours, 0);

        const vResult = calculateVariance({
          litresBought,
          hoursLight,
          hoursTypical,
          hoursHeavy,
          litresPerHourLight: gen.litresPerHourLight,
          litresPerHourTypical: gen.litresPerHourTypical,
          litresPerHourHeavy: gen.litresPerHourHeavy,
          tolerancePct,
          avgPricePerLitre: avgPrice,
        });

        // Check if an existing flag exists for this generator-week
        const existingFlags = await db
          .select()
          .from(varianceFlags)
          .where(
            and(
              eq(varianceFlags.generatorId, gen.id),
              eq(varianceFlags.weekStart, monday)
            )
          );

        const existing = existingFlags[0];
        const nowIso = new Date().toISOString();

        if (vResult.isFlagged) {
          if (existing) {
            // Update metrics while preserving existing explanation and status
            await db
              .update(varianceFlags)
              .set({
                litresBought: vResult.litresBought,
                litresExpected: vResult.litresExpected,
                varianceLitres: vResult.varianceLitres,
                variancePct: vResult.variancePct,
                estimatedNairaImpact: vResult.estimatedNairaImpact,
                updatedAt: nowIso,
              })
              .where(eq(varianceFlags.id, existing.id));
            createdFlags.push({ ...existing, ...vResult });
          } else {
            const flagId = `flag-${randomUUID().slice(0, 8)}`;
            const newFlag = {
              id: flagId,
              generatorId: gen.id,
              weekStart: monday,
              litresBought: vResult.litresBought,
              litresExpected: vResult.litresExpected,
              varianceLitres: vResult.varianceLitres,
              variancePct: vResult.variancePct,
              estimatedNairaImpact: vResult.estimatedNairaImpact,
              status: "open",
              explanation: null,
              createdAt: nowIso,
              updatedAt: nowIso,
            };
            await db.insert(varianceFlags).values(newFlag);
            createdFlags.push(newFlag);
          }
        } else if (existing && existing.status === "open") {
          // If previously open but now resolved within tolerance, dismiss it
          await db
            .update(varianceFlags)
            .set({
              status: "dismissed",
              explanation: "Resolved: variance is now within normal tolerance band.",
              updatedAt: nowIso,
            })
            .where(eq(varianceFlags.id, existing.id));
        }
      }
    }

    // 4. Return all current flags with generator details
    const allFlags = await db
      .select()
      .from(varianceFlags)
      .orderBy(desc(varianceFlags.weekStart));

    const genMap = new Map(genList.map((g) => [g.id, g.name]));
    const flagsWithGens = allFlags.map((f) => ({
      ...f,
      generatorName: genMap.get(f.generatorId) ?? "Generator",
      estimatedNairaFormatted: formatNaira(Math.abs(f.estimatedNairaImpact)),
    }));

    const openCount = flagsWithGens.filter((f) => f.status === "open").length;

    return {
      flags: flagsWithGens,
      openCount,
      tolerancePct,
      summary:
        openCount === 0
          ? "No open unexplained variance flags. Fuel consumption matches run-hours within the tolerance band."
          : `Found ${openCount} open unexplained variance flag(s). Prompt the owner to inspect benign causes (e.g. jerrycan carry-over, heavy load) before taking action.`,
    };
  },
});
