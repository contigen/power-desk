import { useState } from "react";
import { Link } from "react-router";
import {
  useActionQuery,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import { APP_TITLE } from "@/lib/app-config";
import { formatNaira, formatNumber } from "@/lib/utils";
import { useSetPageTitle } from "@/components/layout/HeaderActions";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconTool,
  IconClock,
  IconGasStation,
  IconChevronRight,
  IconCheck,
  IconX,
  IconEdit,
  IconHelpCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function meta() {
  return [
    { title: `Variance Review - ${APP_TITLE}` },
    {
      name: "description",
      content:
        "Review and explain weekly generator fuel variance. Prompt to investigate unexpected consumption patterns neutrally.",
    },
  ];
}

export default function VarianceRoute() {
  useSetPageTitle("Variance Review");

  const { data: varianceData, isLoading, refetch } = useActionQuery(
    "check-variance",
    {}
  );
  const { data: settingsData } = useActionQuery("get-settings", {});

  const { mutate: resolveFlag, isPending: isResolving } =
    useActionMutation("resolve-variance");

  // Selected flag for explanation modal
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [modalStatus, setModalStatus] = useState<"open" | "explained" | "dismissed">("explained");
  const [explanationText, setExplanationText] = useState("");

  const tolerancePct = settingsData?.tolerancePct ?? 15;
  const flags = varianceData?.flags || [];

  const openFlags = flags.filter((f: any) => f.status === "open");
  const explainedFlags = flags.filter((f: any) => f.status === "explained");
  const nominalWeeks = flags.filter((f: any) => f.status !== "open" && f.status !== "explained");

  const totalOpenNaira = openFlags.reduce(
    (sum: number, f: any) => sum + (f.estimatedNairaImpact || 0),
    0
  );

  const totalOpenLitres = openFlags.reduce(
    (sum: number, f: any) => sum + Math.max(0, f.varianceLitres || 0),
    0
  );

  const openResolveModal = (flag: any) => {
    setSelectedFlag(flag);
    setModalStatus(flag.status === "open" ? "explained" : flag.status);
    setExplanationText(flag.explanation || "");
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlag) return;

    resolveFlag(
      {
        flagId: selectedFlag.flagId || selectedFlag.id,
        status: modalStatus,
        explanation: explanationText || undefined,
      },
      {
        onSuccess: () => {
          setSelectedFlag(null);
          refetch();
        },
      }
    );
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Fuel Variance Review
            </h1>
            <Badge
              variant="outline"
              className={
                openFlags.length > 0
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-semibold"
              }
            >
              {openFlags.length > 0
                ? `${openFlags.length} Flagged Weeks`
                : "All Nominal"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compares litres bought against litres expected from engine run-hours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs py-1 px-2.5 bg-muted">
            Configured Tolerance: ±{tolerancePct}%
          </Badge>
          <Button variant="outline" size="sm" asChild className="text-xs">
            <Link to="/settings">Adjust Tolerance</Link>
          </Button>
        </div>
      </div>

      {/* Neutral Language & Education Banner */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconInfoCircle className="size-5" />
          </div>
          <div className="text-xs leading-relaxed">
            <h2 className="font-semibold text-foreground text-sm">
              Understanding Unexplained Variance
            </h2>
            <p className="text-muted-foreground mt-0.5">
              A variance flag is a neutral operational prompt to check records, not an accusation.
              Common legitimate causes include:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              <div className="rounded bg-muted/50 p-2 text-[11px]">
                <strong className="text-foreground block">1. Stored Jerrycans:</strong>
                Fuel purchased this week may be sitting in 25L or 50L plastic jerrycans for future outages.
              </div>
              <div className="rounded bg-muted/50 p-2 text-[11px]">
                <strong className="text-foreground block">2. High Thermal Load:</strong>
                Running multiple air conditioners or freezers during hot afternoon periods consumes up to 25% more fuel.
              </div>
              <div className="rounded bg-muted/50 p-2 text-[11px]">
                <strong className="text-foreground block">3. Tank Carry-Over:</strong>
                Fuel bought late Sunday evening that will be burned during Monday morning operations.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Open Flags
          </div>
          <div className="text-xl font-bold text-foreground mt-1">
            {openFlags.length}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Needs investigation
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Litres at Variance
          </div>
          <div className="text-xl font-bold text-foreground mt-1">
            {formatNumber(totalOpenLitres, 1)} L
          </div>
          <div className="text-[10px] text-muted-foreground">
            Bought beyond expected burn
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Est. Naira Impact
          </div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {formatNaira(totalOpenNaira)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            At current pump rates
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Explained Weeks
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {explainedFlags.length}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Documented reserve / reasons
          </div>
        </Card>
      </div>

      {/* Variance Flags List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
          Weekly Generator Consumption Audits
        </h2>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg bg-card">
            Calculating weekly fuel burn vs purchases...
          </div>
        ) : flags.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg bg-card">
            No generator activity recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag: any) => {
              const isFlagged = flag.isVariance;
              const isOpen = flag.status === "open" && isFlagged;
              const isExplained = flag.status === "explained";

              return (
                <div
                  key={`${flag.generatorId}-${flag.weekStart}`}
                  className={`rounded-lg border p-4 transition-all ${
                    isOpen
                      ? "border-amber-500/40 bg-amber-500/5 shadow-xs"
                      : isExplained
                      ? "border-emerald-500/30 bg-card"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Generator & Week Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {flag.generatorName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Week of {flag.weekStart}
                        </span>

                        {/* Status Badges */}
                        {isOpen ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 text-[10px] font-bold uppercase tracking-wider"
                          >
                            Unexplained Variance
                          </Badge>
                        ) : isExplained ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold"
                          >
                            ✓ Explained
                          </Badge>
                        ) : flag.status === "dismissed" ? (
                          <Badge
                            variant="outline"
                            className="bg-muted text-muted-foreground text-[10px]"
                          >
                            Dismissed
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                          >
                            Nominal (within ±{tolerancePct}%)
                          </Badge>
                        )}
                      </div>

                      {/* Numbers Bar */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Bought: <strong className="text-foreground">{formatNumber(flag.litresBought, 1)} L</strong>
                        </span>
                        <span>
                          Run-Time: <strong className="text-foreground">{formatNumber(flag.totalHours, 1)} hrs</strong>
                        </span>
                        <span>
                          Expected Burn: <strong className="text-foreground">{formatNumber(flag.litresExpected, 1)} L</strong>
                        </span>
                        <span>
                          Variance:{" "}
                          <strong
                            className={
                              flag.varianceLitres > 0 && isFlagged
                                ? "text-amber-700 dark:text-amber-400 font-bold"
                                : "text-foreground"
                            }
                          >
                            {flag.varianceLitres > 0 ? "+" : ""}
                            {formatNumber(flag.varianceLitres, 1)} L ({flag.variancePct > 0 ? "+" : ""}
                            {formatNumber(flag.variancePct, 1)}%)
                          </strong>
                        </span>
                        {flag.estimatedNairaImpact > 0 && (
                          <span>
                            Est. Impact:{" "}
                            <strong className="text-amber-700 dark:text-amber-400 font-bold">
                              {formatNaira(flag.estimatedNairaImpact)}
                            </strong>
                          </span>
                        )}
                      </div>

                      {/* Explanation note if recorded */}
                      {flag.explanation && (
                        <div className="text-xs bg-muted/60 rounded px-2.5 py-1.5 mt-2 text-foreground flex items-start gap-1.5">
                          <IconCheck className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-muted-foreground mr-1">
                              Recorded Reason:
                            </span>
                            <span>{flag.explanation}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => openResolveModal(flag)}
                      >
                        <IconEdit className="size-3.5" />
                        {flag.explanation ? "Update Note" : "Explain / Resolve"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedFlag} onOpenChange={(open) => !open && setSelectedFlag(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleResolveSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconAlertTriangle className="size-5 text-amber-600" />
                Resolve Variance Flag
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedFlag?.generatorName} — Week of {selectedFlag?.weekStart} (+{formatNumber(selectedFlag?.variancePct || 0, 1)}% variance, ~{formatNaira(selectedFlag?.estimatedNairaImpact || 0)})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={modalStatus}
                  onValueChange={(val: any) => setModalStatus(val)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="explained" className="text-xs">
                      Explained (Reserve fuel, heavy cooling, carry-over)
                    </SelectItem>
                    <SelectItem value="dismissed" className="text-xs">
                      Dismissed (Measurement rounding or test run)
                    </SelectItem>
                    <SelectItem value="open" className="text-xs">
                      Open (Under investigation)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Reason / Explanation Note</Label>
                <Input
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  placeholder="e.g. 25L reserve jerrycan kept in store for weekend backup"
                  className="text-xs"
                  required={modalStatus === "explained"}
                />
                <span className="text-[10px] text-muted-foreground block">
                  Quick options: "Reserve jerrycan stored", "Ran extra deep-freezers for ice blocks", "Fuel carry-over to next week".
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedFlag(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isResolving}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {isResolving ? "Saving..." : "Save Resolution"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
