import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, generators } from "../server/db/index.js";
import { eq } from "drizzle-orm";

export default defineAction({
  description: "Update specs or servicing costs for an existing generator.",
  schema: z.object({
    id: z.string().describe("ID of the generator to update"),
    name: z.string().optional().describe("Generator name"),
    fuelType: z.enum(["petrol", "diesel"]).optional(),
    kva: z.number().positive().optional(),
    litresPerHourLight: z.number().positive().optional(),
    litresPerHourTypical: z.number().positive().optional(),
    litresPerHourHeavy: z.number().positive().optional(),
    tankLitres: z.number().positive().optional(),
    servicingCostPerHour: z.number().min(0).optional(),
    installDate: z.string().optional(),
  }),
  http: { method: "POST" },
  run: async (input) => {
    const db = getDb();
    const existing = await db.select().from(generators).where(eq(generators.id, input.id));
    if (existing.length === 0) {
      throw new Error(`Generator '${input.id}' not found.`);
    }

    const current = existing[0];
    if (!current) {
      throw new Error(`Generator '${input.id}' not found.`);
    }
    const nowIso = new Date().toISOString();

    await db
      .update(generators)
      .set({
        name: input.name ?? current.name,
        fuelType: input.fuelType ?? current.fuelType,
        kva: input.kva ?? current.kva,
        litresPerHourLight: input.litresPerHourLight ?? current.litresPerHourLight,
        litresPerHourTypical: input.litresPerHourTypical ?? current.litresPerHourTypical,
        litresPerHourHeavy: input.litresPerHourHeavy ?? current.litresPerHourHeavy,
        tankLitres: input.tankLitres ?? current.tankLitres,
        servicingCostPerHour: input.servicingCostPerHour ?? current.servicingCostPerHour,
        installDate: input.installDate !== undefined ? input.installDate : current.installDate,
        updatedAt: nowIso,
      })
      .where(eq(generators.id, input.id));

    const updated = await db.select().from(generators).where(eq(generators.id, input.id));
    const finalGen = updated[0] || current;

    return {
      success: true,
      generator: finalGen,
      message: `Updated generator '${finalGen.name}'.`,
    };
  },
});
