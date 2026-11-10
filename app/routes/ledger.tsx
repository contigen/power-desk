import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useActionQuery, useActionMutation } from "@agent-native/core/client/hooks";
import { formatNaira, formatNumber } from "@/lib/utils";
import {
  IconGasStation,
  IconClock,
  IconDownload,
  IconArrowBackUp,
  IconSearch,
  IconX,
} from "@tabler/icons-react";

type GeneratorItem = {
  id: string;
  name: string;
  kva: number;
};

type LedgerEntry = {
  id: string;
  type: "fuel" | "run";
  generatorId: string;
  generatorName: string;
  date: string;
  litres?: number;
  pricePerLitre?: number;
  totalCostNaira?: number;
  supplier?: string | null;
  hours?: number;
  loadBand?: string;
  expectedLitres?: number;
  note?: string | null;
  source: string;
  isSample: boolean;
  createdAt: string;
};

type LedgerSummary = {
  totalLitres?: number;
  totalSpendNaira?: number;
  totalFuelSpend?: number;
  totalRunHours?: number;
  averagePricePerLitre?: number;
  costPerRunHour?: number;
  fuelCount?: number;
  runCount?: number;
};

export function meta() {
  return [
    { title: "Ledger - Power Desk" },
    {
      name: "description",
      content: "Chronological operational ledger of fuel purchases and generator run-time records.",
    },
  ];
}

