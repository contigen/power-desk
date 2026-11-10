import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useActionQuery, useActionMutation } from "@agent-native/core/client/hooks";
import { formatNaira, formatNumber } from "@/lib/utils";
import {
  IconSun,
  IconClock,
  IconX,
  IconBookmark,
} from "@tabler/icons-react";

type SavedQuote = {
  id: string;
  label: string;
  systemCostNaira: number;
  systemCostFormatted?: string;
  expectedYearsLife: number;
  batteryReplacementCostNaira: number;
  batteryYearsLife: number;
  notes?: string | null;
  createdAt: string;
};

type TimelinePoint = {
  month: number;
  genCum: number;
  solarCum: number;
};

type CalculationResult = {
  monthlyGenCost: number;
  monthlyFuelSpend: number;
  monthlyServicingSpend: number;
  netMonthlySavings: number;
  paybackMonths: number;
  paybackYears: number;
  fiveYearGenCost: number;
  fiveYearSolarCost: number;
  fiveYearSavings: number;
  timeline: readonly TimelinePoint[];
};

export function meta() {
  return [
    { title: "Solar Break-Even - Power Desk" },
    {
      name: "description",
      content: "Deterministic payback and 5-year savings analysis comparing generator fuel burn against solar replacement.",
    },
  ];
}

