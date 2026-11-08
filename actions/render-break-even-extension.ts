import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, generators, fuelEntries, runEntries } from "../server/db/index.js";
import { desc } from "drizzle-orm";
import { ACTION_CHAT_UI_INLINE_EXTENSION_RENDERER } from "@agent-native/core/action-ui";

export default defineAction({
  description:
    "Render the interactive solar vs generator break-even simulator inline in chat with dynamic sliders for daily hours, fuel prices, solar equipment costs, and crossover payback charts.",
  schema: z.object({
    generatorId: z.string().optional(),
    dailyRunHours: z.number().optional(),
    fuelPricePerLitre: z.number().optional(),
  }),
  chatUI: {
    renderer: ACTION_CHAT_UI_INLINE_EXTENSION_RENDERER,
    title: "Solar vs Generator Break-Even Calculator",
  },
  readOnly: true,
  run: async (input) => {
    const db = getDb();
    const allGens = await db.select().from(generators);
    const primaryGen = allGens[0];

    const recentFuel = await db.select().from(fuelEntries).orderBy(desc(fuelEntries.date)).limit(5);
    const recentRuns = await db.select().from(runEntries).orderBy(desc(runEntries.date)).limit(14);

    let defaultPrice = 1350;
    if (recentFuel.length > 0) {
      const spend = recentFuel.reduce((sum, f) => sum + f.totalCost, 0);
      const litres = recentFuel.reduce((sum, f) => sum + f.litres, 0);
      if (litres > 0) defaultPrice = Math.round(spend / litres);
    }

    let defaultHours = 6.0;
    if (recentRuns.length > 0) {
      const hours = recentRuns.reduce((sum, r) => sum + r.hours, 0);
      defaultHours = Number((hours / recentRuns.length).toFixed(1));
    }

    const initHours = input.dailyRunHours ?? defaultHours;
    const initPrice = input.fuelPricePerLitre ?? defaultPrice;
    const initLph = primaryGen?.litresPerHourTypical ?? 1.2;
    const initServicing = primaryGen?.servicingCostPerHour ?? 350;
    const genName = primaryGen?.name ?? "Primary Generator";

    const htmlContent = `
<div x-data="solarCalculator()" class="p-4 bg-card text-card-foreground rounded-xl border border-border space-y-5 font-sans">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border pb-3">
    <div>
      <h3 class="text-base font-bold text-foreground flex items-center gap-2">
        ☀️ Solar vs Generator Break-Even Simulator
      </h3>
      <p class="text-xs text-muted-foreground mt-0.5">
        Benchmarked on ${genName} (${initLph} L/h typical). Adjust sliders to view instant payback.
      </p>
    </div>
    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
      Interactive
    </span>
  </div>

  <!-- Key Metrics Banner -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg border border-border/50 text-center">
    <div class="p-2 bg-background rounded-md shadow-xs border border-border/40">
      <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Payback Time</div>
      <div class="text-xl font-extrabold text-emerald-600 mt-1" x-text="paybackText()"></div>
    </div>
    <div class="p-2 bg-background rounded-md shadow-xs border border-border/40">
      <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Monthly Gen Cost</div>
      <div class="text-lg font-bold text-rose-600 mt-1" x-text="formatNaira(monthlyGenSpend())"></div>
    </div>
    <div class="p-2 bg-background rounded-md shadow-xs border border-border/40">
      <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Monthly Savings</div>
      <div class="text-lg font-bold text-emerald-600 mt-1" x-text="formatNaira(monthlySavings())"></div>
    </div>
    <div class="p-2 bg-background rounded-md shadow-xs border border-border/40">
      <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">5-Year Net Benefit</div>
      <div class="text-lg font-bold text-foreground mt-1" x-text="formatNaira(fiveYearSavings())"></div>
    </div>
  </div>

  <!-- Controls Sliders -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Generator Inputs -->
    <div class="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/40">
      <div class="text-xs font-bold text-foreground flex items-center justify-between">
        <span>Daily Run Hours</span>
        <span class="text-amber-600 font-mono text-sm font-semibold" x-text="dailyHours + ' hrs/day'"></span>
      </div>
      <input type="range" min="1" max="18" step="0.5" x-model.number="dailyHours" class="w-full accent-amber-600 cursor-pointer" />

      <div class="text-xs font-bold text-foreground flex items-center justify-between pt-1">
        <span>Fuel Pump Price (N/L)</span>
        <span class="text-amber-600 font-mono text-sm font-semibold" x-text="formatNaira(fuelPrice) + '/L'"></span>
      </div>
      <input type="range" min="1000" max="2000" step="25" x-model.number="fuelPrice" class="w-full accent-amber-600 cursor-pointer" />

      <div class="text-xs font-bold text-foreground flex items-center justify-between pt-1">
        <span>Generator Consumption</span>
        <span class="text-muted-foreground font-mono text-xs" x-text="lph + ' L/hr'"></span>
      </div>
      <input type="range" min="0.5" max="3.0" step="0.1" x-model.number="lph" class="w-full accent-amber-600 cursor-pointer" />
    </div>

    <!-- Solar Inputs -->
    <div class="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/40">
      <div class="text-xs font-bold text-foreground flex items-center justify-between">
        <span>Solar System Capital Cost</span>
        <span class="text-emerald-600 font-mono text-sm font-semibold" x-text="formatNaira(solarCost)"></span>
      </div>
      <input type="range" min="1500000" max="8000000" step="100000" x-model.number="solarCost" class="w-full accent-emerald-600 cursor-pointer" />

      <div class="text-xs font-bold text-foreground flex items-center justify-between pt-1">
        <span>Battery Replacement Reserve</span>
        <span class="text-emerald-600 font-mono text-sm font-semibold" x-text="formatNaira(batteryCost)"></span>
      </div>
      <input type="range" min="400000" max="3000000" step="50000" x-model.number="batteryCost" class="w-full accent-emerald-600 cursor-pointer" />

      <div class="text-xs font-bold text-foreground flex items-center justify-between pt-1">
        <span>Battery Lifespan</span>
        <span class="text-muted-foreground font-mono text-xs" x-text="batteryLife + ' years'"></span>
      </div>
      <input type="range" min="2" max="8" step="1" x-model.number="batteryLife" class="w-full accent-emerald-600 cursor-pointer" />
    </div>
  </div>

  <!-- Cumulative 5-Year Bar Comparison -->
  <div class="p-3 bg-muted/30 rounded-lg border border-border/40 space-y-2">
    <div class="text-xs font-bold text-foreground">5-Year Cumulative Spend Comparison</div>
    <div class="space-y-2 text-xs">
      <div>
        <div class="flex justify-between text-muted-foreground mb-1">
          <span>Keep Burning Generator (Fuel + Servicing):</span>
          <span class="font-mono font-semibold text-rose-600" x-text="formatNaira(fiveYearGenSpend())"></span>
        </div>
        <div class="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div class="bg-rose-500 h-2.5 rounded-full" style="width: 100%"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-muted-foreground mb-1">
          <span>Switch to Solar (System + Battery Upkeep):</span>
          <span class="font-mono font-semibold text-emerald-600" x-text="formatNaira(fiveYearSolarSpend())"></span>
        </div>
        <div class="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div class="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" :style="'width: ' + Math.min(100, Math.round((fiveYearSolarSpend() / Math.max(1, fiveYearGenSpend())) * 100)) + '%'"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
    <div class="text-xs text-muted-foreground italic">
      Crossover payback: <strong class="text-foreground" x-text="paybackText()"></strong>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        @click="saveScenario()"
        class="text-xs font-semibold px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors cursor-pointer border border-border"
      >
        💾 Save Scenario
      </button>
      <button
        type="button"
        @click="askAgent()"
        class="text-xs font-semibold px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors cursor-pointer"
      >
        💬 Ask Agent About This
      </button>
    </div>
  </div>
</div>

<script>
function solarCalculator() {
  return {
    dailyHours: ${initHours},
    fuelPrice: ${initPrice},
    lph: ${initLph},
    servicingCph: ${initServicing},
    solarCost: 3800000,
    batteryCost: 1200000,
    batteryLife: 4,

    dailyFuelLitres() {
      return this.dailyHours * this.lph;
    },
    monthlyGenSpend() {
      const daily = (this.dailyFuelLitres() * this.fuelPrice) + (this.dailyHours * this.servicingCph);
      return Math.round(daily * 30);
    },
    monthlySolarEquiv() {
      return Math.round((this.batteryCost / Math.max(1, this.batteryLife)) / 12);
    },
    monthlySavings() {
      return this.monthlyGenSpend() - this.monthlySolarEquiv();
    },
    paybackMonths() {
      const savings = this.monthlySavings();
      if (savings <= 0) return null;
      return Math.ceil(this.solarCost / savings);
    },
    paybackText() {
      const m = this.paybackMonths();
      if (m === null) return 'No payback (costs exceed savings)';
      if (m < 12) return m + ' months';
      const yrs = (m / 12).toFixed(1);
      return m + ' months (' + yrs + ' yrs)';
    },
    fiveYearGenSpend() {
      return this.monthlyGenSpend() * 60;
    },
    fiveYearSolarSpend() {
      return this.solarCost + (this.monthlySolarEquiv() * 60);
    },
    fiveYearSavings() {
      return this.fiveYearGenSpend() - this.fiveYearSolarSpend();
    },
    formatNaira(amount) {
      if (isNaN(amount)) return 'N0';
      return 'N' + Math.round(amount).toLocaleString('en-US');
    },
    async saveScenario() {
      const label = 'Solar Simulation (' + this.dailyHours + 'h/d @ N' + this.fuelPrice + '/L)';
      if (typeof appAction === 'function') {
        try {
          await appAction('save-solar-quote', {
            label: label,
            systemCostNaira: this.solarCost,
            batteryReplacementCostNaira: this.batteryCost,
            batteryYearsLife: this.batteryLife,
            notes: 'Saved from interactive Generative UI simulator: ' + this.paybackText() + ' payback.'
          });
          alert('Scenario saved to your solar quotes!');
        } catch (e) {
          console.error(e);
          alert('Failed to save scenario: ' + e.message);
        }
      }
    },
    askAgent() {
      const msg = 'Based on my break-even calculation (generator burns ' + this.dailyHours + 'h/day at N' + this.fuelPrice + '/L, solar pays back in ' + this.paybackText() + '), what battery capacity and inverter brand should I look for in Lagos?';
      if (window.agentNative?.chat?.send) {
        window.agentNative.chat.send(msg, { submit: true });
      } else if (typeof sendToAgentChat === 'function') {
        sendToAgentChat({ message: msg, submit: true });
      }
    }
  };
}
</script>
`;

    return {
      content: htmlContent,
      name: "Solar Break-Even Simulator",
      description: "Interactive break-even tool with live sliders for generator fuel vs solar payback.",
      initialHeight: 460,
    };
  },
});
