import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useActionQuery, useActionMutation } from "@agent-native/core/client/hooks";
import {
  IconSettings,
  IconRefresh,
  IconSend,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";

type SettingsData = {
  tolerancePct?: number;
  telegramChatId?: string | null;
  showSampleData?: boolean;
};

export function meta() {
  return [
    { title: "Settings - Power Desk" },
    {
      name: "description",
      content: "Operational tolerances, Telegram bot connectivity, and data honesty settings.",
    },
  ];
}

export default function SettingsRoute() {
  const { data: settingsData, refetch } = useActionQuery("get-settings", {});
  const { mutate: setSettings, isPending: isSaving } = useActionMutation("set-settings");
  const { mutate: resetSample, isPending: isResetting } = useActionMutation("reset-sample-data");
  const { mutate: sendSummary, isPending: isSendingSummary } = useActionMutation("weekly-summary");

  const [tolerancePct, setTolerancePct] = useState<number>(10);
  const [telegramChatId, setTelegramChatId] = useState<string>("");
  const [enableSample, setEnableSample] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [testSuccess, setTestSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (settingsData) {
      const s = settingsData as SettingsData;
      if (s.tolerancePct !== undefined) setTolerancePct(s.tolerancePct);
      if (s.telegramChatId !== undefined && s.telegramChatId !== null) setTelegramChatId(s.telegramChatId);
      if (s.showSampleData !== undefined) setEnableSample(s.showSampleData);
    }
  }, [settingsData]);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveSuccess(false);

    setSettings(
      {
        tolerancePct,
        telegramChatId: telegramChatId || null,
        showSampleData: enableSample,
      },
      {
        onSuccess: () => {
          setSaveSuccess(true);
          refetch();
          setTimeout(() => setSaveSuccess(false), 3000);
        },
      }
    );
  }

  function handleResetSample() {
    resetSample(
      {},
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  }

  function handleTestTelegram() {
    setTestSuccess(false);
    sendSummary(
      { sendTelegram: true },
      {
        onSuccess: () => {
          setTestSuccess(true);
          setTimeout(() => setTestSuccess(false), 3000);
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6 font-mono text-neutral-100">
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-900 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">system & operational settings</h1>
          <p className="mt-0.5 text-xs text-neutral-400">
            operational tolerances, telegram ledger connectivity, and benchmark data controls
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-400">variance detection tolerance</span>
          <div className="mt-4 flex flex-col gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-400">trigger flag when discrepancy exceeds</span>
              <span className="font-semibold text-sky-400">±{tolerancePct}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={tolerancePct}
              onChange={(e) => setTolerancePct(parseInt(e.target.value, 10))}
              className="accent-sky-400"
            />
            <span className="text-[11px] text-neutral-500">
              Flags are generated when weekly litres bought exceed expected burn by more than {tolerancePct}%.
            </span>
          </div>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-400">telegram bot ledger integration</span>
          <div className="mt-4 flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400">owner telegram chat id</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. 1649626606"
                className="border border-neutral-800 bg-black px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>
            <div className="flex items-center justify-between border-t border-neutral-900 pt-3">
              <span className="text-[11px] text-neutral-500">
                Bot: @PowerDeskBot · Receives weekly briefing & real-time alerts
              </span>
              <button
                type="button"
                disabled={isSendingSummary}
                onClick={handleTestTelegram}
                className="border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-600 hover:text-white disabled:opacity-50"
              >
                {isSendingSummary ? "sending..." : testSuccess ? "briefing sent" : "send test briefing"}
              </button>
            </div>
          </div>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-4">
          <span className="text-xs uppercase tracking-wider text-neutral-400">benchmark sample data & honesty</span>
          <div className="mt-4 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-200">enable benchmark sample data</span>
                <p className="text-[11px] text-neutral-500">
                  Shows seeded Lagos retail benchmarks clearly marked as sample data.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableSample}
                onChange={(e) => setEnableSample(e.target.checked)}
                className="size-4 accent-sky-400"
              />
            </div>

            <div className="flex items-center justify-between border-t border-neutral-900 pt-3">
              <span className="text-[11px] text-neutral-500">
                Reseeds the initial benchmark dataset for Adewale Provisions Store.
              </span>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetSample}
                className="border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-600 hover:text-white disabled:opacity-50"
              >
                {isResetting ? "resetting..." : "reset benchmark data"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-900 pt-4">
          {saveSuccess ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <IconCheck className="size-4" />
              <span>settings updated successfully</span>
            </span>
          ) : (
            <span className="text-xs text-neutral-500">settings apply across web and telegram</span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="border border-neutral-800 bg-neutral-900 px-5 py-2 uppercase tracking-wider text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white disabled:opacity-50"
          >
            {isSaving ? "saving..." : "save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