export default function BreakEvenRoute() {
  const { data: quotesData, refetch: refetchQuotes } = useActionQuery(
    "list-solar-quotes",
    {}
  );
  const { mutate: saveQuote, isPending: isSavingQuote } = useActionMutation("save-solar-quote");

  const [dailyHours, setDailyHours] = useState<number>(8);
  const [fuelPrice, setFuelPrice] = useState<number>(1300);
  const [litresPerHour, setLitresPerHour] = useState<number>(1.2);
  const [servicingCostPerHour, setServicingCostPerHour] = useState<number>(150);

  const [solarCostNaira, setSolarCostNaira] = useState<number>(4500000);
  const [solarLifespanYears, setSolarLifespanYears] = useState<number>(10);
  const [batteryCostNaira, setBatteryCostNaira] = useState<number>(1200000);
  const [batteryLifespanYears, setBatteryLifespanYears] = useState<number>(5);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [quoteLabel, setQuoteLabel] = useState<string>("3.5 kVA Solar + 5 kWh Lithium");
  const [quoteNotes, setQuoteNotes] = useState<string>("Standard Lagos shop setup (inverter + panels + battery)");

  const calculations: CalculationResult = useMemo(() => {
    const hoursPerMonth = dailyHours * 30.416;
    const monthlyFuelSpend = hoursPerMonth * litresPerHour * fuelPrice;
    const monthlyServicingSpend = hoursPerMonth * servicingCostPerHour;
    const monthlyGenCost = monthlyFuelSpend + monthlyServicingSpend;

    const monthlySolarAmortization = batteryCostNaira / (batteryLifespanYears * 12) + 10000;
    const netMonthlySavings = Math.max(1, monthlyGenCost - monthlySolarAmortization);
    const paybackMonths = solarCostNaira / netMonthlySavings;
    const paybackYears = paybackMonths / 12;

    const fiveYearGenCost = monthlyGenCost * 60;
    const fiveYearSolarCost = solarCostNaira + (batteryCostNaira * (5 / batteryLifespanYears - 1 > 0 ? 1 : 0)) + 10000 * 60;
    const fiveYearSavings = Math.max(0, fiveYearGenCost - fiveYearSolarCost);

    const timeline: TimelinePoint[] = [];
    for (let month = 0; month <= 60; month += 6) {
      const genCum = monthlyGenCost * month;
      const solarCum = solarCostNaira + (month >= 60 && batteryLifespanYears <= 5 ? batteryCostNaira : 0) + 10000 * month;
      timeline.push({ month, genCum, solarCum });
    }

    return {
      monthlyGenCost,
      monthlyFuelSpend,
      monthlyServicingSpend,
      netMonthlySavings,
      paybackMonths,
      paybackYears,
      fiveYearGenCost,
      fiveYearSolarCost,
      fiveYearSavings,
      timeline,
    };
  }, [
    dailyHours,
    fuelPrice,
    litresPerHour,
    servicingCostPerHour,
    solarCostNaira,
    solarLifespanYears,
    batteryCostNaira,
    batteryLifespanYears,
  ]);

  const savedQuotes = (quotesData?.quotes ?? []) as unknown as readonly SavedQuote[];

  function handleSaveQuoteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    saveQuote(
      {
        label: quoteLabel,
        systemCostNaira: solarCostNaira,
        expectedYearsLife: solarLifespanYears,
        batteryReplacementCostNaira: batteryCostNaira,
        batteryYearsLife: batteryLifespanYears,
        notes: quoteNotes,
      },
      {
        onSuccess: () => {
          setIsSaveModalOpen(false);
          refetchQuotes();
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6 font-mono text-neutral-100">
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-900 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">solar break-even analysis</h1>
          <p className="mt-0.5 text-xs text-neutral-400">
            deterministic payback comparison: generator fuel & servicing vs solar replacement
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsSaveModalOpen(true)}
          className="flex items-center gap-1.5 border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 transition-colors hover:border-neutral-600 hover:text-white"
        >
          <IconBookmark className="size-3.5 text-sky-400" />
          <span>save scenario</span>
        </button>
      </div>

      <div className="border border-neutral-900 bg-neutral-950 p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">monthly gen spend</span>
              <span className="text-neutral-200">{formatNaira(calculations.monthlyGenCost)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">net monthly savings</span>
              <span className="text-emerald-400">{formatNaira(calculations.netMonthlySavings)}/mo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">5-year net savings</span>
              <span className="text-neutral-200">{formatNaira(calculations.fiveYearSavings)}</span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <span className="text-xs uppercase tracking-wider text-neutral-500">payback period</span>
            <span className="text-2xl font-bold tracking-tight text-sky-400 sm:text-3xl">
              {calculations.paybackMonths.toFixed(1)} months
            </span>
            <span className="text-[11px] text-neutral-400">
              ({calculations.paybackYears.toFixed(1)} years to break even)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">payback period</span>
          <div className="mt-2 text-xl font-bold text-sky-400 sm:text-2xl">
            {calculations.paybackMonths.toFixed(1)} mos
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            {calculations.paybackYears.toFixed(1)} years
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">monthly net savings</span>
          <div className="mt-2 text-xl font-bold text-emerald-400 sm:text-2xl">
            {formatNaira(calculations.netMonthlySavings)}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            operational savings per month
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">5-year net savings</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {formatNaira(calculations.fiveYearSavings)}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            net after system maintenance
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">monthly gen spend</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {formatNaira(calculations.monthlyGenCost)}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            fuel + servicing cost
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-400">generator operational parameters</span>
          <div className="mt-4 flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">daily runtime</span>
                <span className="text-neutral-200">{dailyHours} hours / day</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="0.5"
                value={dailyHours}
                onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                className="accent-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">fuel pump price</span>
                <span className="text-neutral-200">{formatNaira(fuelPrice)} / L</span>
              </div>
              <input
                type="range"
                min="800"
                max="2000"
                step="20"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(parseFloat(e.target.value))}
                className="accent-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">consumption burn rate</span>
                <span className="text-neutral-200">{litresPerHour.toFixed(1)} L / hr</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.1"
                value={litresPerHour}
                onChange={(e) => setLitresPerHour(parseFloat(e.target.value))}
                className="accent-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">hourly servicing & maintenance</span>
                <span className="text-neutral-200">{formatNaira(servicingCostPerHour)} / hr</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                value={servicingCostPerHour}
                onChange={(e) => setServicingCostPerHour(parseFloat(e.target.value))}
                className="accent-sky-400"
              />
            </div>
          </div>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-400">solar & storage capital parameters</span>
          <div className="mt-4 flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">solar system upfront cost</span>
                <span className="text-neutral-200">{formatNaira(solarCostNaira)}</span>
              </div>
              <input
                type="range"
                min="1000000"
                max="15000000"
                step="250000"
                value={solarCostNaira}
                onChange={(e) => setSolarCostNaira(parseFloat(e.target.value))}
                className="accent-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">battery replacement reserve</span>
                <span className="text-neutral-200">{formatNaira(batteryCostNaira)}</span>
              </div>
              <input
                type="range"
                min="500000"
                max="6000000"
                step="100000"
                value={batteryCostNaira}
                onChange={(e) => setBatteryCostNaira(parseFloat(e.target.value))}
                className="accent-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">battery lifespan</span>
                <span className="text-neutral-200">{batteryLifespanYears} years</span>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                step="1"
                value={batteryLifespanYears}
                onChange={(e) => setBatteryLifespanYears(parseFloat(e.target.value))}
                className="accent-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">panel lifespan</span>
                <span className="text-neutral-200">{solarLifespanYears} years</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={solarLifespanYears}
                onChange={(e) => setSolarLifespanYears(parseFloat(e.target.value))}
                className="accent-sky-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950">
        <div className="border-b border-neutral-900 px-4 py-3">
          <span className="text-xs uppercase tracking-wider text-neutral-500">saved solar scenarios</span>
        </div>

        {savedQuotes.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            no scenarios saved yet. adjust parameters and click "save scenario".
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-900 text-xs">
            {savedQuotes.map((q) => (
              <div key={q.id} className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
                <div>
                  <span className="font-semibold text-neutral-200">{q.label}</span>
                  <div className="mt-0.5 text-[11px] text-neutral-500">
                    {q.expectedYearsLife} yr design life · {q.notes ?? "Custom setup"}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="font-semibold text-sky-400">
                    {formatNaira(q.systemCostNaira)}
                  </span>
                  <div className="text-[11px] text-neutral-500">
                    battery reserve: {formatNaira(q.batteryReplacementCostNaira)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-neutral-800 bg-black p-5 text-xs text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="text-xs uppercase tracking-wider text-neutral-400">save solar scenario</span>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                <IconX className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuoteSubmit} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-neutral-400">scenario name</label>
                <input
                  type="text"
                  value={quoteLabel}
                  onChange={(e) => setQuoteLabel(e.target.value)}
                  required
                  className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-neutral-400">notes & specifications</label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                />
              </div>

              <div className="border border-neutral-900 bg-black/50 p-3 text-[11px]">
                <div className="flex justify-between py-0.5">
                  <span className="text-neutral-500">upfront cost:</span>
                  <span className="text-neutral-200">{formatNaira(solarCostNaira)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-neutral-500">monthly net savings:</span>
                  <span className="text-emerald-400">{formatNaira(calculations.netMonthlySavings)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-neutral-500">payback period:</span>
                  <span className="text-sky-400">{calculations.paybackMonths.toFixed(1)} months</span>
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-400 hover:text-white"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuote}
                  className="border border-neutral-800 bg-neutral-900 px-4 py-1.5 uppercase tracking-wider text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white disabled:opacity-50"
                >
                  {isSavingQuote ? "saving..." : "save quote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
