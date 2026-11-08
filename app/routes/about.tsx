import { Link } from "react-router";
import { useSetPageTitle } from "@/components/layout/HeaderActions";
import { APP_TITLE } from "@/lib/app-config";
import {
  IconInfoCircle,
  IconScale,
  IconFlame,
  IconSun,
  IconDeviceMobile,
  IconExternalLink,
  IconShieldCheck,
  IconCpu,
  IconFileText,
  IconCheck,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function meta() {
  return [
    { title: `About & Honesty - ${APP_TITLE}` },
    {
      name: "description",
      content:
        "Transparent disclosures, real-world Nigerian fuel benchmarks, mechanical engineering consumption model, and Agent-Native architecture.",
    },
  ];
}

export default function AboutRoute() {
  useSetPageTitle("About & Honesty");

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            About Power Desk
          </h1>
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
          >
            Built for Builder.io Hackathon
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          A fuel and generator ledger for Nigerian small businesses operated by texting an agent on Telegram, spotting unexplained fuel variance and showing when solar pays back.
        </p>
      </div>

      {/* 1. Core Data Honesty Policy */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <IconShieldCheck className="size-5 text-amber-600 dark:text-amber-400" />
            Non-Negotiable Data Honesty Policy
          </CardTitle>
          <CardDescription className="text-xs text-amber-800/80 dark:text-amber-300/80">
            Transparent disclosure of sample data and zero fabricated metrics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
          <p>
            <strong>1. Synthetic Sample Data:</strong> The pre-loaded business (<em>"Sample: Adewale Provisions Store, Lagos"</em>), its two generators, fuel receipts, and run hours are clearly badged with <code>is_sample = true</code> and a prominent 🧪 Sample tag in the UI. They represent a realistic demonstration scenario based on actual market prices in Lagos.
          </p>
          <p>
            <strong>2. Real User Data Segregation:</strong> Any entries submitted through the Web interface or the Telegram bot are permanently stored with <code>is_sample = false</code> and <code>source = 'web' | 'telegram'</code>. The sample data can be toggled on/off or re-seeded in Settings at any time without touching user records.
          </p>
          <p>
            <strong>3. Zero Fabricated Claims:</strong> We do not publish fake testimonials, inflated user counts, or simulated customer case studies. All economic metrics are computed deterministically from verified sources and user entries.
          </p>
          <p>
            <strong>4. Neutral Variance Language:</strong> Fuel discrepancies are strictly designated as <strong>"unexplained variance"</strong>. The system never uses accusatory language like "theft" or "fraud". It serves as an objective operational prompt to inspect legitimate physical factors such as stored jerrycans, tank carry-over, or increased cooling loads.
          </p>
        </CardContent>
      </Card>

      {/* 2. Sourced Real-World Anchors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IconScale className="size-5 text-emerald-600" />
            Verified Economic & Technical Citations
          </CardTitle>
          <CardDescription className="text-xs">
            Every parameter and benchmark in Power Desk is derived from verified official publications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground">
                1. Nigerian Fuel Prices (NBS PMS Price Watch)
              </span>
              <a
                href="https://nairametrics.com/2026/05/29/petrol-price-jumps-19-to-n1533-litre-in-april-nbs/"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline text-[11px] flex items-center gap-1 font-medium"
              >
                NBS Report via Nairametrics
                <IconExternalLink className="size-3" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              National Bureau of Statistics reported the national average Premium Motor Spirit (PMS/petrol) retail price at <strong>₦1,532.93/L in April 2026</strong> (up 18.97% from March ₦1,288.54). In Lagos, major filling stations retailed petrol between <strong>₦1,200 and ₦1,350/L in May 2026</strong>.
            </p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground">
                2. Generator Physics Baseline (3.2 kVA Petrol Set)
              </span>
              <a
                href="https://www.sitebox.ltd.uk/docs/wilkinsonstar/pdf/35.CJ6G5010.pdf"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline text-[11px] flex items-center gap-1 font-medium"
              >
                GE 3500 KBM Spec Sheet
                <IconExternalLink className="size-3" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Certified manufacturer bench testing for a standard 3.2 kVA petrol generator (GE 3500 KBM class) specifies a consumption rate of <strong>1.2 L/h at 75% of prime rating</strong>. With its 4.0 L mounted tank, one fill-up delivers ~3.3 hours of runtime. Jerrycan purchases (10L, 25L, 50L) allow external storage.
            </p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground">
                3. Macroeconomic Generator Spend (SEforALL & Lagos State)
              </span>
              <a
                href="https://nairametrics.com/2024/10/11/small-business-owners-in-lagos-spend-n5-3-trillion-annually-on-fueling-generators-report"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline text-[11px] flex items-center gap-1 font-medium"
              >
                SEforALL Lagos MSME Study
                <IconExternalLink className="size-3" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sustainable Energy for All (SEforALL) in partnership with the Lagos State Government reports that micro, small, and medium enterprises (MSMEs) in Lagos alone spend an estimated <strong>₦5.3 Trillion annually</strong> on generator fueling (consuming approximately 6.6 billion litres of fuel).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. The Mechanical Engineering Consumption Model */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IconFlame className="size-5 text-amber-500" />
            Generator Consumption & Variance Engine
          </CardTitle>
          <CardDescription className="text-xs">
            Engineered by Muhammed (Lagos), mechanical engineer and web developer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Nigerian small businesses frequently manage backup generators using informal paper notebooks or memory. Power Desk translates thermodynamic engine principles into intuitive software:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg bg-muted/50 p-2.5">
              <span className="font-bold text-foreground block mb-1">Load Bands</span>
              Accounts for operating states: Light (&lt;50% load: ~0.8 L/h), Typical (75% prime rating: 1.2 L/h baseline), and Heavy (100% full rating: ~1.6 L/h).
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <span className="font-bold text-foreground block mb-1">Variance Thresholds</span>
              Calculates expected burn: <code>hours × litresPerHour</code>. Flags unexplained discrepancies beyond the configured tolerance band (default 15%).
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <span className="font-bold text-foreground block mb-1">Total Operating Cost</span>
              Combines direct fuel burn at current pump prices with engine maintenance and oil change wear (₦150/run-hour).
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Agent-Native Architecture */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IconCpu className="size-5 text-sky-600" />
            Agent-Native Architectural Primitives
          </CardTitle>
          <CardDescription className="text-xs">
            Strict adherence to the four-area parity contract: UI, Actions, Skills, and Application State.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-md border border-border p-2.5 bg-card">
              <strong className="text-foreground block">defineAction Single Source of Truth:</strong>
              16 orthogonal actions in <code>actions/</code> provide typed runtime contracts serving the Telegram agent, React Query hooks, and REST HTTP simultaneously.
            </div>
            <div className="rounded-md border border-border p-2.5 bg-card">
              <strong className="text-foreground block">Shared PostgreSQL via Drizzle:</strong>
              Local embedded PGlite for deterministic offline development and zero-configuration setups; switches to Neon PostgreSQL via <code>DATABASE_URL</code> in cloud production.
            </div>
            <div className="rounded-md border border-border p-2.5 bg-card">
              <strong className="text-foreground block">Zero Inline LLM Calls:</strong>
              Actions are 100% deterministic arithmetic and database logic. All reasoning and tool coordination is performed by the agent through the framework chat loop.
            </div>
            <div className="rounded-md border border-border p-2.5 bg-card">
              <strong className="text-foreground block">Generative UI:</strong>
              The agent renders interactive, sandboxed Alpine.js + Tailwind widgets inline in chat to let users simulate solar break-even on the fly.
            </div>
            <div className="rounded-md border border-border p-2.5 bg-card">
              <strong className="text-foreground block">Real-Time Sync (SSE):</strong>
              Mutating actions automatically trigger SSE change notifications, keeping ledger, KPIs, and variance screens updated without manual browser refresh.
            </div>
            <div className="rounded-md border border-border p-2.5 bg-card">
              <strong className="text-foreground block">Autonomous Scheduled Jobs:</strong>
              Automations in <code>jobs/</code> run weekly summaries and daily nudges, delivering actionable updates directly to Telegram.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action links */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" asChild size="sm" className="text-xs">
          <Link to="/">← Back to Desk</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild size="sm" className="text-xs">
            <Link to="/break-even">Simulate Solar Payback</Link>
          </Button>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs">
            <Link to="/ledger">Open Ledger</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
