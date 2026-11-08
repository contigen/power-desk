import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, generators, fuelEntries, runEntries } from "../server/db/index.js";
import { calculateBreakEven, formatNaira } from "../server/lib/calculations.js";
import { desc } from "drizzle-orm";

export default defineAction({
  description:
    "Calculate deterministic solar vs generator break-even and payback analysis. Shows monthly generator costs, equivalent solar maintenance, net monthly savings, payback month, and 5-year cumulative comparison.",
  schema: z.object({
    generatorId: z.string().optional().describe("Generator ID to pull actual defaults from."),
    dailyRunHours: z.number().min(0).max(24).optional().describe("Daily generator run-hours (defaults to historical average or 6.0)."),
    fuelPricePerLitre: z.number().min(0).optional().describe("Pump price per litre in Naira (defaults to recent average or N1,350)."),
    litresPerHour: z.number().min(0.1).optional().describe("Generator consumption rate in L/h (defaults to generator typical spec or 1.2 L/h)."),
    servicingCostPerHour: z.number().min(0).optional().describe("Servicing and oil cost per run-hour in Naira (defaults to generator spec or N350/h)."),
    solarSystemCostNaira: z.number().min(0).optional().describe("Total upfront capital cost for solar system in Naira (defaults to N3,800,000)."),
    batteryReplacementCostNaira: z.number().min(0).optional().describe("Cost to replace battery pack in Naira (defaults to N1,200,000)."),
    batteryYearsLife: z.number().min(1).max(15).optional().describe("Expected lifespan of battery pack in years (defaults to 4 years)."),
    horizonYears: z.number().min(1).max(20).optional().describe("Analysis horizon in years (defaults to 5 years)."),
  }),
  http: { method: "POST" },
  mcpTool: true,
  publicAgent: {
    expose: true,
    readOnly: true,
    requiresAuth: false,
    isConsequential: false,
    title: "Calculate Solar vs Generator Break-Even",
  },
  run: async (input) => {
    const db = getDb();

    // 1. Fetch generator for defaults if available
    const allGens = await db.select().from(generators);
    let targetGen = allGens[0];
    if (input.generatorId) {
      const match = allGens.find((g) => g.id === input.generatorId);
      if (match) targetGen = match;
    }

    // 2. Fetch recent ledger entries to calculate smart defaults
    const recentFuel = await db.select().from(fuelEntries).orderBy(desc(fuelEntries.date)).limit(10);
    const recentRuns = await db.select().from(runEntries).orderBy(desc(runEntries.date)).limit(30);

    let defaultPrice = 1350;
    if (recentFuel.length > 0) {
      const totalSpend = recentFuel.reduce((sum, f) => sum + f.totalCost, 0);
      const totalLitres = recentFuel.reduce((sum, f) => sum + f.litres, 0);
      if (totalLitres > 0) defaultPrice = Math.round(totalSpend / totalLitres);
    }

    let defaultHours = 6.0;
    if (recentRuns.length > 0) {
      const totalHours = recentRuns.reduce((sum, r) => sum + r.hours, 0);
      defaultHours = Number((totalHours / recentRuns.length).toFixed(1));
    }

    const dailyRunHours = input.dailyRunHours ?? defaultHours;
    const fuelPricePerLitre = input.fuelPricePerLitre ?? defaultPrice;
    const litresPerHour = input.litresPerHour ?? (targetGen?.litresPerHourTypical ?? 1.2);
    const servicingCostPerHour = input.servicingCostPerHour ?? (targetGen?.servicingCostPerHour ?? 350);
    const solarSystemCostNaira = input.solarSystemCostNaira ?? 3800000;
    const batteryReplacementCostNaira = input.batteryReplacementCostNaira ?? 1200000;
    const batteryYearsLife = input.batteryYearsLife ?? 4;
    const horizonYears = input.horizonYears ?? 5;

    const result = calculateBreakEven({
      dailyRunHours,
      fuelPricePerLitre,
      litresPerHour,
      servicingCostPerHour,
      solarSystemCostNaira,
      batteryReplacementCostNaira,
      batteryYearsLife,
      horizonYears,
    });

    return {
      ...result,
      formatted: {
        dailyFuelCost: formatNaira(result.dailyFuelCostNaira),
        dailyServicingCost: formatNaira(result.dailyServicingCostNaira),
        dailyTotalCost: formatNaira(result.dailyTotalCostNaira),
        monthlyGeneratorCost: formatNaira(result.monthlyGeneratorCostNaira),
        annualGeneratorCost: formatNaira(result.annualGeneratorCostNaira),
        solarSystemCost: formatNaira(result.solarSystemCostNaira),
        monthlySolarEquivalent: formatNaira(result.monthlySolarEquivalentNaira),
        monthlySavings: formatNaira(result.monthlySavingsNaira),
        annualSavings: formatNaira(result.annualSavingsNaira),
        cumulative5YearGen: formatNaira(result.cumulative5YearGenNaira),
        cumulative5YearSolar: formatNaira(result.cumulative5YearSolarNaira),
        net5YearSavings: formatNaira(result.net5YearSavingsNaira),
      },
      summary:
        result.paybackMonths !== null
          ? `Solar pays back in ${result.paybackMonths} months (${result.paybackYears} years). Monthly generator spend is ${formatNaira(
              result.monthlyGeneratorCostNaira
            )} vs ${formatNaira(
              result.monthlySolarEquivalentNaira
            )} equivalent solar upkeep, saving ${formatNaira(
              result.monthlySavingsNaira
            )} every month. Over 5 years, net savings are ${formatNaira(result.net5YearSavingsNaira)}.`
          : `At current parameters, solar savings do not exceed upkeep. Try adjusting daily hours or pump price.`,
    };
  },
});
