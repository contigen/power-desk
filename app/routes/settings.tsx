import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  useActionQuery,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import {
  LanguagePicker,
  openAgentSettings,
} from "@agent-native/toolkit/app/shared";
import { ChangelogSettingsCard } from "@agent-native/toolkit/app/changelog";
import { useSetPageTitle } from "@/components/layout/HeaderActions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { APP_TITLE } from "@/lib/app-config";
import {
  IconSettings,
  IconAlertTriangle,
  IconDeviceMobile,
  IconRefresh,
  IconSend,
  IconClock,
  IconBuildingStore,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import changelog from "../../CHANGELOG.md?raw";

export function meta() {
  return [{ title: `Settings - ${APP_TITLE}` }];
}

export default function SettingsRoute() {
  useSetPageTitle("Settings");

  const { data: settingsData, refetch } = useActionQuery(
    "get-settings",
    {}
  );
  const { mutate: updateSettings, isPending: isUpdating } =
    useActionMutation("set-settings");
  const { mutate: resetSample, isPending: isResetting } =
    useActionMutation("reset-sample-data");
  const { mutate: triggerSummary, isPending: isTriggering } =
    useActionMutation("weekly-summary");

  const settings = settingsData || {};

  // Form local state
  const [tolerancePct, setTolerancePct] = useState(15);
  const [showSampleData, setShowSampleData] = useState(true);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [weeklySummaryDay, setWeeklySummaryDay] = useState("Sunday");
  const [weeklySummaryTime, setWeeklySummaryTime] = useState("18:00");
  const [summaryStatusMessage, setSummaryStatusMessage] = useState<string | null>(null);

  // Reset confirmation modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    if (!settingsData) return;
    if (settingsData.tolerancePct !== undefined) {
      setTolerancePct(Number(settingsData.tolerancePct));
    }
    if (settingsData.showSampleData !== undefined) {
      setShowSampleData(Boolean(settingsData.showSampleData));
    }
    if (settingsData.telegramChatId) {
      setTelegramChatId(settingsData.telegramChatId);
    }
    if (settingsData.weeklySummaryDay) {
      setWeeklySummaryDay(settingsData.weeklySummaryDay);
    }
    if (settingsData.weeklySummaryTime) {
      setWeeklySummaryTime(settingsData.weeklySummaryTime);
    }
  }, [settingsData]);

  const handleSaveSettings = () => {
    updateSettings(
      {
        tolerancePct,
        showSampleData,
        telegramChatId: telegramChatId || undefined,
        weeklySummaryDay,
        weeklySummaryTime,
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  const handleToggleSampleData = (checked: boolean) => {
    setShowSampleData(checked);
    updateSettings(
      {
        showSampleData: checked,
      },
      {
        onSuccess: () => refetch(),
      }
    );
  };

  const handleResetSampleConfirm = () => {
    resetSample(
      {},
      {
        onSuccess: () => {
          setIsResetModalOpen(false);
          refetch();
        },
      }
    );
  };

  const handleTriggerSummaryNow = () => {
    setSummaryStatusMessage(null);
    triggerSummary(
      { sendTelegram: true },
      {
        onSuccess: (data: any) => {
          setSummaryStatusMessage(
            data?.telegramSent
              ? `✓ Summary sent successfully to Telegram chat ${data.chatId || ""}`
              : "✓ Weekly summary generated! (Add Telegram Chat ID below to receive directly on phone)."
          );
        },
        onError: (err: any) => {
          setSummaryStatusMessage(`Notice: ${err?.message || "Failed to deliver"}`);
        },
      }
    );
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure variance detection thresholds, Telegram bot connection, sample data visibility, and automations.
        </p>
      </div>

      {/* 1. Variance Detection Sensitivity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <IconAlertTriangle className="size-5 text-amber-600" />
              Variance Detection Threshold
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              ±{tolerancePct}% Tolerance
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Percentage discrepancy between fuel bought and expected engine burn before flagging an unexplained variance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label>Tolerance Band (±%)</Label>
              <span className="font-bold font-mono">{tolerancePct}%</span>
            </div>
            <Slider
              value={[tolerancePct]}
              onValueChange={(val) => setTolerancePct(val[0] ?? 15)}
              min={5}
              max={30}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>5% (Strict auditing)</span>
              <span>15% (Recommended for Lagos SME load swings)</span>
              <span>30% (Loose tolerance)</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={isUpdating}
              className="text-xs font-medium"
            >
              {isUpdating ? "Saving..." : "Save Tolerance"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Sample Data & Honesty Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IconBuildingStore className="size-5 text-emerald-600" />
            Demonstration & Sample Data
          </CardTitle>
          <CardDescription className="text-xs">
            Toggle or reseed the built-in sample scenario for Adewale Provisions Store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold">
                Show Sample Demonstration Data
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When enabled, sample entries for Adewale Provisions Store are visible with a 🧪 Sample badge. Real user entries are always preserved separately.
              </p>
            </div>
            <Switch
              checked={showSampleData}
              onCheckedChange={handleToggleSampleData}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-muted-foreground">
              Need to restore original demo entries? Only records with <code>is_sample: true</code> will be reset.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setIsResetModalOpen(true)}
            >
              <IconRefresh className="size-3.5" />
              Reset Sample Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Telegram Integration & Test Trigger */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IconDeviceMobile className="size-5 text-sky-600" />
            Telegram Bot Integration
          </CardTitle>
          <CardDescription className="text-xs">
            Connect your Telegram bot to receive fuel logging texts and send automated weekly rollups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Telegram Chat ID</Label>
              <Input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789 or @channel"
                className="text-xs font-mono"
              />
              <span className="text-[10px] text-muted-foreground block">
                Message <code>/start</code> to your bot on Telegram to obtain your Chat ID.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Webhook Endpoint</Label>
              <Input
                readOnly
                value="/_agent-native/integrations/telegram/webhook"
                className="text-xs font-mono bg-muted/60"
              />
              <span className="text-[10px] text-muted-foreground block">
                Agent-Native built-in webhook endpoint.
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-sky-500/20 bg-sky-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-sky-950 dark:text-sky-200">
                Weekly Summary Dispatch
              </div>
              <p className="text-[11px] text-sky-800 dark:text-sky-300">
                Test the weekly ledger breakdown right now. Dispatches to Telegram and calculates net fuel metrics.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs gap-1.5 shrink-0"
              onClick={handleTriggerSummaryNow}
              disabled={isTriggering}
            >
              <IconSend className="size-3.5" />
              {isTriggering ? "Sending..." : "Send Summary Now"}
            </Button>
          </div>

          {summaryStatusMessage && (
            <div className="text-xs p-2.5 rounded bg-muted text-foreground flex items-center gap-1.5">
              <IconCheck className="size-4 text-emerald-600 shrink-0" />
              <span>{summaryStatusMessage}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={isUpdating}
              className="text-xs font-medium"
            >
              Save Telegram Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Automated Weekly Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IconClock className="size-5 text-amber-500" />
            Automated Weekly Schedule
          </CardTitle>
          <CardDescription className="text-xs">
            Configures the background automation job defined in <code>jobs/weekly-summary.md</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Summary Day</Label>
              <Select
                value={weeklySummaryDay}
                onValueChange={setWeeklySummaryDay}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sunday" className="text-xs">Sunday (Standard)</SelectItem>
                  <SelectItem value="Monday" className="text-xs">Monday Morning</SelectItem>
                  <SelectItem value="Friday" className="text-xs">Friday Evening</SelectItem>
                  <SelectItem value="Saturday" className="text-xs">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Time (WAT - Lagos)</Label>
              <Input
                type="time"
                value={weeklySummaryTime}
                onChange={(e) => setWeeklySummaryTime(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Language & Framework Defaults */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Interface Language</CardTitle>
          <CardDescription className="text-xs">
            Select system display language.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xs space-y-1.5">
          <LanguagePicker label="Language" />
        </CardContent>
      </Card>

      {/* 6. Agent Native Framework Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Agent Assistant Engine</CardTitle>
          <CardDescription className="text-xs">
            Model provider configurations and tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => openAgentSettings()} className="text-xs">
            Open Agent Settings
          </Button>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <IconAlertCircle className="size-5" />
              Reset Sample Data?
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will re-seed the demonstration generators, fuel logs, and variance records for Adewale Provisions Store. Your real entries (logged via Web or Telegram) will remain untouched.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isResetting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={handleResetSampleConfirm}
            >
              {isResetting ? "Resetting..." : "Reset Sample Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