export default function LedgerRoute() {
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const [selectedGenId, setSelectedGenId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [undoDialogOpen, setUndoDialogOpen] = useState<boolean>(false);

  const { data: ledgerData, refetch } = useActionQuery(
    "get-ledger",
    {
      range,
      generatorId: selectedGenId !== "all" ? selectedGenId : undefined,
    },
    { staleTime: 0, refetchInterval: 2000, refetchIntervalInBackground: true }
  );

  useEffect(() => {
    const timer = setInterval(() => {
      refetch();
    }, 2500);
    return () => clearInterval(timer);
  }, [refetch]);

  const { data: genData } = useActionQuery("list-generators", {}, { refetchInterval: 10000 });
  const generators: readonly GeneratorItem[] = (genData?.generators ?? []) as unknown as readonly GeneratorItem[];

  const { mutate: undoLast, isPending: isUndoing } = useActionMutation("undo-last-entry");

  const summary = (ledgerData?.summary ?? {}) as LedgerSummary;
  const rawEntries = (ledgerData?.entries ?? []) as unknown as readonly LedgerEntry[];

  const filteredEntries = rawEntries.filter((entry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const genMatch = (entry.generatorName ?? "").toLowerCase().includes(q);
    const supplierMatch = (entry.supplier ?? "").toLowerCase().includes(q);
    const notesMatch = (entry.note ?? "").toLowerCase().includes(q);
    return genMatch || supplierMatch || notesMatch;
  });

  function handleExportCsv() {
    const rows = [
      ["Type", "Date", "Generator", "Litres / Hours", "Rate (NGN)", "Total (NGN)", "Supplier / Band", "Source", "Sample Data"],
      ...filteredEntries.map((e) => [
        e.type,
        e.date,
        e.generatorName ?? "",
        e.type === "fuel" ? String(e.litres ?? "") : String(e.hours ?? ""),
        e.type === "fuel" ? String(e.pricePerLitre ?? "") : "",
        e.type === "fuel" ? String(e.totalCostNaira ?? "") : "",
        e.type === "fuel" ? (e.supplier ?? "") : (e.loadBand ?? ""),
        e.source ?? "web",
        e.isSample ? "true" : "false",
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `power-desk-ledger-${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleConfirmUndo() {
    undoLast(
      { confirm: true },
      {
        onSuccess: () => {
          setUndoDialogOpen(false);
          refetch();
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6 font-mono text-neutral-100">
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-900 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">fuel & runtime ledger</h1>
          <p className="mt-0.5 text-xs text-neutral-400">
            chronological purchases and run sessions · {filteredEntries.length} records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-600 hover:text-white"
          >
            <IconDownload className="size-3.5" />
            <span>export csv</span>
          </button>

          <button
            type="button"
            onClick={() => setUndoDialogOpen(true)}
            className="flex items-center gap-1.5 border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
          >
            <IconArrowBackUp className="size-3.5" />
            <span>undo last</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">total fuel</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {formatNumber(summary.totalLitres ?? 0, 1)} L
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            {summary.fuelCount ?? 0} purchases
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">total spend</span>
          <div className="mt-2 text-xl font-bold text-sky-400 sm:text-2xl">
            {formatNaira(summary.totalSpendNaira ?? summary.totalFuelSpend ?? 0)}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            avg {formatNaira(summary.averagePricePerLitre ?? 1320)}/L
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">generator runtime</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {formatNumber(summary.totalRunHours ?? 0, 1)} hrs
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            {summary.runCount ?? 0} recorded sessions
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">cost per run-hour</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {formatNaira(summary.costPerRunHour ?? 3246)}/h
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            fuel burn + hourly servicing
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 border border-neutral-900 bg-neutral-950 p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          {(["7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
                range === r
                  ? "border border-neutral-700 bg-neutral-900 font-semibold text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex flex-1 items-center gap-3 sm:max-w-md sm:justify-end">
          <select
            value={selectedGenId}
            onChange={(e) => setSelectedGenId(e.target.value)}
            className="border border-neutral-800 bg-black px-2.5 py-1 text-xs text-neutral-300 outline-none"
          >
            <option value="all">all generators</option>
            {generators.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <IconSearch className="absolute left-2.5 top-2 size-3.5 text-neutral-500" />
            <input
              type="text"
              placeholder="search supplier, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-neutral-800 bg-black py-1 pl-8 pr-3 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-neutral-600"
            />
          </div>
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950">
        <div className="border-b border-neutral-900 px-4 py-3">
          <span className="text-xs uppercase tracking-wider text-neutral-500">entries</span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            no ledger entries match the selected filters.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-900 text-xs">
            {filteredEntries.map((entry) => {
              const isFuel = entry.type === "fuel";
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="flex cursor-pointer flex-col justify-between gap-2 p-4 transition-colors hover:bg-neutral-900/40 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isFuel ? (
                        <IconGasStation className="size-4 text-sky-400" />
                      ) : (
                        <IconClock className="size-4 text-neutral-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-200">
                          {isFuel ? `${entry.litres}L fuel purchase` : `${entry.hours}h runtime session`}
                        </span>
                        <span className="text-neutral-500">·</span>
                        <span className="text-neutral-400">{entry.generatorName ?? "Gen A"}</span>
                        {entry.isSample && (
                          <span className="border border-amber-900/60 bg-amber-950/20 px-1 py-0.2 text-[10px] text-amber-400">
                            sample
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 text-[11px] text-neutral-500">
                        {isFuel ? (
                          <>
                            @{formatNaira(entry.pricePerLitre ?? 1280)}/L · {entry.supplier ?? "Station pump"} · {entry.source ?? "web"}
                          </>
                        ) : (
                          <>
                            {entry.loadBand ?? "typical"} load · ~{entry.expectedLitres ?? (entry.hours ? entry.hours * 1.6 : 0).toFixed(1)}L expected burn · {entry.source ?? "web"}
                          </>
                        )}
                        {entry.note && <span className="ml-2 text-neutral-400">"{entry.note}"</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="font-semibold text-neutral-100">
                      {isFuel ? formatNaira(entry.totalCostNaira ?? (entry.litres ?? 0) * (entry.pricePerLitre ?? 0)) : `${entry.hours}h logged`}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {entry.date}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-neutral-800 bg-black p-5 text-xs text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="text-xs uppercase tracking-wider text-neutral-400">
                {selectedEntry.type === "fuel" ? "fuel purchase record" : "generator runtime record"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-neutral-500 hover:text-white"
              >
                <IconX className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">generator</span>
                <span className="text-neutral-200">{selectedEntry.generatorName ?? "Gen A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">date</span>
                <span className="text-neutral-200">{selectedEntry.date}</span>
              </div>
              {selectedEntry.type === "fuel" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">litres bought</span>
                    <span className="text-neutral-200">{selectedEntry.litres} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">price per litre</span>
                    <span className="text-neutral-200">{formatNaira(selectedEntry.pricePerLitre ?? 0)}/L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">total spend</span>
                    <span className="font-semibold text-sky-400">
                      {formatNaira(selectedEntry.totalCostNaira ?? (selectedEntry.litres ?? 0) * (selectedEntry.pricePerLitre ?? 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">supplier</span>
                    <span className="text-neutral-200">{selectedEntry.supplier ?? "Direct purchase"}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">operating hours</span>
                    <span className="text-neutral-200">{selectedEntry.hours} h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">load band</span>
                    <span className="text-neutral-200">{selectedEntry.loadBand ?? "typical"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">expected fuel burn</span>
                    <span className="text-neutral-200">{selectedEntry.expectedLitres ?? "~"} L</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">channel</span>
                <span className="text-neutral-200">{selectedEntry.source ?? "web"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">data classification</span>
                <span className={selectedEntry.isSample ? "text-amber-400" : "text-emerald-400"}>
                  {selectedEntry.isSample ? "sample benchmark (is_sample: true)" : "real user log (is_sample: false)"}
                </span>
              </div>
              {selectedEntry.note && (
                <div className="border-t border-neutral-900 pt-2 text-neutral-400">
                  <span className="text-neutral-500">notes: </span>
                  {selectedEntry.note}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedEntry(null)}
              className="mt-5 w-full border border-neutral-800 bg-neutral-950 py-2 uppercase tracking-wider text-neutral-300 hover:border-neutral-600 hover:text-white"
            >
              close
            </button>
          </div>
        </div>
      )}

      {undoDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-neutral-800 bg-black p-5 text-xs text-neutral-100">
            <span className="text-xs uppercase tracking-wider text-neutral-400">undo latest entry</span>
            <p className="mt-3 text-neutral-300">
              Permanently remove the latest logged fuel purchase or run-time session?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUndoDialogOpen(false)}
                className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-400 hover:text-white"
              >
                cancel
              </button>
              <button
                type="button"
                disabled={isUndoing}
                onClick={handleConfirmUndo}
                className="border border-red-900 bg-red-950/40 px-3 py-1.5 text-red-300 hover:border-red-700 hover:text-white disabled:opacity-50"
              >
                {isUndoing ? "undoing..." : "confirm undo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
