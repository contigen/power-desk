export interface BreakEvenParams {
  dailyRunHours: number;
  fuelPricePerLitre: number;
  litresPerHour: number;
  servicingCostPerHour: number;
  solarSystemCostNaira: number;
  batteryReplacementCostNaira: number;
  batteryYearsLife: number;
  horizonYears?: number;
}

export interface BreakEvenResult {
  dailyRunHours: number;
  fuelPricePerLitre: number;
  litresPerHour: number;
  servicingCostPerHour: number;
  dailyFuelLitres: number;
  dailyFuelCostNaira: number;
  dailyServicingCostNaira: number;
  dailyTotalCostNaira: number;
  monthlyGeneratorCostNaira: number;
  annualGeneratorCostNaira: number;
  solarSystemCostNaira: number;
  batteryReplacementCostNaira: number;
  batteryYearsLife: number;
  annualSolarMaintenanceNaira: number;
  monthlySolarEquivalentNaira: number;
  monthlySavingsNaira: number;
  annualSavingsNaira: number;
  paybackMonths: number | null;
  paybackYears: number | null;
  horizonYears: number;
  cumulative5YearGenNaira: number;
  cumulative5YearSolarNaira: number;
  net5YearSavingsNaira: number;
  crossoverMonth: number | null;
  timeline: Array<{
    month: number;
    year: number;
    generatorCumulative: number;
    solarCumulative: number;
  }>;
}

export function calculateBreakEven(params: BreakEvenParams): BreakEvenResult {
  const dailyRunHours = Math.max(0, params.dailyRunHours);
  const fuelPrice = Math.max(0, params.fuelPricePerLitre);
  const lph = Math.max(0, params.litresPerHour);
  const servicingCph = Math.max(0, params.servicingCostPerHour);
  const solarCost = Math.max(0, params.solarSystemCostNaira);
  const batteryCost = Math.max(0, params.batteryReplacementCostNaira);
  const batteryYears = Math.max(1, params.batteryYearsLife);
  const horizonYears = Math.max(1, params.horizonYears ?? 5);

  const dailyFuelLitres = dailyRunHours * lph;
  const dailyFuelCostNaira = dailyFuelLitres * fuelPrice;
  const dailyServicingCostNaira = dailyRunHours * servicingCph;
  const dailyTotalCostNaira = dailyFuelCostNaira + dailyServicingCostNaira;

  const monthlyGeneratorCostNaira = Math.round(dailyTotalCostNaira * 30);
  const annualGeneratorCostNaira = Math.round(dailyTotalCostNaira * 365);

  const annualSolarMaintenanceNaira = Math.round(batteryCost / batteryYears);
  const monthlySolarEquivalentNaira = Math.round(annualSolarMaintenanceNaira / 12);

  const monthlySavingsNaira = monthlyGeneratorCostNaira - monthlySolarEquivalentNaira;
  const annualSavingsNaira = annualGeneratorCostNaira - annualSolarMaintenanceNaira;

  let paybackMonths: number | null = null;
  let paybackYears: number | null = null;

  if (monthlySavingsNaira > 0 && solarCost > 0) {
    paybackMonths = Math.ceil(solarCost / monthlySavingsNaira);
    paybackYears = Number((paybackMonths / 12).toFixed(1));
  } else if (solarCost === 0) {
    paybackMonths = 0;
    paybackYears = 0;
  }

  const totalMonths = horizonYears * 12;
  const timeline: BreakEvenResult["timeline"] = [];
  let crossoverMonth: number | null = null;

  for (let m = 1; m <= totalMonths; m++) {
    const genCumulative = m * monthlyGeneratorCostNaira;
    const solarCumulative = solarCost + (m * monthlySolarEquivalentNaira);

    if (crossoverMonth === null && genCumulative >= solarCumulative) {
      crossoverMonth = m;
    }

    if (m % 3 === 0 || m === 1 || m === totalMonths) {
      timeline.push({
        month: m,
        year: Number((m / 12).toFixed(1)),
        generatorCumulative: Math.round(genCumulative),
        solarCumulative: Math.round(solarCumulative),
      });
    }
  }

  const cumulative5YearGenNaira = horizonYears * annualGeneratorCostNaira;
  const cumulative5YearSolarNaira = solarCost + (horizonYears * annualSolarMaintenanceNaira);
  const net5YearSavingsNaira = cumulative5YearGenNaira - cumulative5YearSolarNaira;

  return {
    dailyRunHours,
    fuelPricePerLitre: fuelPrice,
    litresPerHour: lph,
    servicingCostPerHour: servicingCph,
    dailyFuelLitres: Number(dailyFuelLitres.toFixed(2)),
    dailyFuelCostNaira: Math.round(dailyFuelCostNaira),
    dailyServicingCostNaira: Math.round(dailyServicingCostNaira),
    dailyTotalCostNaira: Math.round(dailyTotalCostNaira),
    monthlyGeneratorCostNaira,
    annualGeneratorCostNaira,
    solarSystemCostNaira: solarCost,
    batteryReplacementCostNaira: batteryCost,
    batteryYearsLife: batteryYears,
    annualSolarMaintenanceNaira,
    monthlySolarEquivalentNaira,
    monthlySavingsNaira,
    annualSavingsNaira,
    paybackMonths,
    paybackYears,
    horizonYears,
    cumulative5YearGenNaira,
    cumulative5YearSolarNaira,
    net5YearSavingsNaira,
    crossoverMonth,
    timeline,
  };
}

