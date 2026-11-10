import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";

type GeneratorItem = {
  id: string;
  name: string;
  kva: number;
};

type LogFuelModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LogFuelModal({ isOpen, onClose }: LogFuelModalProps) {
  const { data: genData } = useActionQuery("list-generators", {});
  const { mutate: logFuel, isPending } = useActionMutation("log-fuel");

  const rawGenerators = (genData?.generators ?? []) as unknown as readonly GeneratorItem[];

  const [generatorId, setGeneratorId] = useState<string>("");
  const [litres, setLitres] = useState<string>("25");
  const [pricePerLitre, setPricePerLitre] = useState<string>("1280");
  const [supplier, setSupplier] = useState<string>("TotalEnergies");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsedLitres = parseFloat(litres);
    const parsedPrice = parseFloat(pricePerLitre);

    if (isNaN(parsedLitres) || parsedLitres <= 0) {
      setError("Enter a valid litre amount.");
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Enter a valid price per litre.");
      return;
    }

    logFuel(
      {
        generator: generatorId || undefined,
        litres: parsedLitres,
        pricePerLitre: parsedPrice,
        supplier: supplier.trim() || undefined,
        note: note.trim() || undefined,
        source: "web",
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to record fuel purchase.";
          setError(message);
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="relative w-full max-w-md border border-neutral-800 bg-black p-6 text-neutral-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
          <span className="text-xs tracking-wider uppercase text-neutral-400">log fuel purchase</span>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-white"
            aria-label="Close modal"
          >
            <IconX className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 text-xs">
          {error && (
            <div className="border border-red-900/60 bg-red-950/20 px-3 py-2 text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fuel-gen" className="text-neutral-400">
              generator
            </label>
            <select
              id="fuel-gen"
              value={generatorId}
              onChange={(e) => setGeneratorId(e.target.value)}
              className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            >
              <option value="">Primary Generator (Auto)</option>
              {rawGenerators.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.kva} kVA)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fuel-litres" className="text-neutral-400">
                litres (l)
              </label>
              <input
                id="fuel-litres"
                type="number"
                step="0.5"
                min="0.5"
                max="500"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                required
                className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fuel-price" className="text-neutral-400">
                price / litre (ngn)
              </label>
              <input
                id="fuel-price"
                type="number"
                step="1"
                min="100"
                value={pricePerLitre}
                onChange={(e) => setPricePerLitre(e.target.value)}
                required
                className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fuel-supplier" className="text-neutral-400">
              supplier / station
            </label>
            <input
              id="fuel-supplier"
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. TotalEnergies, NNPC Retail"
              className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fuel-notes" className="text-neutral-400">
              operational notes (optional)
            </label>
            <input
              id="fuel-notes"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 2 x 20L yellow jerrycans stored"
              className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full border border-neutral-800 bg-neutral-900 py-2.5 text-center font-mono text-xs uppercase tracking-wider text-neutral-100 transition-colors hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-50"
          >
            {isPending ? "recording..." : "submit fuel log"}
          </button>
        </form>
      </div>
    </div>
  );
}
