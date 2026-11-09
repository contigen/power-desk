import { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  useActionQuery,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import { APP_TITLE } from "@/lib/app-config";
import { formatNaira, formatNumber } from "@/lib/utils";
import { useSetPageTitle } from "@/components/layout/HeaderActions";
import {
  IconSun,
  IconFlame,
  IconBolt,
  IconClock,
  IconCash,
  IconDeviceFloppy,
  IconInfoCircle,
  IconTrendingDown,
  IconScale,
  IconCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function meta() {
  return [
    { title: `Solar Break-Even - ${APP_TITLE}` },
    {
      name: "description",
      content:
        "Calculate the exact payback period and 5-year savings when switching from a petrol/diesel generator to solar and battery storage in Nigeria.",
    },
  ];
}

export default function BreakEvenRoute() {
  useSetPageTitle("Solar Break-Even");

  // Quotes query
  const { data: quotesData, refetch: refetchQuotes } = useActionQuery(
    "list-solar-quotes",
    {}
  );
  const { mutate: saveQuote, isPending: isSavingQuote } =
    useActionMutation("save-solar-quote");

  // Simulator Inputs
  const [dailyHours, setDailyHours] = useState(8);
  const [fuelPrice, setFuelPrice] = useState(1300);
  const [litresPerHour, setLitresPerHour] = useState(1.2);
  const [servicingCostPerHour, setServicingCostPerHour] = useState(150);

  const [solarCostNaira, setSolarCostNaira] = useState(4500000);
  const [solarLifespanYears, setSolarLifespanYears] = useState(10);
  const [batteryCostNaira, setBatteryCostNaira] = useState(1200000);
  const [batteryLifespanYears, setBatteryLifespanYears] = useState(5);

  // Save Modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [quoteLabel, setQuoteLabel] = useState("3.5 kVA Solar + 5 kWh Lithium");
  const [quoteNotes, setQuoteNotes] = useState("Standard Lagos shop setup (inverter + panels + battery)");

  // Calculations
  const calculations = useMemo(() => {
    const hoursPerMonth = dailyHours * 30.416;
    const monthlyFuelSpend = hoursPerMonth * litresPerHour * fuelPrice;
    const monthlyServicingSpend = hoursPerMonth * servicingCostPerHour;
    const monthlyGenCost = monthlyFuelSpend + monthlyServicingSpend;

    // Monthly Solar cost (maintenance + battery amortized)
    const monthlySolarAmortization =
      (batteryCostNaira / (batteryLifespanYears * 12)) + 10000; // ₦10k/mo solar maintenance

    const netMonthlySavings = Math.max(1, monthlyGenCost - monthlySolarAmortization);
    const paybackMonths = solarCostNaira / netMonthlySavings;
    const paybackYears = paybackMonths / 12;

    // 5-Year Cumulative
    const fiveYearGenCost = monthlyGenCost * 60;
    const fiveYearSolarCost =
      solarCostNaira + (batteryCostNaira * (5 / batteryLifespanYears - 1 > 0 ? 1 : 0)) + (10000 * 60);
    const fiveYearSavings = Math.max(0, fiveYearGenCost - fiveYearSolarCost);

    // 60-month points for visual chart
    const timeline = [];
    for (let month = 0; month <= 60; month += 6) {
      const genCum = monthlyGenCost * month;
      const solarCum =
        solarCostNaira +
        (month >= 60 && batteryLifespanYears <= 5 ? batteryCostNaira : 0) +
        (10000 * month);
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

  const handleSaveQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveQuote(
      {
        label: quoteLabel,
        systemCostNaira: solarCostNaira,
        expectedYearsLife: solarLifespanYears,
        batteryReplacementCostNaira: batteryCostNaira,
        batteryYearsLife: batteryLifespanYears,
        notes: quoteNotes || undefined,
      },
      {
        onSuccess: () => {
          setIsSaveModalOpen(false);
          refetchQuotes();
        },
      }
    );
  };

  const loadPresetQuote = (q: any) => {
    setSolarCostNaira(q.systemCostNaira);
    setSolarLifespanYears(q.expectedYearsLife || 10);
    setBatteryCostNaira(q.batteryReplacementCostNaira || 1200000);
    setBatteryLifespanYears(q.batteryYearsLife || 5);
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Solar & Battery Break-Even
            </h1>
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold"
            >
              Economic Payback Model
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Payback timeline and 5-year savings compared to generator fuel and servicing.
          </p>
        </div>

        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs gap-1.5 shadow-xs"
          onClick={() => setIsSaveModalOpen(true)}
        >
          <IconDeviceFloppy className="size-3.5" />
          Save Scenario Quote
        </Button>
      </div>

      {/* Main KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-card border-border">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Monthly Generator Burn
          </div>
          <div className="text-xl font-extrabold text-foreground font-mono tabular-nums mt-1">
            {formatNaira(calculations.monthlyGenCost)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Fuel ({formatNaira(calculations.monthlyFuelSpend)}) + Servicing
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Payback Timeline
          </div>
          <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 font-mono tabular-nums mt-1">
            {formatNumber(calculations.paybackMonths, 1)} Months
          </div>
          <div className="text-[10px] text-muted-foreground">
            (~{formatNumber(calculations.paybackYears, 1)} years to break even)
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Net Monthly Savings
          </div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            {formatNaira(calculations.netMonthlySavings)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            After solar maintenance
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            5-Year Net Benefit
          </div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            {formatNaira(calculations.fiveYearSavings)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Generator cost: {formatNaira(calculations.fiveYearGenCost)}
          </div>
        </Card>
      </div>

      {/* Two Column Simulator Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generator Cost Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <IconFlame className="size-4 text-amber-600" />
              1. Current Generator Operations
            </CardTitle>
            <CardDescription className="text-xs">
              Daily run-time and fuel consumption rates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Daily Hours Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label>Daily Generator Runtime</Label>
                <span className="font-bold font-mono">{dailyHours} hours/day</span>
              </div>
              <Slider
                value={[dailyHours]}
                onValueChange={(val) => setDailyHours(val[0] ?? 8)}
                min={2}
                max={20}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>2 hrs (light outage)</span>
                <span>8 hrs (typical workday)</span>
                <span>20 hrs (heavy outage)</span>
              </div>
            </div>

            {/* Fuel Price */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label>Fuel Price (₦/L)</Label>
                <span className="font-bold font-mono">{formatNaira(fuelPrice)}/L</span>
              </div>
              <Slider
                value={[fuelPrice]}
                onValueChange={(val) => setFuelPrice(val[0] ?? 1300)}
                min={1000}
                max={2000}
                step={25}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>₦1,000</span>
                <span>₦1,300 (Lagos 2026)</span>
                <span>₦2,000</span>
              </div>
            </div>

            {/* Consumption Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label>Fuel Burn Rate (L/h)</Label>
                <span className="font-bold font-mono">{litresPerHour} L/hr</span>
              </div>
              <Slider
                value={[litresPerHour]}
                onValueChange={(val) => setLitresPerHour(val[0] ?? 1.2)}
                min={0.6}
                max={4.0}
                step={0.1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.8 L/h (2kVA)</span>
                <span>1.2 L/h (3.2kVA benchmark)</span>
                <span>3.0 L/h (10kVA)</span>
              </div>
            </div>

            {/* Servicing Cost */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label>Servicing & Oil Wear (₦/h)</Label>
                <span className="font-bold font-mono">{formatNaira(servicingCostPerHour)}/hr</span>
              </div>
              <Slider
                value={[servicingCostPerHour]}
                onValueChange={(val) => setServicingCostPerHour(val[0] ?? 150)}
                min={50}
                max={500}
                step={25}
              />
            </div>
          </CardContent>
        </Card>

        {/* Solar System Capital Quote */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <IconSun className="size-4 text-amber-500" />
              2. Solar & Storage Capital Quote
            </CardTitle>
            <CardDescription className="text-xs">
              Turnkey system specifications and battery replacement cycles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* System Cost */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label>Solar + Inverter Installed Cost</Label>
                <span className="font-bold font-mono text-primary">
                  {formatNaira(solarCostNaira)}
                </span>
              </div>
              <Slider
                value={[solarCostNaira]}
                onValueChange={(val) => setSolarCostNaira(val[0] ?? 4500000)}
                min={1500000}
                max={15000000}
                step={250000}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>₦1.5M (2kVA)</span>
                <span>₦4.5M (3.5kVA / 5kWh)</span>
                <span>₦15M (10kVA)</span>
              </div>
            </div>

            {/* Battery Replacement Cost */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label>Lithium Battery Replacement Cost</Label>
                <span className="font-bold font-mono">
                  {formatNaira(batteryCostNaira)}
                </span>
              </div>
              <Slider
                value={[batteryCostNaira]}
                onValueChange={(val) => setBatteryCostNaira(val[0] ?? 1200000)}
                min={500000}
                max={5000000}
                step={100000}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>₦500k</span>
                <span>₦1.2M (5kWh pack)</span>
                <span>₦5.0M</span>
              </div>
            </div>

            {/* Battery Replacement Cycle */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <Label>Battery Lifespan</Label>
                <span className="font-bold font-mono">{batteryLifespanYears} Years</span>
              </div>
              <Slider
                value={[batteryLifespanYears]}
                onValueChange={(val) => setBatteryLifespanYears(val[0] ?? 5)}
                min={3}
                max={10}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>3 yrs (Tubular/Gel)</span>
                <span>5 yrs (LiFePO4 warranty)</span>
                <span>10 yrs</span>
              </div>
            </div>

            <div className="rounded bg-muted/60 p-2.5 text-xs text-muted-foreground">
              💡 <strong>Lagos Rooftop Context:</strong> Most 3.2 kVA shop generators can be replaced by a 3.5 kVA hybrid inverter with 6–8 mono-PERC panels (3.3 kWp) and one 5.12 kWh LiFePO4 battery wall.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative 5-Year Cost Table / Crossover */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <IconScale className="size-4 text-emerald-600" />
              Cumulative Cost Comparison (5-Year Horizon)
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Crossover at ~Month {Math.round(calculations.paybackMonths)}
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Compares relentless generator fuel spend against solar upfront cost plus flat maintenance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/70 text-muted-foreground text-[11px] font-semibold uppercase">
                <tr>
                  <th className="py-2 px-3">Timeline</th>
                  <th className="py-2 px-3">Generator Spend</th>
                  <th className="py-2 px-3">Solar + Battery Total</th>
                  <th className="py-2 px-3 text-right">Net Savings</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calculations.timeline.map((point) => {
                  const isPastCrossover = point.genCum > point.solarCum;
                  const diff = point.genCum - point.solarCum;
                  return (
                    <tr
                      key={point.month}
                      className={
                        isPastCrossover ? "bg-emerald-500/5 font-medium" : ""
                      }
                    >
                      <td className="py-2 px-3 font-mono">
                        {point.month === 0 ? "Initial (Day 0)" : `Month ${point.month} (${point.month / 12} yrs)`}
                      </td>
                      <td className="py-2 px-3 font-mono text-amber-700 dark:text-amber-400">
                        {formatNaira(point.genCum)}
                      </td>
                      <td className="py-2 px-3 font-mono text-sky-700 dark:text-sky-300">
                        {formatNaira(point.solarCum)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {diff > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{formatNaira(diff)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            -{formatNaira(Math.abs(diff))}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {isPastCrossover ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                          >
                            ✓ Solar Cheaper
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            Paying off solar
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Saved Solar Quotes Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <IconBolt className="size-4 text-amber-500" />
              Saved Solar Quotes & Vendor Scenarios
            </span>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => setIsSaveModalOpen(true)}
            >
              + Add Scenario
            </Button>
          </CardTitle>
          <CardDescription className="text-xs">
            Pre-configured quotes from local Nigerian solar installers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(quotesData?.quotes || []).map((quote: any) => (
              <div
                key={quote.id}
                className="rounded-lg border border-border p-3 flex flex-col justify-between hover:border-primary/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">
                      {quote.label}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {quote.expectedYearsLife} yr life
                    </Badge>
                  </div>
                  <div className="text-lg font-extrabold text-primary mt-1">
                    {formatNaira(quote.systemCostNaira)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {quote.notes || "Battery replacement: " + formatNaira(quote.batteryReplacementCostNaira || 1200000)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-border flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => loadPresetQuote(quote)}
                  >
                    Load into Calculator
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Quote Modal */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveQuoteSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconDeviceFloppy className="size-5 text-amber-600" />
                Save Solar Scenario
              </DialogTitle>
              <DialogDescription className="text-xs">
                Save current capital investment parameters to compare quotes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs">Scenario / Quote Label</Label>
                <Input
                  value={quoteLabel}
                  onChange={(e) => setQuoteLabel(e.target.value)}
                  placeholder="e.g. 5 kVA Hybrid + 10 kWh Battery"
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">System Cost (₦)</Label>
                  <Input
                    type="number"
                    value={solarCostNaira}
                    onChange={(e) => setSolarCostNaira(Number(e.target.value))}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Battery Replacement (₦)</Label>
                  <Input
                    type="number"
                    value={batteryCostNaira}
                    onChange={(e) => setBatteryCostNaira(Number(e.target.value))}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notes / Supplier</Label>
                <Input
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="e.g. Quoted by Starsight Energy Lagos"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSaveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingQuote}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {isSavingQuote ? "Saving..." : "Save Quote"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
