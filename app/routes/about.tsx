import { Link } from "react-router";
import { APP_TITLE } from "@/lib/app-config";

export function meta() {
  return [
    { title: "About & Honesty - Power Desk" },
    {
      name: "description",
      content: "Operational principles, mechanical engineering consumption model, and data honesty charter.",
    },
  ];
}

export default function AboutRoute() {
  return (
    <div className="flex flex-col gap-6 font-mono text-neutral-100">
      <div className="border-b border-neutral-900 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-white">about & data honesty charter</h1>
        <p className="mt-0.5 text-xs text-neutral-400">
          operational philosophy, mechanical engineering fuel model, and data integrity standards
        </p>
      </div>

      <div className="border border-neutral-900 bg-neutral-950 p-4">
        <span className="text-xs uppercase tracking-wider text-sky-400">1. data honesty standard</span>
        <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-neutral-300">
          <p>
            Power Desk strictly isolates benchmark demonstration data from real business activity. All seeded records carry a permanent <code>is_sample = true</code> flag in the database and display visual badges.
          </p>
          <p>
            Every user-logged entry via Telegram or Web defaults strictly to <code>is_sample = false</code>. Seed data can be toggled off entirely in settings at any moment without altering business records.
          </p>
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950 p-4">
        <span className="text-xs uppercase tracking-wider text-neutral-400">2. neutral variance investigation protocol</span>
        <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-neutral-300">
          <p>
            Fuel accounting in small businesses is susceptible to accusatory conflict. Power Desk mandates the phrase <strong>"unexplained variance"</strong> and prohibits accusatory terminology.
          </p>
          <p>
            When litres bought exceed run-time expectations beyond tolerance, the ledger presents verifiable operational explanations first:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-neutral-400">
            <li>Jerrycan reserve storage (fuel purchased for later emergency use)</li>
            <li>Tank carry-over from prior weekly accounting cycles</li>
            <li>Heavy inductive load (deep freezers, water pumps, chillers)</li>
            <li>Missing runtime logs where the generator ran without attendant logging</li>
          </ul>
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950 p-4">
        <span className="text-xs uppercase tracking-wider text-neutral-400">3. deterministic mechanical engineering formulas</span>
        <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-neutral-300">
          <p>
            Expected consumption is determined strictly by mechanical rating curves:
          </p>
          <div className="border border-neutral-900 bg-black/50 p-3 font-mono text-[11px] text-neutral-200">
            Expected Litres = Operating Hours × Load Band Consumption Rate (L/h)
          </div>
          <div className="border border-neutral-900 bg-black/50 p-3 font-mono text-[11px] text-neutral-200">
            Solar Payback Months = Total Upfront System Cost ÷ Net Monthly Operational Savings
          </div>
          <p className="text-[11px] text-neutral-500">
            All formulas are deterministic and inspectable without inline model hallucinations.
          </p>
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950 p-4">
        <span className="text-xs uppercase tracking-wider text-neutral-400">4. lagos operational context</span>
        <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-neutral-300">
          <p>
            Power Desk is built around Nigerian commercial power realities: pump price fluctuations, frequent grid shed, and high reliance on backup petrol and diesel generators.
          </p>
        </div>
      </div>
    </div>
  );
}
