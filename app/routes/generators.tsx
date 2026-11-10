import { useState } from "react";
import { Link } from "react-router";
import { useActionQuery, useActionMutation } from "@agent-native/core/client/hooks";
import { formatNaira, formatNumber } from "@/lib/utils";
import {
  IconBolt,
  IconPlus,
  IconX,
  IconEdit,
} from "@tabler/icons-react";

type GeneratorItem = {
  id: string;
  name: string;
  kva: number;
  fuelType: "petrol" | "diesel";
  tankLitres: number;
  litresPerHourLight: number;
  litresPerHourTypical: number;
  litresPerHourHeavy: number;
  servicingCostPerHour: number;
  servicingCostFormatted?: string;
  installDate?: string | null;
  isSample?: boolean;
};

export function meta() {
  return [
    { title: "Generators - Power Desk" },
    {
      name: "description",
      content: "Manage generator sets, electrical capacity ratings, fuel consumption bands, and servicing costs.",
    },
  ];
}

export default function GeneratorsRoute() {
  const { data: genData, refetch } = useActionQuery("list-generators", {});
  const { mutate: createGen, isPending: isCreating } = useActionMutation("create-generator");
  const { mutate: updateGen, isPending: isUpdating } = useActionMutation("update-generator");

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingGen, setEditingGen] = useState<GeneratorItem | null>(null);

  const [name, setName] = useState<string>("");
  const [kva, setKva] = useState<string>("3.5");
  const [fuelType, setFuelType] = useState<"petrol" | "diesel">("petrol");
  const [tankLitres, setTankLitres] = useState<string>("15");
  const [lightBurn, setLightBurn] = useState<string>("1.0");
  const [typicalBurn, setTypicalBurn] = useState<string>("1.6");
  const [heavyBurn, setHeavyBurn] = useState<string>("2.2");
  const [servicingCost, setServicingCost] = useState<string>("250");

  const generators: readonly GeneratorItem[] = (genData?.generators ?? []) as unknown as readonly GeneratorItem[];

  function openCreateModal() {
    setEditingGen(null);
    setName("");
    setKva("3.5");
    setFuelType("petrol");
    setTankLitres("15");
    setLightBurn("1.0");
    setTypicalBurn("1.6");
    setHeavyBurn("2.2");
    setServicingCost("250");
    setModalOpen(true);
  }

  function openEditModal(g: GeneratorItem) {
    setEditingGen(g);
    setName(g.name);
    setKva(String(g.kva));
    setFuelType(g.fuelType);
    setTankLitres(String(g.tankLitres));
    setLightBurn(String(g.litresPerHourLight));
    setTypicalBurn(String(g.litresPerHourTypical));
    setHeavyBurn(String(g.litresPerHourHeavy));
    setServicingCost(String(g.servicingCostPerHour));
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = {
      name,
      kva: parseFloat(kva) || 3.5,
      fuelType,
      tankLitres: parseFloat(tankLitres) || 15,
      litresPerHourLight: parseFloat(lightBurn) || 1.0,
      litresPerHourTypical: parseFloat(typicalBurn) || 1.6,
      litresPerHourHeavy: parseFloat(heavyBurn) || 2.2,
      servicingCostPerHour: parseFloat(servicingCost) || 250,
    };

    if (editingGen) {
      updateGen(
        { id: editingGen.id, ...payload },
        {
          onSuccess: () => {
            setModalOpen(false);
            refetch();
          },
        }
      );
    } else {
      createGen(payload, {
        onSuccess: () => {
          setModalOpen(false);
          refetch();
        },
      });
    }
  }

  return (
    <div className="flex flex-col gap-6 font-mono text-neutral-100">
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-900 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">generator fleet inventory</h1>
          <p className="mt-0.5 text-xs text-neutral-400">
            electrical capacity ratings, fuel consumption bands (l/h), and servicing wear
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 transition-colors hover:border-neutral-600 hover:text-white"
        >
          <IconPlus className="size-3.5 text-sky-400" />
          <span>register generator</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">fleet units</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {generators.length}
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            active generators
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">primary capacity</span>
          <div className="mt-2 text-xl font-bold text-sky-400 sm:text-2xl">
            {generators[0]?.kva ?? 3.2} kVA
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            {generators[0]?.name ?? "Gen A"}
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">avg typical burn</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            {generators[0]?.litresPerHourTypical ?? 1.6} L/h
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            at normal shop load
          </span>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-500">servicing cost</span>
          <div className="mt-2 text-xl font-bold text-neutral-100 sm:text-2xl">
            N{generators[0]?.servicingCostPerHour ?? 250}/h
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            oil, filters & plug wear
          </span>
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950">
        <div className="border-b border-neutral-900 px-4 py-3">
          <span className="text-xs uppercase tracking-wider text-neutral-500">registered units</span>
        </div>

        <div className="flex flex-col divide-y divide-neutral-900 text-xs">
          {generators.map((gen) => (
            <div
              key={gen.id}
              className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-200">{gen.name}</span>
                  <span className="border border-neutral-800 bg-neutral-900 px-1.5 py-0.2 text-[10px] text-neutral-400">
                    {gen.kva} kVA · {gen.fuelType}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                  <span>tank: {gen.tankLitres}L</span>
                  <span>light: {gen.litresPerHourLight} L/h</span>
                  <span className="text-neutral-300 font-medium">typical: {gen.litresPerHourTypical} L/h</span>
                  <span>heavy: {gen.litresPerHourHeavy} L/h</span>
                  <span>servicing: N{gen.servicingCostPerHour}/h</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(gen)}
                  className="flex items-center gap-1 border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-neutral-300 hover:border-neutral-600 hover:text-white"
                >
                  <IconEdit className="size-3 text-neutral-400" />
                  <span>edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-neutral-800 bg-black p-5 text-xs text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="text-xs uppercase tracking-wider text-neutral-400">
                {editingGen ? "edit generator" : "register generator"}
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                <IconX className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-neutral-400">generator name / model</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gen A (3.2 kVA Maxima GE3500)"
                  required
                  className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">rating (kva)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={kva}
                    onChange={(e) => setKva(e.target.value)}
                    required
                    className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">fuel type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as "petrol" | "diesel")}
                    className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                  >
                    <option value="petrol">Petrol (PMS)</option>
                    <option value="diesel">Diesel (AGO)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">tank capacity (l)</label>
                  <input
                    type="number"
                    step="1"
                    value={tankLitres}
                    onChange={(e) => setTankLitres(e.target.value)}
                    required
                    className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">servicing cost / h (ngn)</label>
                  <input
                    type="number"
                    step="10"
                    value={servicingCost}
                    onChange={(e) => setServicingCost(e.target.value)}
                    required
                    className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">light (l/h)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={lightBurn}
                    onChange={(e) => setLightBurn(e.target.value)}
                    required
                    className="border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-neutral-100 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">typical (l/h)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={typicalBurn}
                    onChange={(e) => setTypicalBurn(e.target.value)}
                    required
                    className="border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-neutral-100 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-400">heavy (l/h)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={heavyBurn}
                    onChange={(e) => setHeavyBurn(e.target.value)}
                    required
                    className="border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-neutral-100 outline-none"
                  />
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-neutral-400 hover:text-white"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="border border-neutral-800 bg-neutral-900 px-4 py-1.5 uppercase tracking-wider text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white disabled:opacity-50"
                >
                  {isCreating || isUpdating ? "saving..." : "save generator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
