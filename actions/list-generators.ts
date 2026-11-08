import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, generators } from "../server/db/index.js";
import { formatNaira } from "../server/lib/calculations.js";

export default defineAction({
  description: "List all generators and their consumption specs (kVA, L/h light/typical/heavy bands, tank capacity, servicing cost).",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const db = getDb();
    const list = await db.select().from(generators);
    return {
      generators: list.map((g) => ({
        ...g,
        servicingCostFormatted: formatNaira(g.servicingCostPerHour),
      })),
      count: list.length,
    };
  },
});
