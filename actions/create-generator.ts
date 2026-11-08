import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, generators, businesses } from "../server/db/index.js";
import { randomUUID } from "node:crypto";

export default defineAction({
  description: "Register a new generator with its consumption bands (L/h), tank size, and servicing cost per hour.",
  schema: z.object({
    name: z.string().min(1).describe("Generator name (e.g. 'Gen C 5.5kVA Lutian')"),
    fuelType: z.enum(["petrol", "diesel"]).default("petrol").describe("Fuel type: 'petrol' or 'diesel'"),
    kva: z.number().positive().describe("Power rating in kVA (e.g. 3.2, 5.0)"),
    litresPerHourLight: z.number().positive().describe("Fuel burn at light load in L/h (e.g. 0.9)"),
    litresPerHourTypical: z.number().positive().describe("Fuel burn at typical load in L/h (e.g. 1.2)"),
    litresPerHourHeavy: z.number().positive().describe("Fuel burn at heavy load in L/h (e.g. 1.5)"),
    tankLitres: z.number().positive().describe("Tank capacity in litres (informational; owners buy in jerrycans)"),
    servicingCostPerHour: z.number().min(0).describe("Servicing and oil replacement cost per run-hour in Naira (e.g. 350)"),
    installDate: z.string().optional().describe("Installation date (YYYY-MM-DD)"),
  }),
  http: { method: "POST" },
  run: async (input) => {
    const db = getDb();
    const allBiz = await db.select().from(businesses).limit(1);
    const businessId = allBiz[0]?.id ?? "biz-sample-adewale";
    const id = `gen-${randomUUID().slice(0, 8)}`;
    const nowIso = new Date().toISOString();

    const newGen = {
      id,
      businessId,
      name: input.name,
      fuelType: input.fuelType,
      kva: input.kva,
      litresPerHourLight: input.litresPerHourLight,
      litresPerHourTypical: input.litresPerHourTypical,
      litresPerHourHeavy: input.litresPerHourHeavy,
      tankLitres: input.tankLitres,
      servicingCostPerHour: input.servicingCostPerHour,
      installDate: input.installDate ?? null,
      isSample: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.insert(generators).values(newGen);

    return {
      success: true,
      generator: newGen,
      message: `Registered generator '${input.name}' (${input.kva} kVA, ${input.litresPerHourTypical} L/h typical).`,
    };
  },
});
