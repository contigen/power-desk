import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";

type GeneratorItem = {
  id: string;
  name: string;
  kva: number;
};

type LoadBand = "light" | "typical" | "heavy";

type LogRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LogRunModal({ isOpen, onClose }: LogRunModalProps) {
  const { data: genData } = useActionQuery("list-generators", {});
  const { mutate: logRun, isPending } = useActionMutation("log-run");

  const rawGenerators = (genData?.generators ?? []) as unknown as readonly GeneratorItem[];

  const [generatorId, setGeneratorId] = useState<string>("");
  const [hours, setHours] = useState<string>("6");
  const [loadBand, setLoadBand] = useState<LoadBand>("typical");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsedHours = parseFloat(hours);

    if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
      setError("Enter valid operating hours between 0.1 and 24h.");
      return;
    }

    logRun(
      {
        generator: generatorId || undefined,
        hours: parsedHours,
        loadBand,
        note: note.trim() || undefined,
        source: "web",
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to record runtime.";
          setError(message);
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="relative w-full max-w-md border border-neutral-800 bg-black p-6 text-neutral-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
          <span className="text-xs tracking-wider uppercase text-neutral-400">log generator runtime</span>
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
            <label htmlFor="run-gen" className="text-neutral-400">
              generator
            </label>
            <select
              id="run-gen"
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
              <label htmlFor="run-hours" className="text-neutral-400">
                operating hours (h)
              </label>
              <input
                id="run-hours"
                type="number"
                step="0.1"
                min="0.1"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="run-load" className="text-neutral-400">
                load band
              </label>
              <select
                id="run-load"
                value={loadBand}
                onChange={(e) => setLoadBand(e.target.value as LoadBand)}
                className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              >
                <option value="light">Light (Lights, POS)</option>
                <option value="typical">Typical (Fans, PCs, Fridge)</option>
                <option value="heavy">Heavy (Freezers, ACs, Pumps)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="run-notes" className="text-neutral-400">
              operational notes (optional)
            </label>
            <input
              id="run-notes"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Grid shed from 11:00 to 17:00"
              className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full border border-neutral-800 bg-neutral-900 py-2.5 text-center font-mono text-xs uppercase tracking-wider text-neutral-100 transition-colors hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-50"
          >
            {isPending ? "recording..." : "submit runtime log"}
          </button>
        </form>
      </div>
    </div>
  );
}
