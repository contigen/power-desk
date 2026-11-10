import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useActionQuery, useActionMutation } from "@agent-native/core/client/hooks";
import { formatNaira, formatNumber } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconX,
  IconChevronRight,
} from "@tabler/icons-react";

type VarianceFlagItem = {
  id: string;
  generatorId: string;
  generatorName: string;
  weekStart: string;
  litresBought: number;
  litresExpected: number;
  varianceLitres: number;
  variancePct: number;
  estimatedNairaImpact: number;
  status: "open" | "explained" | "dismissed";
  notes?: string;
  explanationReason?: string;
};

type VarianceData = {
  flags?: readonly VarianceFlagItem[];
  openCount?: number;
  resolvedCount?: number;
  tolerancePct?: number;
};

export function meta() {
  return [
    { title: "Variance Review - Power Desk" },
    {
      name: "description",
      content: "Identify and investigate unexplained fuel variance with neutral benign explanation protocols.",
    },
  ];
}

const BENIGN_CAUSES = [
  { id: "jerrycan", label: "Jerrycan reserve (fuel bought and stored for later)" },
  { id: "tank_carryover", label: "Tank carry-over (fuel from prior week remained in tank)" },
  { id: "heavy_load", label: "Heavy load (compressors, refrigeration, deep freezers running)" },
  { id: "unlogged_runtime", label: "Missing run-hours (generator ran without log)" },
] as const;

