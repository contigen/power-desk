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

    const userFuel = latestFuel[0];
    const userRun = latestRun[0];

    if (!userFuel && !userRun) {
      return {
        success: false,
        message: "No user-logged entries found to undo. Sample demonstration entries cannot be undone.",
      };
    }

    const allGens = await db.select().from(generators);
    const genMap = new Map(allGens.map((g) => [g.id, g.name]));

    // Determine which user entry is newer
    if (userFuel && (!userRun || userFuel.createdAt >= userRun.createdAt)) {
      await db.delete(fuelEntries).where(eq(fuelEntries.id, userFuel.id));
      const genName = genMap.get(userFuel.generatorId) ?? "Generator";
      return {
        success: true,
        type: "fuel",
        deletedEntry: userFuel,
        message: `Undone: Removed fuel entry of ${userFuel.litres}L (${formatNaira(userFuel.totalCost)}) on ${userFuel.date} for ${genName}.`,
      };
    } else if (userRun) {
      await db.delete(runEntries).where(eq(runEntries.id, userRun.id));
      const genName = genMap.get(userRun.generatorId) ?? "Generator";
      return {
        success: true,
        type: "run",
        deletedEntry: userRun,
        message: `Undone: Removed run entry of ${userRun.hours}h on ${userRun.date} for ${genName}.`,
      };
    }

    return { success: false, message: "No matching entry found to undo." };
  },
});
