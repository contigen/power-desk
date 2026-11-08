import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, fuelEntries, runEntries, generators } from "../server/db/index.js";
import { desc, eq } from "drizzle-orm";
import { formatNaira } from "../server/lib/calculations.js";

export default defineAction({
  description: "Undo and delete the most recently logged fuel or run entry (typically triggered by /undo in Telegram or web).",
  schema: z.object({
    confirm: z.boolean().default(true).describe("Confirmation flag to prevent accidental deletion."),
  }),
  http: { method: "POST" },
  run: async (input) => {
    if (!input.confirm) {
      return { success: false, message: "Undo cancelled. Please confirm deletion." };
    }

    const db = getDb();
    // Prioritize non-sample recent entries
    const latestFuel = await db
      .select()
      .from(fuelEntries)
      .where(eq(fuelEntries.isSample, false))
      .orderBy(desc(fuelEntries.createdAt))
      .limit(1);

    const latestRun = await db
      .select()
      .from(runEntries)
      .where(eq(runEntries.isSample, false))
      .orderBy(desc(runEntries.createdAt))
      .limit(1);

    // If no real entries, check recent entry in general
    const fallbackFuel = latestFuel.length > 0 ? latestFuel[0] : (await db.select().from(fuelEntries).orderBy(desc(fuelEntries.createdAt)).limit(1))[0];
    const fallbackRun = latestRun.length > 0 ? latestRun[0] : (await db.select().from(runEntries).orderBy(desc(runEntries.createdAt)).limit(1))[0];

    if (!fallbackFuel && !fallbackRun) {
      return { success: false, message: "No entries found to undo." };
    }

    const allGens = await db.select().from(generators);
    const genMap = new Map(allGens.map((g) => [g.id, g.name]));

    // Determine which is newer
    if (fallbackFuel && (!fallbackRun || fallbackFuel.createdAt >= fallbackRun.createdAt)) {
      await db.delete(fuelEntries).where(eq(fuelEntries.id, fallbackFuel.id));
      const genName = genMap.get(fallbackFuel.generatorId) ?? "Generator";
      return {
        success: true,
        type: "fuel",
        deletedEntry: fallbackFuel,
        message: `Undone: Removed fuel entry of ${fallbackFuel.litres}L (${formatNaira(fallbackFuel.totalCost)}) on ${fallbackFuel.date} for ${genName}.`,
      };
    } else if (fallbackRun) {
      await db.delete(runEntries).where(eq(runEntries.id, fallbackRun.id));
      const genName = genMap.get(fallbackRun.generatorId) ?? "Generator";
      return {
        success: true,
        type: "run",
        deletedEntry: fallbackRun,
        message: `Undone: Removed run entry of ${fallbackRun.hours}h on ${fallbackRun.date} for ${genName}.`,
      };
    }

    return { success: false, message: "No matching entry found to undo." };
  },
});
