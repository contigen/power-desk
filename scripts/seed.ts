import { getDb, businesses, generators, fuelEntries, runEntries, varianceFlags, settings, solarQuotes } from "../server/db/index.js";
import { ensureTables } from "../server/db/init.js";
import { eq, and, like } from "drizzle-orm";

export async function runSeed() {
  console.log("Ensuring database tables exist...");
  await ensureTables();
  const db = getDb();
  console.log("Starting idempotent seed for Power Desk...");

  // 1. Wipe only sample rows
  try {
    await db.delete(fuelEntries).where(eq(fuelEntries.isSample, true));
    await db.delete(runEntries).where(eq(runEntries.isSample, true));
    await db.delete(varianceFlags).where(like(varianceFlags.id, "flag-sample-%"));
    await db.delete(solarQuotes).where(eq(solarQuotes.businessId, "biz-sample-adewale"));
    await db.delete(generators).where(eq(generators.businessId, "biz-sample-adewale"));
    await db.delete(settings).where(eq(settings.businessId, "biz-sample-adewale"));
    await db.delete(businesses).where(eq(businesses.id, "biz-sample-adewale"));
  } catch (err) {
    console.log("Notice: cleanup encountered table state:", (err as Error).message);
  }

  const nowIso = new Date().toISOString();

  // 2. Insert sample business
  await db.insert(businesses).values({
    id: "biz-sample-adewale",
    name: "Sample: Adewale Provisions Store, Lagos",
    location: "Mushin Market, Lagos State",
    isSample: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 3. Insert generators
  // Gen A: 3.2 kVA petrol set (GE 3500 KBM spec anchor: 1.2 L/h @ 75% load, 4L tank)
  await db.insert(generators).values([
    {
      id: "gen-sample-a",
      businessId: "biz-sample-adewale",
      name: "Gen A (3.2 kVA Maxima GE3500)",
      fuelType: "petrol",
      kva: 3.2,
      litresPerHourLight: 0.9,
      litresPerHourTypical: 1.2,
      litresPerHourHeavy: 1.5,
      tankLitres: 4.0,
      servicingCostPerHour: 350,
      installDate: "2025-02-01",
      isSample: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "gen-sample-b",
      businessId: "biz-sample-adewale",
      name: "Gen B (2.5 kVA Backup Firman SPG3000)",
      fuelType: "petrol",
      kva: 2.5,
      litresPerHourLight: 0.7,
      litresPerHourTypical: 0.9,
      litresPerHourHeavy: 1.2,
      tankLitres: 3.0,
      servicingCostPerHour: 300,
      installDate: "2025-06-15",
      isSample: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);

  // 4. Insert Settings
  await db.insert(settings).values({
    id: "settings-sample-adewale",
    businessId: "biz-sample-adewale",
    tolerancePct: 15,
    currency: "NGN",
    showSampleData: true,
    weeklySummaryDay: "Sunday",
    weeklySummaryTime: "18:00",
    telegramChatId: null,
    allowedChatIds: "",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 5. Insert Solar Quotes
  await db.insert(solarQuotes).values([
    {
      id: "solar-quote-1",
      businessId: "biz-sample-adewale",
      label: "5kVA Commercial Hybrid (4x 550W Mono + 5.12kWh LiFePO4)",
      systemCostNaira: 4200000,
      expectedYearsLife: 10,
      batteryReplacementCostNaira: 1400000,
      batteryYearsLife: 5,
      notes: "Sized to run 2 display coolers, chest freezer, lighting, CCTV, POS from 8am to 8pm.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "solar-quote-2",
      businessId: "biz-sample-adewale",
      label: "3.5kVA Essential Daytime (2x 550W + 2.56kWh Lithium)",
      systemCostNaira: 2600000,
      expectedYearsLife: 8,
      batteryReplacementCostNaira: 850000,
      batteryYearsLife: 4,
      notes: "Powers daytime shop lighting, fans, cash register, and 1 light drink cooler.",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);

  // 6. Generate 30 days of fuel and run entries (from Oct 10, 2026 to Nov 8, 2026)
  // Prices: drifting between N1,220 and N1,520 (matching NBS and Lagos retail benchmarks)
  const baseDate = new Date("2026-10-10T10:00:00Z");

  const fuelRows = [];
  const runRows = [];

  // Seed data simulation: 30 days (Oct 10, 2026 to Nov 8, 2026)
  // Calibrated benchmarks:
  // Week 1 (Oct 12-18): Benign explained flag (+20.8% variance, 50L bought vs 41.4L expected)
  // Week 2 (Oct 19-25): Consistent (~0% variance, 45L bought vs 45.0L expected)
  // Week 3 (Oct 26-Nov 1): Unexplained variance (+29.9% variance, 60L bought vs 46.2L expected, open flag)
  // Week 4 (Nov 2-Nov 8): Consistent (~0.4% variance, 50L bought vs 49.8L expected)

  let fuelCounter = 1;
  let runCounter = 1;

  function getHoursA(d: number): number {
    if (d >= 2 && d <= 8) {
      const w1 = [5.0, 4.5, 5.5, 4.5, 5.0, 5.0, 5.0];
      return w1[d - 2] ?? 5.0;
    }
    if (d >= 9 && d <= 15) {
      const w2 = [5.5, 5.0, 5.5, 5.5, 5.5, 5.0, 5.5];
      return w2[d - 9] ?? 5.5;
    }
    if (d >= 16 && d <= 22) {
      const w3 = [5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5];
      return w3[d - 16] ?? 5.5;
    }
    if (d >= 23 && d <= 29) {
      const w4 = [6.0, 6.0, 6.0, 6.0, 6.0, 5.5, 6.0];
      return w4[d - 23] ?? 6.0;
    }
    return 5.5;
  }

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const curDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = curDate.toISOString().split("T")[0] || "";

    // Gen A runs daily
    const hoursA = getHoursA(dayOffset);
    let bandA: "light" | "typical" | "heavy" = "typical";
    if (dayOffset === 5 || dayOffset === 20) bandA = "heavy";
    if (dayOffset === 3 || dayOffset === 17) bandA = "light";

    runRows.push({
      id: `run-sample-a-${runCounter++}`,
      generatorId: "gen-sample-a",
      date: dateStr,
      hours: hoursA,
      loadBand: bandA,
      source: "seed",
      note: bandA === "heavy" ? "Heavy freezer cooling day" : (bandA === "light" ? "Rainy day, cooler off" : null),
      isSample: true,
      createdAt: curDate.toISOString(),
      updatedAt: curDate.toISOString(),
    });

    // Gen B runs on day 6 and day 20 during Gen A maintenance
    if (dayOffset === 6 || dayOffset === 20) {
      const hoursB = 3.0;
      runRows.push({
        id: `run-sample-b-${runCounter++}`,
        generatorId: "gen-sample-b",
        date: dateStr,
        hours: hoursB,
        loadBand: "typical",
        source: "seed",
        note: "Gen A oil change service window",
        isSample: true,
        createdAt: curDate.toISOString(),
        updatedAt: curDate.toISOString(),
      });

      // Refuel for Gen B
      fuelRows.push({
        id: `fuel-sample-b-${fuelCounter++}`,
        generatorId: "gen-sample-b",
        date: dateStr,
        litres: 3.0,
        pricePerLitre: 1320,
        totalCost: 3.0 * 1320,
        supplier: "TotalEnergies Mushin",
        source: "seed",
        receiptUploadId: null,
        note: "Firman backup tank top-up (3L)",
        isSample: true,
        createdAt: curDate.toISOString(),
        updatedAt: curDate.toISOString(),
      });
    }

    // Fuel purchases for Gen A
    // Pump price drifts between 1250 and 1490 NGN/L
    let litresA = 0;
    if (dayOffset === 0) litresA = 20;
    if (dayOffset === 3) litresA = 25;
    if (dayOffset === 6) litresA = 25;
    if (dayOffset === 9) litresA = 25;
    if (dayOffset === 13) litresA = 20;
    if (dayOffset === 17) litresA = 30;
    if (dayOffset === 20) litresA = 30;
    if (dayOffset === 24) litresA = 25;
    if (dayOffset === 27) litresA = 25;

    if (litresA > 0) {
      const pricePerLitre = 1250 + ((dayOffset * 17) % 240); // 1250 - 1490
      const totalCost = litresA * pricePerLitre;

      fuelRows.push({
        id: `fuel-sample-a-${fuelCounter++}`,
        generatorId: "gen-sample-a",
        date: dateStr,
        litres: litresA,
        pricePerLitre: pricePerLitre,
        totalCost: totalCost,
        supplier: dayOffset % 2 === 0 ? "TotalEnergies Mushin" : "NNPC Retail Agege Motor Rd",
        source: "seed",
        receiptUploadId: null,
        note: `Jerrycan refuel (${litresA}L)`,
        isSample: true,
        createdAt: curDate.toISOString(),
        updatedAt: curDate.toISOString(),
      });
    }
  }

  // Insert fuel and run entries in chunks
  for (const f of fuelRows) {
    await db.insert(fuelEntries).values(f);
  }
  for (const r of runRows) {
    await db.insert(runEntries).values(r);
  }

  // 7. Insert the two variance flags:
  // Week 1 (Oct 12, 2026): Explained flag
  await db.insert(varianceFlags).values({
    id: "flag-sample-oct12",
    generatorId: "gen-sample-a",
    weekStart: "2026-10-12",
    litresBought: 50.0,
    litresExpected: 41.4,
    varianceLitres: 8.6,
    variancePct: 20.8,
    estimatedNairaImpact: 8.6 * 1280,
    status: "explained",
    explanation: "Refilled 2x 25L jerrycans for weekend reserve before expected fuel queue; 8.6L remaining in jerrycans carried into next week.",
    createdAt: "2026-10-18T20:00:00Z",
    updatedAt: "2026-10-19T08:30:00Z",
  });

  // Week 3 (Oct 26, 2026): Open unexplained variance flag
  await db.insert(varianceFlags).values({
    id: "flag-sample-oct26",
    generatorId: "gen-sample-a",
    weekStart: "2026-10-26",
    litresBought: 60.0,
    litresExpected: 46.2,
    varianceLitres: 13.8,
    variancePct: 29.9,
    estimatedNairaImpact: 13.8 * 1380,
    status: "open",
    explanation: null,
    createdAt: "2026-11-01T20:00:00Z",
    updatedAt: "2026-11-01T20:00:00Z",
  });

  console.log(`Seed complete! Seeded:
  - 1 business ("Sample: Adewale Provisions Store, Lagos")
  - 2 generators (Gen A 3.2kVA, Gen B 2.5kVA)
  - 2 solar quotes
  - ${fuelRows.length} fuel entries
  - ${runRows.length} run entries
  - 2 variance flags (1 open, 1 explained)`);
}

const scriptPath = process.argv[1] || "";
if (import.meta.url.endsWith(scriptPath) || scriptPath.endsWith("seed.ts")) {
  runSeed().then(() => process.exit(0)).catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
}