export interface VarianceCalculationParams {
  litresBought: number;
  hoursLight: number;
  hoursTypical: number;
  hoursHeavy: number;
  litresPerHourLight: number;
  litresPerHourTypical: number;
  litresPerHourHeavy: number;
  tolerancePct?: number;
  avgPricePerLitre?: number;
}

export interface VarianceCalculationResult {
  litresBought: number;
  litresExpected: number;
  varianceLitres: number;
  variancePct: number;
  estimatedNairaImpact: number;
  isFlagged: boolean;
  type: "excess_fuel" | "missing_hours" | "consistent";
}

export function calculateVariance(params: VarianceCalculationParams): VarianceCalculationResult {
  const tolerance = params.tolerancePct ?? 15;
  const avgPrice = params.avgPricePerLitre && params.avgPricePerLitre > 0 ? params.avgPricePerLitre : 1350;

  const expected = (params.hoursLight * params.litresPerHourLight) +
    (params.hoursTypical * params.litresPerHourTypical) +
    (params.hoursHeavy * params.litresPerHourHeavy);

  const roundedExpected = Number(expected.toFixed(2));
  const roundedBought = Number(params.litresBought.toFixed(2));
  const varianceLitres = Number((roundedBought - roundedExpected).toFixed(2));

  let variancePct = 0;
  if (roundedExpected > 0) {
    variancePct = Number(((varianceLitres / roundedExpected) * 100).toFixed(1));
  } else if (roundedBought > 0) {
    variancePct = 100;
  }

  const estimatedNairaImpact = Math.round(varianceLitres * avgPrice);

  let type: "excess_fuel" | "missing_hours" | "consistent" = "consistent";
  let isFlagged = false;

  if (variancePct > tolerance) {
    isFlagged = true;
    type = "excess_fuel";
  } else if (variancePct < -tolerance) {
    isFlagged = true;
    type = "missing_hours";
  }

  return {
    litresBought: roundedBought,
    litresExpected: roundedExpected,
    varianceLitres,
    variancePct,
    estimatedNairaImpact,
    isFlagged,
    type,
  };
}

/**
 * Returns YYYY-MM-DD for the Monday of the week containing the given date string or Date object.
 */
export function getWeekStartMonday(dateInput?: string | Date): string {
  const date = dateInput ? (typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput.getTime())) : new Date();
  // Adjust for local timezone/UTC
  const day = date.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return monday.toISOString().split("T")[0] || "";
}

/**
 * Returns today's date in Lagos time (WAT = UTC+1) as YYYY-MM-DD
 */
export function getLagosToday(): string {
  const now = new Date();
  // WAT is UTC+1
  const lagosOffsetMs = 1 * 60 * 60 * 1000;
  const lagosDate = new Date(now.getTime() + lagosOffsetMs);
  return lagosDate.toISOString().split("T")[0] || "";
}

/**
 * Formats a number as Nigerian Naira (NGN)
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
