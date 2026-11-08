import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import getLedgerAction from "./get-ledger.js";

export default defineAction({
  description: "Export ledger entries as CSV format for business accounting and bookkeeping records.",
  schema: z.object({
    range: z.enum(["7d", "30d", "all", "custom"]).default("all"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    generatorId: z.string().optional(),
    includeSample: z.boolean().optional(),
  }),
  http: { method: "GET" },
  mcpTool: true,
  publicAgent: {
    expose: true,
    readOnly: true,
    requiresAuth: false,
    isConsequential: false,
    title: "Export Fuel and Run Ledger as CSV",
  },
  run: async (input) => {
    // Re-use getLedger query logic for 100% parity
    const ledger = await getLedgerAction.run(input);

    const headers = [
      "Date",
      "Type",
      "Generator",
      "Litres",
      "Price_Per_Litre_NGN",
      "Total_Cost_NGN",
      "Run_Hours",
      "Load_Band",
      "Supplier",
      "Source",
      "Note",
      "Is_Sample",
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = ledger.entries.map((item) => [
      escapeCsv(item.date),
      escapeCsv(item.type.toUpperCase()),
      escapeCsv(item.generatorName),
      escapeCsv(item.litres ?? ""),
      escapeCsv(item.pricePerLitre ?? ""),
      escapeCsv(item.totalCostNaira ?? ""),
      escapeCsv(item.hours ?? ""),
      escapeCsv(item.loadBand ?? ""),
      escapeCsv(item.supplier ?? ""),
      escapeCsv(item.source),
      escapeCsv(item.note ?? ""),
      escapeCsv(item.isSample ? "TRUE" : "FALSE"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `power-desk-ledger-${input.range}-${new Date().toISOString().split("T")[0]}.csv`;

    return {
      csv: csvContent,
      filename,
      rowCount: rows.length,
      summary: ledger.summary,
    };
  },
});
