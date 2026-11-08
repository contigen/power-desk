import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { markAgentChatHomeHandoff } from "@agent-native/core/client/agent-chat";
import { useActionQuery, useActionMutation } from "@agent-native/core/client/hooks";
import { useT } from "@agent-native/core/client/i18n";
import { AgentChatSurface } from "@agent-native/toolkit/app/chat";
import { APP_TITLE } from "@/lib/app-config";
import { TAB_ID } from "@/lib/tab-id";
import { formatNaira, formatNumber } from "@/lib/utils";
import { useSetPageTitle } from "@/components/layout/HeaderActions";
import {
  IconGasStation,
  IconClock,
  IconCash,
  IconFlame,
  IconAlertTriangle,
  IconCircleCheck,
  IconSun,
  IconPlus,
  IconArrowRight,
  IconDeviceMobile,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function meta() {
  return [
    { title: `${APP_TITLE} - Nigeria SME Fuel & Solar Ledger` },
    {
      name: "description",
      content:
        "Operate your generator fuel ledger via Telegram or Web, spot unexplained variance, and calculate solar break-even.",
    },
  ];
}

function chatThreadPath(threadId: string | null) {
  return threadId ? `/chat/${encodeURIComponent(threadId)}` : "/";
}

export default function DeskHomeRoute() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  useSetPageTitle("Desk");

  // Query 7d ledger summary for KPI banner
  const { data: ledgerData, refetch: refetchLedger } = useActionQuery(
    "get-ledger",
    { range: "7d" }
  );

  // Query variance flags to see if there's an open flag
  const { data: varianceData } = useActionQuery("check-variance", {});

  // Query settings to check sample data badge
  const { data: settingsData } = useActionQuery("get-settings", {});

  // Query generators list for modals
  const { data: genData } = useActionQuery("list-generators", {});

  // Quick Log Fuel Modal State
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [fuelGenId, setFuelGenId] = useState("");
  const [fuelLitres, setFuelLitres] = useState("25");
  const [fuelPrice, setFuelPrice] = useState("1280");
  const [fuelSupplier, setFuelSupplier] = useState("TotalEnergies Surulere");
  const [fuelNote, setFuelNote] = useState("");
  const { mutate: logFuel, isPending: isLoggingFuel } =
    useActionMutation("log-fuel");

  // Quick Log Hours Modal State
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [hoursGenId, setHoursGenId] = useState("");
  const [runHours, setRunHours] = useState("6");
  const [loadBand, setLoadBand] = useState<"light" | "typical" | "heavy">(
    "typical"
  );
  const [hoursNote, setHoursNote] = useState("");
  const { mutate: logRun, isPending: isLoggingRun } =
    useActionMutation("log-run");

  useEffect(() => {
    function handleChatRunning(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (detail?.isRunning === true) markAgentChatHomeHandoff("chat");
    }

    window.addEventListener("agentNative.chatRunning", handleChatRunning);
    return () =>
      window.removeEventListener("agentNative.chatRunning", handleChatRunning);
  }, []);

  const openVarianceCount = varianceData?.openCount ?? 0;
  const firstOpenFlag = varianceData?.flags?.find(
    (f: any) => f.status === "open"
  );

  const generators = genData?.generators || [];

  const handleLogFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logFuel(
      {
        generator: fuelGenId || (generators[0]?.id ?? undefined),
        litres: parseFloat(fuelLitres) || 0,
        pricePerLitre: parseFloat(fuelPrice) || 0,
        supplier: fuelSupplier || undefined,
        note: fuelNote || undefined,
        source: "web",
      },
      {
        onSuccess: () => {
          setIsFuelModalOpen(false);
          setFuelNote("");
          refetchLedger();
        },
      }
    );
  };

  const handleLogRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logRun(
      {
        generator: hoursGenId || (generators[0]?.id ?? undefined),
        hours: parseFloat(runHours) || 0,
        loadBand: loadBand,
        note: hoursNote || undefined,
        source: "web",
      },
      {
        onSuccess: () => {
          setIsHoursModalOpen(false);
          setHoursNote("");
          refetchLedger();
        },
      }
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background overflow-y-auto">
      {/* Top Banner: Sample Data Warning if enabled */}
      {settingsData?.showSampleData && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 shrink-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold uppercase tracking-wider"
            >
              Sample Data Mode
            </Badge>
            <span>
              Showing demonstration entries for <strong>Adewale Provisions Store (Lagos)</strong>. User entries are saved with <code>is_sample = false</code>.
            </span>
          </div>
          <Link
            to="/settings"
            className="text-[11px] underline underline-offset-2 font-medium hover:text-amber-900 dark:hover:text-amber-100"
          >
            Settings
          </Link>
        </div>
      )}

      {/* Main KPI & Action Bar */}
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6 shrink-0">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Generator Desk
                </h1>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-semibold"
                >
                  7-Day Overview
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time fuel consumption, variance monitoring, and agent operations for Lagos SMEs.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs text-xs gap-1.5"
                onClick={() => setIsFuelModalOpen(true)}
              >
                <IconPlus className="size-3.5" />
                Log Fuel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-medium gap-1.5"
                onClick={() => setIsHoursModalOpen(true)}
              >
                <IconClock className="size-3.5 text-amber-600" />
                Log Hours
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="text-xs font-medium gap-1.5 hidden md:inline-flex"
              >
                <Link to="/break-even">
                  <IconSun className="size-3.5 text-amber-500" />
                  Solar Payback
                </Link>
              </Button>
            </div>
          </div>

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Litres Bought */}
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Fuel Purchased
                </span>
                <IconGasStation className="size-4 text-amber-500" />
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {ledgerData?.summary?.totalLitres
                  ? `${formatNumber(ledgerData.summary.totalLitres, 1)} L`
                  : "0 L"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Avg {formatNaira(ledgerData?.summary?.averagePricePerLitre ?? 1350)}/L
              </div>
            </div>

            {/* Fuel Spend */}
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Total Spend
                </span>
                <IconCash className="size-4 text-emerald-500" />
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {formatNaira(ledgerData?.summary?.totalSpendNaira ?? 0)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Last 7 calendar days
              </div>
            </div>

            {/* Total Run Hours */}
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Generator Runtime
                </span>
                <IconClock className="size-4 text-sky-500" />
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {ledgerData?.summary?.totalRunHours
                  ? `${formatNumber(ledgerData.summary.totalRunHours, 1)} hrs`
                  : "0 hrs"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Active gen sets: {generators.length || 2}
              </div>
            </div>

            {/* Operating Cost / Run Hour */}
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Cost per Run Hour
                </span>
                <IconFlame className="size-4 text-rose-500" />
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {formatNaira(ledgerData?.summary?.costPerRunHour ?? 0)}
                <span className="text-xs font-normal text-muted-foreground">/hr</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Fuel burn + servicing wear
              </div>
            </div>
          </div>

          {/* Variance Status Callout */}
          <div className="mt-3">
            {openVarianceCount > 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <IconAlertTriangle className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Unexplained fuel variance flagged ({openVarianceCount} open week)
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      {firstOpenFlag?.generatorName || "Generator"} purchased{" "}
                      <strong>{formatNumber(firstOpenFlag?.litresBought || 0, 1)} L</strong> (expected ~
                      {formatNumber(firstOpenFlag?.litresExpected || 0, 1)} L, +
                      {formatNumber(firstOpenFlag?.variancePct || 0, 1)}% variance, ~
                      {formatNaira(firstOpenFlag?.estimatedNairaImpact || 0)} impact).
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="border-amber-500/40 bg-background text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 text-xs shrink-0 self-end sm:self-auto gap-1"
                >
                  <Link to="/variance">
                    Review Variance
                    <IconArrowRight className="size-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <IconCircleCheck className="size-4 text-emerald-600" />
                  <span>
                    <strong>Variance Nominal:</strong> All fuel purchases match expected generator consumption within tolerance (15%).
                  </span>
                </div>
                <Link
                  to="/variance"
                  className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
                >
                  Variance Log <IconArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Agent Chat Surface */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AgentChatSurface
          mode="page"
          chatViewTransition
          className="h-full flex-1"
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
          composerSlot={
            <div className="mx-auto mb-4 max-w-xl px-4 text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                <IconDeviceMobile className="size-3.5" />
                <span>Text via Telegram or Web Chat</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Operate Your Fuel Ledger
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Type naturally in Naira and Litres. The agent logs fuel and run-time, checks for variance, and computes solar break-even automatically.
              </p>
            </div>
          }
        />
      </div>

      {/* Quick Fuel Purchase Modal */}
      <Dialog open={isFuelModalOpen} onOpenChange={setIsFuelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleLogFuelSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconGasStation className="size-5 text-amber-600" />
                Log Fuel Purchase
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record litres bought and pump price. The system computes running spend and checks against expected burn.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Generator</Label>
                <Select
                  value={fuelGenId || generators[0]?.id}
                  onValueChange={setFuelGenId}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select generator" />
                  </SelectTrigger>
                  <SelectContent>
                    {generators.map((g: any) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        {g.name} ({g.kva} kVA {g.fuelType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Litres Bought (L)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="500"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(e.target.value)}
                    required
                    className="text-xs"
                    placeholder="25"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Jerrycans or direct tank
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Price per Litre (₦)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="100"
                    max="10000"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                    required
                    className="text-xs"
                    placeholder="1280"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Lagos avg: ~₦1,250 - ₦1,350
                  </span>
                </div>
              </div>

              <div className="rounded-md bg-muted/60 p-2.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Total Cost:</span>
                <span className="text-sm font-bold text-foreground">
                  {formatNaira(
                    (parseFloat(fuelLitres) || 0) * (parseFloat(fuelPrice) || 0)
                  )}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Supplier / Filling Station</Label>
                <Input
                  value={fuelSupplier}
                  onChange={(e) => setFuelSupplier(e.target.value)}
                  className="text-xs"
                  placeholder="e.g. TotalEnergies, NNPC, Conoil"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Input
                  value={fuelNote}
                  onChange={(e) => setFuelNote(e.target.value)}
                  className="text-xs"
                  placeholder="e.g. 25L yellow jerrycan backup"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFuelModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoggingFuel}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {isLoggingFuel ? "Recording..." : "Save Purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Run Hours Modal */}
      <Dialog open={isHoursModalOpen} onOpenChange={setIsHoursModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleLogRunSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconClock className="size-5 text-sky-600" />
                Log Generator Run Hours
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record hours operated and operating load. This updates expected consumption.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Generator</Label>
                <Select
                  value={hoursGenId || generators[0]?.id}
                  onValueChange={setHoursGenId}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select generator" />
                  </SelectTrigger>
                  <SelectContent>
                    {generators.map((g: any) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        {g.name} ({g.kva} kVA {g.fuelType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Hours Run (h)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    value={runHours}
                    onChange={(e) => setRunHours(e.target.value)}
                    required
                    className="text-xs"
                    placeholder="6"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Load Level</Label>
                  <Select
                    value={loadBand}
                    onValueChange={(val: any) => setLoadBand(val)}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light" className="text-xs">
                        Light (&lt; 50% load - fans/lights)
                      </SelectItem>
                      <SelectItem value="typical" className="text-xs">
                        Typical (75% prime rating)
                      </SelectItem>
                      <SelectItem value="heavy" className="text-xs">
                        Heavy (100% full ACs/chillers)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Input
                  value={hoursNote}
                  onChange={(e) => setHoursNote(e.target.value)}
                  className="text-xs"
                  placeholder="e.g. Afternoon grid outage 12pm - 6pm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsHoursModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoggingRun}
                className="bg-sky-600 hover:bg-sky-700 text-white font-medium"
              >
                {isLoggingRun ? "Recording..." : "Save Runtime"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
