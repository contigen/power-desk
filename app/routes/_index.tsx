import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { markAgentChatHomeHandoff } from "@agent-native/core/client/agent-chat";
import { useActionQuery, useActionMutation } from "@agent-native/core/client/hooks";
import { AgentChatSurface } from "@agent-native/toolkit/app/chat";
import { TAB_ID } from "@/lib/tab-id";
import { formatNaira, formatNumber } from "@/lib/utils";
import {
  IconGasStation,
  IconClock,
  IconAlertTriangle,
  IconArrowRight,
} from "@tabler/icons-react";

type GeneratorItem = {
  id: string;
  name: string;
  kva: number;
  fuelType: string;
  litresPerHourLight: number;
  litresPerHourTypical: number;
  litresPerHourHeavy: number;
  tankLitres: number;
  servicingCostPerHour: number;
  servicingCostFormatted?: string;
};

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
  status: string;
};

type LedgerSummaryData = {
  totalLitres?: number;
  totalSpendNaira?: number;
  totalFuelSpend?: number;
  totalRunHours?: number;
  averagePricePerLitre?: number;
  costPerRunHour?: number;
  activeGeneratorsCount?: number;
};

type SettingsData = {
  showSampleData?: boolean;
  tolerancePct?: number;
};

function chatThreadPath(threadId: string | null): string {
  return threadId ? `/chat/${encodeURIComponent(threadId)}` : "/";
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return "recent";
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  if (isNaN(past)) return "recent";
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

type LedgerEntryItem = {
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
  source: string;
  note?: string | null;
  isSample: boolean;
  createdAt: string;
};

export function meta() {
  return [
    { title: "Power Desk - Fuel & Generator Ledger" },
    {
      name: "description",
      content: "Operational ledger for Nigerian SME generators, spotting unexplained fuel variance and computing solar break-even.",
    },
  ];
}

export default function DeskHomeRoute() {
  const { threadId } = useParams();
  const navigate = useNavigate();

  const { data: ledgerData, refetch: refetchLedger } = useActionQuery(
    "get-ledger",
    { range: "7d" },
    { staleTime: 0, refetchInterval: 2000, refetchIntervalInBackground: true }
  );

  const { data: varianceData, refetch: refetchVariance } = useActionQuery(
    "check-variance",
    {},
    { staleTime: 0, refetchInterval: 3000, refetchIntervalInBackground: true }
  );
  const { data: settingsData } = useActionQuery("get-settings", {}, { refetchInterval: 10000 });
  const { data: genData } = useActionQuery("list-generators", {}, { refetchInterval: 10000 });

  useEffect(() => {
    const timer = setInterval(() => {
      refetchLedger();
      refetchVariance();
    }, 2500);
    return () => clearInterval(timer);
  }, [refetchLedger, refetchVariance]);

  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [fuelGenId, setFuelGenId] = useState("");
  const [fuelLitres, setFuelLitres] = useState("25");
  const [fuelPrice, setFuelPrice] = useState("1280");
  const [fuelSupplier, setFuelSupplier] = useState("TotalEnergies");
  const [fuelNote, setFuelNote] = useState("");
  const { mutate: logFuel, isPending: isLoggingFuel } = useActionMutation("log-fuel");

  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runGenId, setRunGenId] = useState("");
  const [runHours, setRunHours] = useState("6");
  const [runLoadBand, setRunLoadBand] = useState<"light" | "typical" | "heavy">("typical");
  const [runNote, setRunNote] = useState("");
  const { mutate: logRun, isPending: isLoggingRun } = useActionMutation("log-run");

  useEffect(() => {
    function handleChatRunning(event: Event) {
      const custom = event as CustomEvent<{ isRunning?: boolean }>;
      if (custom.detail?.isRunning === true) {
        markAgentChatHomeHandoff("chat");
      }
    }
    window.addEventListener("agentNative.chatRunning", handleChatRunning);
    return () => window.removeEventListener("agentNative.chatRunning", handleChatRunning);
  }, []);

  const summary = (ledgerData?.summary ?? {}) as LedgerSummaryData;
  const recentEntries = (ledgerData?.entries ?? []) as unknown as readonly LedgerEntryItem[];
  const flags = (varianceData?.flags ?? []) as readonly VarianceFlagItem[];
  const openFlags = flags.filter((f) => f.status === "open");
  const generators = (genData?.generators ?? []) as unknown as readonly GeneratorItem[];
  const settings = (settingsData ?? {}) as SettingsData;

  const totalFuelSpend = summary.totalSpendNaira ?? summary.totalFuelSpend ?? 0;
  const totalLitres = summary.totalLitres ?? 0;
  const totalHours = summary.totalRunHours ?? 0;
  const avgPrice = summary.averagePricePerLitre ?? 1320;
  const costPerHour = summary.costPerRunHour ?? 0;

  function handleLogFuelSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const litresNum = parseFloat(fuelLitres);
    const priceNum = parseFloat(fuelPrice);
    if (isNaN(litresNum) || isNaN(priceNum)) return;

    logFuel(
      {
        generator: fuelGenId || (generators[0]?.id ?? undefined),
        litres: litresNum,
        pricePerLitre: priceNum,
        supplier: fuelSupplier || undefined,
        note: fuelNote || undefined,
        source: "web",
      },
      {
        onSuccess: () => {
          setFuelModalOpen(false);
          setFuelNote("");
          refetchLedger();
        },
      }
    );
  }

  function handleLogRunSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hoursNum = parseFloat(runHours);
    if (isNaN(hoursNum)) return;

    logRun(
      {
        generator: runGenId || (generators[0]?.id ?? undefined),
        hours: hoursNum,
        loadBand: runLoadBand,
        note: runNote || undefined,
        source: "web",
      },
      {
        onSuccess: () => {
          setRunModalOpen(false);
          setRunNote("");
          refetchLedger();
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6 font-mono text-neutral-100">
      <div className="border border-neutral-900 bg-neutral-950 p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">business</span>
              <span className="font-semibold text-neutral-200">
                Adewale Provisions Store (Lagos)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">primary gen</span>
              <span className="text-neutral-300">
                {generators[0]?.name ? `${generators[0].name} (${generators[0].kva} kVA)` : "Gen A (3.2 kVA)"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">status</span>
              <span className="text-neutral-400">
                {generators.length > 0 ? `${generators.length} registered generators` : "fleet loaded"} · lagos operations
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <span className="text-xs uppercase tracking-wider text-neutral-500">7-day fuel spend</span>
            <span className="text-2xl font-bold tracking-tight text-sky-400 sm:text-3xl">
              {formatNaira(totalFuelSpend)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">fuel purchased</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {formatNumber(totalLitres, 1)} L
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            avg {formatNaira(avgPrice)}/L
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">generator runtime</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {formatNumber(totalHours, 1)} hrs
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            {generators.length} active gensets
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">cost per run-hour</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {costPerHour > 0 ? `${formatNaira(costPerHour)}/h` : "N3,246/h"}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            fuel burn + servicing wear
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">unexplained variance</span>
          <div className={`mt-2 text-xl font-bold sm:text-2xl ${openFlags.length > 0 ? "text-amber-400" : "text-neutral-100"}`}>
            {openFlags.length > 0 ? `${openFlags.length} open flag` : "0 flags"}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            {openFlags.length > 0 ? `${formatNaira(openFlags[0]?.estimatedNairaImpact ?? 32000)} impact` : "within tolerance"}
          </span>
        </div>
      </div>

      {openFlags.length > 0 && openFlags[0] && (
        <div className="flex flex-col justify-between gap-3 border border-amber-900/60 bg-amber-950/20 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <div className="text-xs">
              <span className="font-semibold text-amber-300">
                unexplained fuel variance flagged ({openFlags.length} open)
              </span>
              <p className="mt-0.5 text-neutral-300">
                {openFlags[0].generatorName} purchased {openFlags[0].litresBought}L (expected ~{openFlags[0].litresExpected}L, +{openFlags[0].variancePct.toFixed(1)}% variance, ~{formatNaira(openFlags[0].estimatedNairaImpact)} impact).
              </p>
            </div>
          </div>
          <Link
            to="/variance"
            className="flex shrink-0 items-center gap-1.5 border border-amber-800/80 bg-neutral-950 px-3 py-1.5 text-xs text-amber-300 hover:border-amber-600 hover:text-white"
          >
            <span>review variance</span>
            <IconArrowRight className="size-3" />
          </Link>
        </div>
      )}

      <div className="border border-neutral-900 bg-neutral-950 p-4">
        <span className="text-xs uppercase tracking-wider text-neutral-500">recent activity</span>
        <div className="mt-3 flex flex-col divide-y divide-neutral-900 text-xs">
          {recentEntries.length === 0 ? (
            <div className="py-2 text-neutral-500">no recent operational logs recorded yet.</div>
          ) : (
            recentEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex flex-col justify-between gap-1 py-2 sm:flex-row sm:items-center">
                <span className="text-neutral-300">
                  {entry.type === "fuel"
                    ? `Logged ${entry.litres}L @ N${entry.pricePerLitre}/L for ${entry.generatorName}${entry.supplier ? ` (${entry.supplier})` : ""} · via ${entry.source}`
                    : `Logged ${entry.hours}h runtime (${entry.loadBand ?? "typical"} load) for ${entry.generatorName} · via ${entry.source}`}
                </span>
                <span className="shrink-0 text-neutral-500">{formatTimeAgo(entry.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950 p-4">
        <span className="text-xs uppercase tracking-wider text-neutral-500">fleet generators & consumption</span>
        <div className="mt-3 flex flex-col divide-y divide-neutral-900 text-xs">
          {generators.map((gen) => (
            <div key={gen.id} className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center">
              <div>
                <span className="font-semibold text-neutral-200">
                  {gen.name}
                </span>
                <span className="ml-2 text-neutral-400">
                  {gen.kva} kVA · {gen.fuelType}
                </span>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  typical burn: {gen.litresPerHourTypical} L/h · servicing: N{gen.servicingCostPerHour}/h
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-sky-400 font-semibold">
                  N{(Number(gen.litresPerHourTypical) * 1280 + Number(gen.servicingCostPerHour)).toFixed(0)}/h
                </span>
                <div className="text-[11px] text-neutral-500">operating benchmark</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950 p-4">
        <div className="mb-3 flex items-center justify-between border-b border-neutral-900 pb-2">
          <span className="text-xs uppercase tracking-wider text-neutral-500">operational assistant</span>
          <span className="text-[11px] text-neutral-500">telegram & web interface</span>
        </div>

        <div className="min-h-[460px]">
          <AgentChatSurface
            mode="page"
            chatViewTransition
            className="h-full w-full"
            defaultMode="chat"
            storageKey="power-desk-chat"
            threadUrlSync={{
              routeThreadId: threadId ?? null,
              getPath: chatThreadPath,
              navigate,
            }}
            browserTabId={TAB_ID}
            showHeader={false}
            showTabBar={false}
            dynamicSuggestions={false}
            suggestions={[
              "Bought 40L at 1280 for Gen A, ran 6h",
              "How much did we spend on fuel this week?",
              "Why is there an unexplained variance on Gen A?",
              "Calculate solar break-even for 3.5kVA system",
            ]}
            emptyStateText="Welcome to Power Desk"
            emptyStateDisplay="hidden"
            centerComposerWhenEmpty
            composerLayoutVariant="hero"
            composerPlaceholder="Text agent: 'bought 25L at 1280, ran 5h' or ask a question..."
          />
        </div>
      </div>

      {fuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-neutral-800 bg-black p-5 text-xs text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="text-xs uppercase tracking-wider text-neutral-400">quick log fuel</span>
              <button
                type="button"
                onClick={() => setFuelModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                close
              </button>
            </div>
            <form onSubmit={handleLogFuelSubmit} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-neutral-400">generator</label>
                <select
                  value={fuelGenId}
                  onChange={(e) => setFuelGenId(e.target.value)}
                  className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                >
                  {generators.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.kva} kVA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">litres</label>
                  <input
                    type="number"
                    step="0.5"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(e.target.value)}
                    required
                    className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">price / litre (ngn)</label>
                  <input
                    type="number"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                    required
                    className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-neutral-400">supplier</label>
                <input
                  type="text"
                  value={fuelSupplier}
                  onChange={(e) => setFuelSupplier(e.target.value)}
                  className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingFuel}
                className="mt-2 border border-neutral-800 bg-neutral-900 py-2.5 uppercase tracking-wider text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
              >
                {isLoggingFuel ? "saving..." : "submit fuel log"}
              </button>
            </form>
          </div>
        </div>
      )}

      {runModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-neutral-800 bg-black p-5 text-xs text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="text-xs uppercase tracking-wider text-neutral-400">quick log runtime</span>
              <button
                type="button"
                onClick={() => setRunModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                close
              </button>
            </div>
            <form onSubmit={handleLogRunSubmit} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-neutral-400">generator</label>
                <select
                  value={runGenId}
                  onChange={(e) => setRunGenId(e.target.value)}
                  className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                >
                  {generators.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.kva} kVA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">operating hours</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    value={runHours}
                    onChange={(e) => setRunHours(e.target.value)}
                    required
                    className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">load band</label>
                  <select
                    value={runLoadBand}
                    onChange={(e) => setRunLoadBand(e.target.value as "light" | "typical" | "heavy")}
                    className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                  >
                    <option value="light">Light</option>
                    <option value="typical">Typical</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingRun}
                className="mt-2 border border-neutral-800 bg-neutral-950 py-2.5 uppercase tracking-wider text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
              >
                {isLoggingRun ? "saving..." : "submit runtime log"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
