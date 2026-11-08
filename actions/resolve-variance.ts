import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, varianceFlags, generators } from "../server/db/index.js";
import { eq } from "drizzle-orm";
import { formatNaira } from "../server/lib/calculations.js";

export default defineAction({
  description:
    "Resolve or update an unexplained variance flag with an explanation (e.g. 'filled jerrycans for neighbour', 'tank refill carry-over', 'surge in cooling load'). Status can be 'open', 'explained', or 'dismissed'.",
  schema: z.object({
    flagId: z.string().describe("ID of the variance flag to update (e.g. 'flag-sample-oct26')."),
    status: z
      .enum(["open", "explained", "dismissed"])
      .describe("New status: 'explained' (legitimate benign reason documented), 'dismissed' (acceptable noise), or 'open' (still under review)."),
    explanation: z
      .string()
      .optional()
      .describe("Explanation for the variance (e.g. 'Jerrycans carried over to next week', 'Power outage caused continuous chiller draw')."),
  }),
  http: { method: "POST" },
  run: async (input) => {
    const db = getDb();

    const existing = await db
      .select()
      .from(varianceFlags)
      .where(eq(varianceFlags.id, input.flagId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error(`Variance flag with ID '${input.flagId}' was not found.`);
    }

    const flag = existing[0];
    if (!flag) {
      throw new Error(`Variance flag with ID '${input.flagId}' was not found.`);
    }
    const nowIso = new Date().toISOString();

    await db
      .update(varianceFlags)
      .set({
        status: input.status,
        explanation: input.explanation ?? flag.explanation,
        updatedAt: nowIso,
      })
      .where(eq(varianceFlags.id, input.flagId));

    const updated = await db
      .select()
      .from(varianceFlags)
      .where(eq(varianceFlags.id, input.flagId))
      .limit(1);

    const gens = await db.select().from(generators).where(eq(generators.id, flag.generatorId));
    const genName = gens[0]?.name ?? "Generator";

    return {
      success: true,
      flag: updated[0],
      message: `Flag for ${genName} (Week of ${flag.weekStart}, ${flag.varianceLitres > 0 ? "+" : ""}${flag.varianceLitres}L / ${formatNaira(flag.estimatedNairaImpact)}) is now marked as ${input.status}.`,
    };
  },
});
