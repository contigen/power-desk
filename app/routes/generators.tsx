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
  IconBolt,
  IconFlame,
  IconClock,
  IconSettings,
  IconPlus,
  IconEdit,
  IconInfoCircle,
  IconGasStation,
  IconFlask,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function meta() {
  return [
    { title: `Generators - ${APP_TITLE}` },
    {
      name: "description",
      content:
        "Manage generator fleet ratings, fuel consumption bands (light/typical/heavy), tank sizes, and hourly servicing costs.",
    },
  ];
}

export default function GeneratorsRoute() {
  useSetPageTitle("Generators");

  const { data: genData, isLoading, refetch } = useActionQuery(
    "list-generators",
    {}
  );
  const generators = genData?.generators || [];

  const { mutate: createGen, isPending: isCreating } =
    useActionMutation("create-generator");
  const { mutate: updateGen, isPending: isUpdating } =
    useActionMutation("update-generator");

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addFuelType, setAddFuelType] = useState<"petrol" | "diesel">("petrol");
  const [addKva, setAddKva] = useState("3.2");
  const [addTypicalLph, setAddTypicalLph] = useState("1.2");
  const [addLightLph, setAddLightLph] = useState("0.8");
  const [addHeavyLph, setAddHeavyLph] = useState("1.6");
  const [addTankLitres, setAddTankLitres] = useState("4.0");
  const [addServicingNaira, setAddServicingNaira] = useState("150");

  // Edit Modal State
  const [editingGen, setEditingGen] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editKva, setEditKva] = useState("");
  const [editTypicalLph, setEditTypicalLph] = useState("");
  const [editLightLph, setEditLightLph] = useState("");
  const [editHeavyLph, setEditHeavyLph] = useState("");
  const [editTankLitres, setEditTankLitres] = useState("");
  const [editServicingNaira, setEditServicingNaira] = useState("");

  const handleOpenEdit = (gen: any) => {
    setEditingGen(gen);
    setEditName(gen.name);
    setEditKva(String(gen.kva));
    setEditTypicalLph(String(gen.litresPerHourTypical));
    setEditLightLph(String(gen.litresPerHourLight || (gen.litresPerHourTypical * 0.7).toFixed(2)));
    setEditHeavyLph(String(gen.litresPerHourHeavy || (gen.litresPerHourTypical * 1.3).toFixed(2)));
    setEditTankLitres(String(gen.tankLitres || 4.0));
    setEditServicingNaira(String(gen.servicingCostPerHour || 150));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGen(
      {
        name: addName,
        fuelType: addFuelType,
        kva: parseFloat(addKva) || 3.2,
        litresPerHourTypical: parseFloat(addTypicalLph) || 1.2,
        litresPerHourLight: parseFloat(addLightLph) || 0.8,
        litresPerHourHeavy: parseFloat(addHeavyLph) || 1.6,
        tankLitres: parseFloat(addTankLitres) || 4.0,
        servicingCostPerHour: parseFloat(addServicingNaira) || 150,
      },
      {
        onSuccess: () => {
          setIsAddModalOpen(false);
          setAddName("");
          refetch();
        },
      }
    );
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGen) return;

    updateGen(
      {
        id: editingGen.id,
        name: editName,
        kva: parseFloat(editKva) || editingGen.kva,
        litresPerHourTypical: parseFloat(editTypicalLph) || editingGen.litresPerHourTypical,
        litresPerHourLight: parseFloat(editLightLph) || editingGen.litresPerHourLight,
        litresPerHourHeavy: parseFloat(editHeavyLph) || editingGen.litresPerHourHeavy,
        tankLitres: parseFloat(editTankLitres) || editingGen.tankLitres,
        servicingCostPerHour: parseFloat(editServicingNaira) || editingGen.servicingCostPerHour,
      },
      {
        onSuccess: () => {
          setEditingGen(null);
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
              Generator Fleet
            </h1>
            <Badge variant="outline" className="text-xs bg-muted font-medium">
              {generators.length} Configured Sets
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define generator capacity, consumption rate per load band, and servicing wear costs.
          </p>
        </div>

        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs gap-1.5 shadow-xs"
          onClick={() => setIsAddModalOpen(true)}
        >
          <IconPlus className="size-3.5" />
          Add Generator
        </Button>
      </div>

      {/* Engineering Model Callout */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconInfoCircle className="size-5" />
          </div>
          <div className="text-xs leading-relaxed">
            <h2 className="font-semibold text-foreground text-sm">
              Mechanical Engineering Consumption Baseline
            </h2>
            <p className="text-muted-foreground mt-0.5">
              Consumption curves are anchored in certified manufacturer bench tests.
              For example, a standard <strong>3.2 kVA petrol generator (GE 3500 KBM class)</strong> uses{" "}
              <strong>1.2 L/h at 75% prime rating</strong>. With its 4.0 L mounted tank, it runs for approximately 3.3 hours before refilling.
            </p>
            <p className="text-muted-foreground mt-1">
              Note: Jerrycan purchases (10L, 25L, 50L) exceed tank size; the variance engine accounts for jerrycan storage and multi-tank operation.
            </p>
          </div>
        </div>
      </div>

      {/* Generators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 p-8 text-center text-xs text-muted-foreground border rounded-lg bg-card">
            Loading generator specifications...
          </div>
        ) : generators.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-xs text-muted-foreground border rounded-lg bg-card">
            No generators registered yet. Click "Add Generator" above.
          </div>
        ) : (
          generators.map((gen: any) => {
            const hoursPerTank = gen.tankLitres && gen.litresPerHourTypical
              ? (gen.tankLitres / gen.litresPerHourTypical).toFixed(1)
              : null;

            return (
              <Card key={gen.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        <IconBolt className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">
                          {gen.name}
                        </CardTitle>
                        <CardDescription className="text-xs capitalize">
                          {gen.kva} kVA • {gen.fuelType} engine
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {gen.isSample && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 gap-1"
                        >
                          <IconFlask className="size-3" />
                          Sample
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => handleOpenEdit(gen)}
                      >
                        <IconEdit className="size-3" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Consumption Bands */}
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Consumption Bands
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded bg-background p-1.5 border border-border">
                        <div className="text-[10px] text-muted-foreground">Light (&lt;50%)</div>
                        <div className="font-bold text-foreground mt-0.5">
                          {formatNumber(gen.litresPerHourLight || (gen.litresPerHourTypical * 0.7), 2)} L/h
                        </div>
                      </div>
                      <div className="rounded bg-background p-1.5 border border-primary/30">
                        <div className="text-[10px] font-semibold text-primary">Typical (75%)</div>
                        <div className="font-bold text-foreground mt-0.5">
                          {formatNumber(gen.litresPerHourTypical, 2)} L/h
                        </div>
                      </div>
                      <div className="rounded bg-background p-1.5 border border-border">
                        <div className="text-[10px] text-muted-foreground">Heavy (100%)</div>
                        <div className="font-bold text-foreground mt-0.5">
                          {formatNumber(gen.litresPerHourHeavy || (gen.litresPerHourTypical * 1.3), 2)} L/h
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tank & Servicing Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <IconGasStation className="size-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Mounted Tank:</span>
                        <span className="font-semibold text-foreground">
                          {gen.tankLitres || 4.0} Litres {hoursPerTank ? `(~${hoursPerTank}h run)` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <IconClock className="size-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Servicing Cost:</span>
                        <span className="font-semibold text-foreground">
                          {formatNaira(gen.servicingCostPerHour || 150)}/hr
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Generator Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconBolt className="size-5 text-amber-600" />
                Add New Generator
              </DialogTitle>
              <DialogDescription className="text-xs">
                Register a generator set and configure expected burn rates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs">Generator Name</Label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Office Backup Set, Gen 3"
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Fuel Type</Label>
                  <Select
                    value={addFuelType}
                    onValueChange={(val: any) => setAddFuelType(val)}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petrol" className="text-xs">Petrol (PMS)</SelectItem>
                      <SelectItem value="diesel" className="text-xs">Diesel (AGO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Rating (kVA)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addKva}
                    onChange={(e) => setAddKva(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Light (L/h)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={addLightLph}
                    onChange={(e) => setAddLightLph(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Typical (L/h)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={addTypicalLph}
                    onChange={(e) => setAddTypicalLph(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Heavy (L/h)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={addHeavyLph}
                    onChange={(e) => setAddHeavyLph(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tank Capacity (L)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={addTankLitres}
                    onChange={(e) => setAddTankLitres(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Servicing Wear (₦/h)</Label>
                  <Input
                    type="number"
                    step="10"
                    value={addServicingNaira}
                    onChange={(e) => setAddServicingNaira(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {isCreating ? "Adding..." : "Add Generator"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Generator Modal */}
      <Dialog open={!!editingGen} onOpenChange={(open) => !open && setEditingGen(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconEdit className="size-5 text-amber-600" />
                Edit Generator Specifications
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update consumption parameters and servicing costs for {editingGen?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs">Generator Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Rating (kVA)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editKva}
                    onChange={(e) => setEditKva(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tank Capacity (L)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editTankLitres}
                    onChange={(e) => setEditTankLitres(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Light (L/h)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={editLightLph}
                    onChange={(e) => setEditLightLph(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Typical (L/h)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={editTypicalLph}
                    onChange={(e) => setEditTypicalLph(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Heavy (L/h)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={editHeavyLph}
                    onChange={(e) => setEditHeavyLph(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Servicing Wear (₦/h)</Label>
                <Input
                  type="number"
                  step="10"
                  value={editServicingNaira}
                  onChange={(e) => setEditServicingNaira(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingGen(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
