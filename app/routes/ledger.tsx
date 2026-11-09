import { useState } from "react";
import { Link } from "react-router";
import {
  useActionQuery,
  useActionMutation,
  callAction,
} from "@agent-native/core/client/hooks";
import { APP_TITLE } from "@/lib/app-config";
import { formatNaira, formatNumber } from "@/lib/utils";
import { useSetPageTitle } from "@/components/layout/HeaderActions";
import {
  IconReceipt2,
  IconGasStation,
  IconClock,
  IconDownload,
  IconArrowBackUp,
  IconPlus,
  IconFilter,
  IconDeviceMobile,
  IconWorld,
  IconFlask,
  IconAlertCircle,
  IconSearch,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    { title: `Ledger - ${APP_TITLE}` },
    {
      name: "description",
      content:
        "Chronological ledger of fuel purchases and generator run-time records with cost per hour analysis.",
    },
  ];
}

export default function LedgerRoute() {
  useSetPageTitle("Ledger");

  // Filter state
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const [selectedGenId, setSelectedGenId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Ledger query
  const {
    data: ledgerData,
    isLoading,
    refetch,
  } = useActionQuery("get-ledger", {
    range,
    generatorId: selectedGenId !== "all" ? selectedGenId : undefined,
  });

  // Generators list
  const { data: genData } = useActionQuery("list-generators", {});
  const generators = genData?.generators || [];

  // Modals state
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);

  // Fuel modal form
  const [fuelGenId, setFuelGenId] = useState("");
  const [fuelLitres, setFuelLitres] = useState("30");
  const [fuelPrice, setFuelPrice] = useState("1280");
  const [fuelSupplier, setFuelSupplier] = useState("TotalEnergies Surulere");
  const [fuelNote, setFuelNote] = useState("");
  const { mutate: logFuel, isPending: isLoggingFuel } =
    useActionMutation("log-fuel");

  // Run hours modal form
  const [hoursGenId, setHoursGenId] = useState("");
  const [runHours, setRunHours] = useState("6");
  const [loadBand, setLoadBand] = useState<"light" | "typical" | "heavy">(
    "typical"
  );
  const [hoursNote, setHoursNote] = useState("");
  const { mutate: logRun, isPending: isLoggingRun } =
    useActionMutation("log-run");

  // Undo mutation
  const { mutate: undoLast, isPending: isUndoing } =
    useActionMutation("undo-last-entry");

  // Handle Export CSV
  const handleExportCsv = async () => {
    try {
      const result: any = await callAction(
        "export-ledger",
        {
          generatorId: selectedGenId !== "all" ? selectedGenId : undefined,
        },
        { method: "GET" }
      );

      if (result?.csv) {
        const blob = new Blob([result.csv], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          result.filename || `power-desk-ledger-${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Export CSV error:", err);
    }
  };

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
          refetch();
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
        loadBand,
        note: hoursNote || undefined,
        source: "web",
      },
      {
        onSuccess: () => {
          setIsHoursModalOpen(false);
          setHoursNote("");
          refetch();
        },
      }
    );
  };

  const handleUndoConfirm = () => {
    undoLast(
      {},
      {
        onSuccess: () => {
          setIsUndoModalOpen(false);
          refetch();
        },
      }
    );
  };

  const entries = (ledgerData?.entries || []).filter((item: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.generatorName?.toLowerCase().includes(query) ||
      item.note?.toLowerCase().includes(query) ||
      item.supplier?.toLowerCase().includes(query) ||
      item.type?.toLowerCase().includes(query) ||
      item.date?.includes(query)
    );
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Fuel & Runtime Ledger
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-muted font-medium text-muted-foreground"
            >
              {entries.length} Records
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Chronological fuel purchases and operating sessions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs gap-1.5 shadow-xs"
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
            <IconClock className="size-3.5 text-sky-600" />
            Log Hours
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-medium gap-1.5"
            onClick={handleExportCsv}
          >
            <IconDownload className="size-3.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setIsUndoModalOpen(true)}
          >
            <IconArrowBackUp className="size-3.5" />
            Undo Last
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total Fuel
          </div>
          <div className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">
            {formatNumber(ledgerData?.summary?.totalLitres ?? 0, 1)} L
          </div>
          <div className="text-[10px] text-muted-foreground">
            {ledgerData?.summary?.fuelCount ?? 0} fill-ups
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total Spend
          </div>
          <div className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">
            {formatNaira(ledgerData?.summary?.totalSpendNaira ?? 0)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            All fuel purchases
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Runtime
          </div>
          <div className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">
            {formatNumber(ledgerData?.summary?.totalRunHours ?? 0, 1)} hrs
          </div>
          <div className="text-[10px] text-muted-foreground">
            {ledgerData?.summary?.runCount ?? 0} sessions
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Average Price
          </div>
          <div className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">
            {formatNaira(ledgerData?.summary?.averagePricePerLitre ?? 0)}
            <span className="text-xs font-normal text-muted-foreground">/L</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Weighted avg
          </div>
        </Card>

        <Card className="p-3 col-span-2 md:col-span-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Cost / Hour
          </div>
          <div className="text-lg font-bold text-foreground font-mono tabular-nums mt-1">
            {formatNaira(ledgerData?.summary?.costPerRunHour ?? 0)}
            <span className="text-xs font-normal text-muted-foreground">/hr</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Fuel + wear
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-background border border-border rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setRange("7d")}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                range === "7d"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setRange("30d")}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                range === "30d"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setRange("all")}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                range === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Generator Selector */}
          <Select value={selectedGenId} onValueChange={setSelectedGenId}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
              <SelectValue placeholder="All Generators" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Generators
              </SelectItem>
              {generators.map((g: any) => (
                <SelectItem key={g.id} value={g.id} className="text-xs">
                  {g.name} ({g.kva} kVA)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <IconSearch className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, supplier, gen..."
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/70 text-muted-foreground border-b border-border text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Generator</th>
                <th className="py-2.5 px-3">Quantity / Rate</th>
                <th className="py-2.5 px-3 text-right">Amount (₦)</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Supplier & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Loading ledger records...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No entries match current filters.
                  </td>
                </tr>
              ) : (
                entries.map((item: any) => {
                  const isFuel = item.type === "fuel";
                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-2.5 px-3 font-mono font-medium text-foreground whitespace-nowrap">
                        {item.date}
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isFuel ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            <IconGasStation className="size-3" />
                            Fuel Purchase
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                            <IconClock className="size-3" />
                            Run Time
                          </span>
                        )}
                      </td>

                      {/* Generator */}
                      <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">
                        {item.generatorName}
                      </td>

                      {/* Quantity & Details */}
                      <td className="py-2.5 px-3">
                        {isFuel ? (
                          <span>
                            <strong>{formatNumber(item.litres, 1)} L</strong> @ {formatNaira(item.pricePerLitre)}/L
                          </span>
                        ) : (
                          <span>
                            <strong>{formatNumber(item.hours, 1)} hrs</strong> ({item.loadBand} load)
                          </span>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                        {isFuel ? (
                          formatNaira(item.totalCostNaira)
                        ) : (
                          <span className="text-muted-foreground font-normal">
                            —
                          </span>
                        )}
                      </td>

                      {/* Source Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.source === "telegram" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20 gap-1 font-medium"
                          >
                            <IconDeviceMobile className="size-3" />
                            Telegram
                          </Badge>
                        ) : item.isSample ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 gap-1 font-medium"
                          >
                            <IconFlask className="size-3" />
                            Sample
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-muted text-muted-foreground gap-1 font-medium"
                          >
                            <IconWorld className="size-3" />
                            Web
                          </Badge>
                        )}
                      </td>

                      {/* Supplier & Notes */}
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                        {item.supplier && (
                          <span className="font-medium text-foreground mr-1">
                            [{item.supplier}]
                          </span>
                        )}
                        {item.note || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fuel Purchase Modal */}
      <Dialog open={isFuelModalOpen} onOpenChange={setIsFuelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleLogFuelSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconGasStation className="size-5 text-amber-600" />
                Record Fuel Purchase
              </DialogTitle>
              <DialogDescription className="text-xs">
                Log fuel bought for a generator or stored in jerrycans.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs">Generator</Label>
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
                <div className="space-y-1">
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
                  />
                </div>
                <div className="space-y-1">
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
                  />
                </div>
              </div>

              <div className="rounded-md bg-muted/60 p-2.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Computed Total:</span>
                <span className="text-sm font-bold text-foreground">
                  {formatNaira(
                    (parseFloat(fuelLitres) || 0) * (parseFloat(fuelPrice) || 0)
                  )}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Filling Station / Vendor</Label>
                <Input
                  value={fuelSupplier}
                  onChange={(e) => setFuelSupplier(e.target.value)}
                  className="text-xs"
                  placeholder="e.g. TotalEnergies, NNPC"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Note</Label>
                <Input
                  value={fuelNote}
                  onChange={(e) => setFuelNote(e.target.value)}
                  className="text-xs"
                  placeholder="e.g. 30L plastic keg for backup"
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
                {isLoggingFuel ? "Saving..." : "Save Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Run Hours Modal */}
      <Dialog open={isHoursModalOpen} onOpenChange={setIsHoursModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleLogRunSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconClock className="size-5 text-sky-600" />
                Record Generator Runtime
              </DialogTitle>
              <DialogDescription className="text-xs">
                Log run hours to calculate fuel burn and servicing intervals.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs">Generator</Label>
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
                <div className="space-y-1">
                  <Label className="text-xs">Run Duration (hours)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    value={runHours}
                    onChange={(e) => setRunHours(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
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
                        Light (&lt; 50%)
                      </SelectItem>
                      <SelectItem value="typical" className="text-xs">
                        Typical (75%)
                      </SelectItem>
                      <SelectItem value="heavy" className="text-xs">
                        Heavy (100%)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Note</Label>
                <Input
                  value={hoursNote}
                  onChange={(e) => setHoursNote(e.target.value)}
                  className="text-xs"
                  placeholder="e.g. Outage during peak customer hours"
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
                {isLoggingRun ? "Saving..." : "Save Runtime"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Undo Last Entry Confirmation Dialog */}
      <Dialog open={isUndoModalOpen} onOpenChange={setIsUndoModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <IconAlertCircle className="size-5" />
              Undo Last Entry?
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will remove the most recent entry logged by the user or Telegram bot. Sample demo data will not be affected.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUndoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isUndoing}
              onClick={handleUndoConfirm}
            >
              {isUndoing ? "Undoing..." : "Yes, Undo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
