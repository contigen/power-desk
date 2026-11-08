import { describe, it, expect } from "vitest";
import { calculateBreakEven, calculateVariance, getWeekStartMonday } from "../server/lib/calculations";

describe("Variance Math", () => {
  const defaultBands = {
    litresPerHourLight: 0.9,
    litresPerHourTypical: 1.2,
    litresPerHourHeavy: 1.5,
  };

  it("calculates exact match with zero variance", () => {
    // 10 typical hours = 12L expected. 12L bought.
    const res = calculateVariance({
      litresBought: 12,
      hoursLight: 0,
      hoursTypical: 10,
      hoursHeavy: 0,
      ...defaultBands,
      tolerancePct: 15,
      avgPricePerLitre: 1300,
    });

    expect(res.litresExpected).toBe(12);
    expect(res.varianceLitres).toBe(0);
    expect(res.variancePct).toBe(0);
    expect(res.isFlagged).toBe(false);
    expect(res.type).toBe("consistent");
  });

  it("handles tolerance boundary (15%) correctly", () => {
    // Expected: 20L
    // At exactly +15% (23L): not flagged (> tolerance is required)
    const atBoundary = calculateVariance({
      litresBought: 23,
      hoursLight: 0,
      hoursTypical: 16.6667, // ~20L
      hoursHeavy: 0,
      ...defaultBands,
      tolerancePct: 15,
      avgPricePerLitre: 1300,
    });
    expect(atBoundary.variancePct).toBeCloseTo(15, 0);

    // Over tolerance: 25L bought vs 20L expected (+25%) -> Flagged excess_fuel
    const overBoundary = calculateVariance({
      litresBought: 25,
      hoursLight: 0,
      hoursTypical: 16.6667,
      hoursHeavy: 0,
      ...defaultBands,
      tolerancePct: 15,
      avgPricePerLitre: 1300,
    });
    expect(overBoundary.isFlagged).toBe(true);
    expect(overBoundary.type).toBe("excess_fuel");
    expect(overBoundary.varianceLitres).toBeCloseTo(5, 0);
    expect(overBoundary.estimatedNairaImpact).toBeGreaterThan(0);
  });

  it("detects missing run hours when fuel bought is far less than expected burn", () => {
    // Expected: 40L, Bought: 20L (-50%) -> Flagged missing_hours
    const missingRun = calculateVariance({
      litresBought: 20,
      hoursLight: 0,
      hoursTypical: 33.3333,
      hoursHeavy: 0,
      ...defaultBands,
      tolerancePct: 15,
      avgPricePerLitre: 1300,
    });
    expect(missingRun.isFlagged).toBe(true);
    expect(missingRun.type).toBe("missing_hours");
    expect(missingRun.varianceLitres).toBeLessThan(0);
  });

  it("handles zero run-hours with fuel purchase cleanly", () => {
    const zeroRun = calculateVariance({
      litresBought: 30,
      hoursLight: 0,
      hoursTypical: 0,
      hoursHeavy: 0,
      ...defaultBands,
      tolerancePct: 15,
      avgPricePerLitre: 1300,
    });
    expect(zeroRun.litresExpected).toBe(0);
    expect(zeroRun.varianceLitres).toBe(30);
    expect(zeroRun.variancePct).toBe(100);
    expect(zeroRun.isFlagged).toBe(true);
  });

  it("handles multi-band hours calculation accurately", () => {
    // 10h light (9L) + 20h typical (24L) + 10h heavy (15L) = 48L expected
    const multiBand = calculateVariance({
      litresBought: 50,
      hoursLight: 10,
      hoursTypical: 20,
      hoursHeavy: 10,
      ...defaultBands,
      tolerancePct: 15,
      avgPricePerLitre: 1400,
    });
    expect(multiBand.litresExpected).toBe(48);
    expect(multiBand.varianceLitres).toBe(2);
    expect(multiBand.variancePct).toBeCloseTo(4.2, 1);
    expect(multiBand.isFlagged).toBe(false);
  });
});

describe("Break-Even Math", () => {
  it("computes payback months and 5-year comparison correctly", () => {
    // 6h/day, 1.2 L/h @ N1,350/L, N350 servicing/h
    // Daily fuel: 7.2L * 1350 = N9,720
    // Daily servicing: 6 * 350 = N2,100
    // Daily total: N11,820
    // Monthly generator (30 days): N354,600
    // Solar cost: N3,500,000. Battery: N1,200,000 / 4 yrs = N300,000/yr = N25,000/mo
    // Monthly savings: N354,600 - N25,000 = N329,600
    // Payback: ceil(3,500,000 / 329,600) = 11 months!
    const result = calculateBreakEven({
      dailyRunHours: 6,
      fuelPricePerLitre: 1350,
      litresPerHour: 1.2,
      servicingCostPerHour: 350,
      solarSystemCostNaira: 3500000,
      batteryReplacementCostNaira: 1200000,
      batteryYearsLife: 4,
      horizonYears: 5,
    });

    expect(result.dailyFuelLitres).toBe(7.2);
    expect(result.dailyTotalCostNaira).toBe(11820);
    expect(result.monthlyGeneratorCostNaira).toBe(354600);
    expect(result.monthlySolarEquivalentNaira).toBe(25000);
    expect(result.monthlySavingsNaira).toBe(329600);
    expect(result.paybackMonths).toBe(11);
    expect(result.paybackYears).toBeCloseTo(0.9, 1);
    expect(result.net5YearSavingsNaira).toBeGreaterThan(15000000);
    expect(result.crossoverMonth).toBeLessThanOrEqual(11);
  });

  it("handles zero fuel price edge case gracefully without crashing or dividing by zero", () => {
    const zeroFuel = calculateBreakEven({
      dailyRunHours: 6,
      fuelPricePerLitre: 0,
      litresPerHour: 1.2,
      servicingCostPerHour: 0,
      solarSystemCostNaira: 2000000,
      batteryReplacementCostNaira: 500000,
      batteryYearsLife: 4,
      horizonYears: 5,
    });

    expect(zeroFuel.monthlyGeneratorCostNaira).toBe(0);
    expect(zeroFuel.monthlySavingsNaira).toBeLessThan(0);
    expect(zeroFuel.paybackMonths).toBeNull();
  });

  it("handles zero solar system cost edge case", () => {
    const freeSolar = calculateBreakEven({
      dailyRunHours: 4,
      fuelPricePerLitre: 1300,
      litresPerHour: 1.0,
      servicingCostPerHour: 200,
      solarSystemCostNaira: 0,
      batteryReplacementCostNaira: 0,
      batteryYearsLife: 5,
    });

    expect(freeSolar.paybackMonths).toBe(0);
  });
});

describe("Date Helpers", () => {
  it("determines Monday of week correctly for various dates", () => {
    // 2026-11-08 is a Sunday -> Monday was 2026-11-02
    expect(getWeekStartMonday("2026-11-08")).toBe("2026-11-02");
    // 2026-11-02 is a Monday -> Monday is 2026-11-02
    expect(getWeekStartMonday("2026-11-02")).toBe("2026-11-02");
    // 2026-11-04 is a Wednesday -> Monday is 2026-11-02
    expect(getWeekStartMonday("2026-11-04")).toBe("2026-11-02");
  });
});
