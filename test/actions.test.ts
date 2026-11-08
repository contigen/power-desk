import { describe, it, expect } from "vitest";
import logFuelAction from "../actions/log-fuel.js";
import logRunAction from "../actions/log-run.js";

describe("Action Input Validation", () => {
  it("rejects negative litres in log-fuel", () => {
    const parse = logFuelAction.schema.safeParse({
      litres: -5,
      pricePerLitre: 1300,
    });
    expect(parse.success).toBe(false);
  });

  it("rejects litres above 200 in log-fuel", () => {
    const parse = logFuelAction.schema.safeParse({
      litres: 250,
      pricePerLitre: 1300,
    });
    expect(parse.success).toBe(false);
  });

  it("accepts a 20L jerrycan purchase even when generator tank is only 4L", () => {
    // Owners buy in 10-25L jerrycans for storage and periodic topping up
    const parse = logFuelAction.schema.safeParse({
      litres: 20,
      pricePerLitre: 1350,
      generator: "Gen A",
      note: "Bought in yellow jerrycan",
    });
    expect(parse.success).toBe(true);
    if (parse.success) {
      expect(parse.data.litres).toBe(20);
      expect(parse.data.pricePerLitre).toBe(1350);
    }
  });

  it("rejects unrealistic pump price below N100/L", () => {
    const parse = logFuelAction.schema.safeParse({
      litres: 10,
      pricePerLitre: 50,
    });
    expect(parse.success).toBe(false);
  });

  it("rejects negative run hours in log-run", () => {
    const parse = logRunAction.schema.safeParse({
      hours: -2,
    });
    expect(parse.success).toBe(false);
  });

  it("rejects run hours exceeding 24h per day in log-run", () => {
    const parse = logRunAction.schema.safeParse({
      hours: 25,
    });
    expect(parse.success).toBe(false);
  });

  it("accepts valid run hours and defaults loadBand to typical", () => {
    const parse = logRunAction.schema.safeParse({
      hours: 7.5,
    });
    expect(parse.success).toBe(true);
    if (parse.success) {
      expect(parse.data.hours).toBe(7.5);
      expect(parse.data.loadBand).toBe("typical");
    }
  });
});

export interface NLMappingFixture {
  id: number;
  message: string;
  expectedAction: "log-fuel" | "log-run" | "check-variance" | "break-even" | "undo-last-entry" | "weekly-summary";
  expectedParams: Record<string, any>;
  notes: string;
}

export const NL_MAPPING_FIXTURES: NLMappingFixture[] = [
  {
    id: 1,
    message: "bought 40L at 1250, gen ran 6h",
    expectedAction: "log-fuel",
    expectedParams: { litres: 40, pricePerLitre: 1250 },
    notes: "Compound message: parses fuel first, then run entry",
  },
  {
    id: 2,
    message: "I buy 25 litre for 1320",
    expectedAction: "log-fuel",
    expectedParams: { litres: 25, pricePerLitre: 1320 },
    notes: "Pidgin/informal: 25L @ 1320 NGN",
  },
  {
    id: 3,
    message: "gen ran like 6 hours today",
    expectedAction: "log-run",
    expectedParams: { hours: 6, loadBand: "typical" },
    notes: "Informal run hours",
  },
  {
    id: 4,
    message: "just fill 20L @ 1450 at Total station",
    expectedAction: "log-fuel",
    expectedParams: { litres: 20, pricePerLitre: 1450, supplier: "Total" },
    notes: "Includes filling station",
  },
  {
    id: 5,
    message: "Gen B ran 4 hrs heavy load for cold room",
    expectedAction: "log-run",
    expectedParams: { generator: "Gen B", hours: 4, loadBand: "heavy" },
    notes: "Explicit generator B and heavy load",
  },
  {
    id: 6,
    message: "we put 50 liters today at 1300 per liter",
    expectedAction: "log-fuel",
    expectedParams: { litres: 50, pricePerLitre: 1300 },
    notes: "Plural / spelling: liters",
  },
  {
    id: 7,
    message: "gen A worked 8.5 hours",
    expectedAction: "log-run",
    expectedParams: { generator: "Gen A", hours: 8.5 },
    notes: "Decimal hours on Gen A",
  },
  {
    id: 8,
    message: "is anything off this week?",
    expectedAction: "check-variance",
    expectedParams: {},
    notes: "Variance review question",
  },
  {
    id: 9,
    message: "why is the fuel high?",
    expectedAction: "check-variance",
    expectedParams: {},
    notes: "Contextual variance inquiry",
  },
  {
    id: 10,
    message: "is solar worth it?",
    expectedAction: "break-even",
    expectedParams: {},
    notes: "Triggers break-even calculation / Generative UI",
  },
  {
    id: 11,
    message: "when does solar pay back for my shop?",
    expectedAction: "break-even",
    expectedParams: {},
    notes: "Solar payback question",
  },
  {
    id: 12,
    message: "send weekly summary",
    expectedAction: "weekly-summary",
    expectedParams: {},
    notes: "Weekly rollup request",
  },
  {
    id: 13,
    message: "/undo",
    expectedAction: "undo-last-entry",
    expectedParams: { confirm: true },
    notes: "Undo command",
  },
  {
    id: 14,
    message: "mistake in last entry, please undo",
    expectedAction: "undo-last-entry",
    expectedParams: { confirm: true },
    notes: "Natural language undo",
  },
  {
    id: 15,
    message: "15L petrol 1400",
    expectedAction: "log-fuel",
    expectedParams: { litres: 15, pricePerLitre: 1400 },
    notes: "Extremely concise receipt log",
  },
  {
    id: 16,
    message: "light load 3 hours yesterday",
    expectedAction: "log-run",
    expectedParams: { hours: 3, loadBand: "light" },
    notes: "Light band specification",
  },
  {
    id: 17,
    message: "bought fuel 30 litres 1350 naira NNPC",
    expectedAction: "log-fuel",
    expectedParams: { litres: 30, pricePerLitre: 1350, supplier: "NNPC" },
    notes: "Currency keyword in text",
  },
  {
    id: 18,
    message: "gen ran from 10am to 4pm",
    expectedAction: "log-run",
    expectedParams: { hours: 6 },
    notes: "Time window parsing (6 hours)",
  },
  {
    id: 19,
    message: "bought 2 big jerry cans (50L) for 1380/L",
    expectedAction: "log-fuel",
    expectedParams: { litres: 50, pricePerLitre: 1380 },
    notes: "Nigerian jerrycan context (2x 25L = 50L)",
  },
  {
    id: 20,
    message: "how much did we spend on fuel this week?",
    expectedAction: "weekly-summary",
    expectedParams: {},
    notes: "Spend inquiry mapped to weekly summary",
  },
];

describe("Natural-Language Mapping Fixtures", () => {
  it("contains 20 verified conversational fixtures covering Nigerian SME generator workflows", () => {
    expect(NL_MAPPING_FIXTURES.length).toBe(20);
    for (const fixture of NL_MAPPING_FIXTURES) {
      expect(fixture.message.length).toBeGreaterThan(0);
      expect(fixture.expectedAction).toBeDefined();
    }
  });
});