export default function VarianceRoute() {
  const { data: varianceData, refetch } = useActionQuery(
    "check-variance",
    {},
    { staleTime: 0, refetchInterval: 3000, refetchIntervalInBackground: true }
  );

  useEffect(() => {
    const timer = setInterval(() => {
      refetch();
    }, 2500);
    return () => clearInterval(timer);
  }, [refetch]);
  const { mutate: resolveFlag, isPending: isResolving } = useActionMutation("resolve-variance");

  const [selectedFlag, setSelectedFlag] = useState<VarianceFlagItem | null>(null);
  const [modalStatus, setModalStatus] = useState<"open" | "explained" | "dismissed">("explained");
  const [selectedCause, setSelectedCause] = useState<string>(BENIGN_CAUSES[0].label);
  const [explanationText, setExplanationText] = useState<string>("");

  const data = (varianceData ?? {}) as VarianceData;
  const flags = (data.flags ?? []) as readonly VarianceFlagItem[];
  const openCount = data.openCount ?? flags.filter((f) => f.status === "open").length;
  const resolvedCount = data.resolvedCount ?? flags.filter((f) => f.status !== "open").length;
  const totalImpact = flags
    .filter((f) => f.status === "open")
    .reduce((sum, f) => sum + (f.estimatedNairaImpact ?? 0), 0);

  function handleOpenModal(flag: VarianceFlagItem) {
    setSelectedFlag(flag);
    setModalStatus(flag.status === "open" ? "explained" : flag.status);
    setExplanationText(flag.notes ?? "");
    setSelectedCause(flag.explanationReason ?? BENIGN_CAUSES[0].label);
  }

  function handleResolveSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFlag) return;

    resolveFlag(
      {
        flagId: selectedFlag.id,
        status: modalStatus,
        explanation: `${selectedCause}${explanationText ? `: ${explanationText}` : ""}`,
      },
      {
        onSuccess: () => {
          setSelectedFlag(null);
          refetch();
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6 font-mono text-neutral-100">
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-900 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">unexplained variance review</h1>
          <p className="mt-0.5 text-xs text-neutral-400">
            spotting discrepancies between litres bought and expected burn from logged run-hours
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">open flags</span>
          <div className={`mt-2 text-xl font-bold sm:text-2xl ${openCount > 0 ? "text-amber-400" : "text-neutral-100"}`}>
            {openCount}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            requiring review
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">resolved flags</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {resolvedCount}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            explained or dismissed
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">tolerance threshold</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            ±{data.tolerancePct ?? 10}%
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            generator consumption band
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">potential naira impact</span>
          <div className="mt-2 text-xl font-bold text-sky-400 sm:text-2xl">
            {formatNaira(totalImpact)}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            across open variance flags
          </span>
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950 p-4">
        <span className="text-xs uppercase tracking-wider text-neutral-500">benign explanation protocol</span>
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-neutral-300 sm:grid-cols-2">
          {BENIGN_CAUSES.map((cause, idx) => (
            <div key={cause.id} className="flex items-start gap-2 border border-neutral-900 bg-black/40 p-2.5">
              <span className="font-bold text-neutral-500">{idx + 1}.</span>
              <span>{cause.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950">
        <div className="border-b border-neutral-900 px-4 py-3">
          <span className="text-xs uppercase tracking-wider text-neutral-500">weekly variance flags</span>
        </div>

        {flags.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            no unexplained variance flags detected. consumption is within tolerance.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-900 text-xs">
            {flags.map((flag) => {
              const isOpen = flag.status === "open";
              return (
                <div
                  key={flag.id}
                  onClick={() => handleOpenModal(flag)}
                  className="flex cursor-pointer flex-col justify-between gap-3 p-4 transition-colors hover:bg-neutral-900/40 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isOpen ? (
                        <IconAlertTriangle className="size-4 text-amber-400" />
                      ) : (
                        <IconCircleCheck className="size-4 text-emerald-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-200">
                          {flag.generatorName}
                        </span>
                        <span className="text-neutral-500">·</span>
                        <span className="text-neutral-400">week of {flag.weekStart}</span>
                        <span
                          className={`px-1.5 py-0.2 text-[10px] uppercase tracking-wider border ${
                            isOpen
                              ? "border-amber-900/60 bg-amber-950/20 text-amber-400"
                              : "border-neutral-800 bg-neutral-900 text-neutral-400"
                          }`}
                        >
                          {flag.status}
                        </span>
                      </div>

                      <div className="mt-1 text-[11px] text-neutral-500">
                        bought: {flag.litresBought}L · expected burn: {flag.litresExpected}L · variance: {flag.variancePct > 0 ? "+" : ""}{flag.variancePct.toFixed(1)}% ({flag.varianceLitres > 0 ? "+" : ""}{flag.varianceLitres.toFixed(1)}L)
                      </div>

                      {flag.notes && (
                        <div className="mt-1 text-[11px] text-neutral-400">
                          documented: {flag.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div className="font-semibold text-sky-400">
                        {formatNaira(flag.estimatedNairaImpact)} impact
                      </div>
                      <div className="text-[11px] text-neutral-500">estimated value</div>
                    </div>
                    <IconChevronRight className="size-4 text-neutral-600" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-neutral-800 bg-black p-5 text-xs text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="text-xs uppercase tracking-wider text-neutral-400">
                review variance flag · {selectedFlag.generatorName}
              </span>
              <button
                type="button"
                onClick={() => setSelectedFlag(null)}
                className="text-neutral-500 hover:text-white"
              >
                <IconX className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 border-b border-neutral-900 pb-4">
              <div className="flex justify-between">
                <span className="text-neutral-500">week starting</span>
                <span className="text-neutral-200">{selectedFlag.weekStart}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">fuel bought</span>
                <span className="text-neutral-200">{selectedFlag.litresBought} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">expected fuel burn</span>
                <span className="text-neutral-200">{selectedFlag.litresExpected} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">unexplained difference</span>
                <span className="text-amber-400">
                  {selectedFlag.varianceLitres > 0 ? "+" : ""}{selectedFlag.varianceLitres} L ({selectedFlag.variancePct > 0 ? "+" : ""}{selectedFlag.variancePct.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">estimated financial impact</span>
                <span className="font-semibold text-sky-400">
                  {formatNaira(selectedFlag.estimatedNairaImpact)}
                </span>
              </div>
            </div>

            <form onSubmit={handleResolveSubmit} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-neutral-400">benign cause</label>
                <select
                  value={selectedCause}
                  onChange={(e) => setSelectedCause(e.target.value)}
                  className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                >
                  {BENIGN_CAUSES.map((c) => (
                    <option key={c.id} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-neutral-400">operational explanation / context</label>
                <textarea
                  rows={2}
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  placeholder="e.g. Bought 2 x 20L yellow jerrycans stored behind shop for weekend outage."
                  className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-neutral-400">status resolution</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as "open" | "explained" | "dismissed")}
                  className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                >
                  <option value="explained">Explained (Benign cause recorded)</option>
                  <option value="dismissed">Dismissed (Tolerable normal fluctuation)</option>
                  <option value="open">Keep Open (Requires investigation)</option>
                </select>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFlag(null)}
                  className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-400 hover:text-white"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving}
                  className="border border-neutral-800 bg-neutral-900 px-4 py-1.5 uppercase tracking-wider text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white disabled:opacity-50"
                >
                  {isResolving ? "saving..." : "update flag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
