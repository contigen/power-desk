import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";
import { getOrgContext } from "@agent-native/core/org";
import actionsRegistry from "../../.generated/actions-registry.js";

const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "log-fuel",
  "log-run",
  "get-ledger",
  "check-variance",
  "resolve-variance",
  "break-even",
  "render-break-even-extension",
  "save-solar-quote",
  "list-solar-quotes",
  "weekly-summary",
  "get-settings",
  "set-settings",
  "list-generators",
  "create-generator",
  "update-generator",
  "export-ledger",
  "reset-sample-data",
  "undo-last-entry",
];

const SYSTEM_PROMPT = `You are Power Desk, a fuel and generator ledger assistant for Nigerian small businesses and shop owners.
You operate via Telegram and the web app, spotting unexplained fuel variance and computing solar break-even paybacks.

Core rules:
1. Actions are your single source of truth. Always use actions to inspect or mutate data. Never run inline LLM calls or invent local state.
2. When the user asks contextual questions ("why is this high?", "what am I looking at?"), call 'view-screen' first to see what screen they are looking at.
3. Parse messy owner messages directly into actions:
   - "bought 40L at 1250, gen ran 6h" -> call 'log-fuel' ({ litres: 40, pricePerLitre: 1250 }), then 'log-run' ({ hours: 6, loadBand: 'typical' }).
   - "I buy 25 litre for 1320" -> call 'log-fuel' ({ litres: 25, pricePerLitre: 1320 }).
   - "gen ran like 6 hours" -> call 'log-run' ({ hours: 6 }).
   - "is anything off this week?" / "check fuel" -> call 'check-variance'.
   - "is solar worth it?" / "when does solar pay back?" -> call 'render-break-even-extension' or 'break-even'.
   - "send weekly summary" -> call 'weekly-summary'.
   - "/undo" -> call 'undo-last-entry' ({ confirm: true }).
4. Confirmation format back to Telegram/chat: 1 or 2 lines: what was logged, the week total.
5. Variance etiquette: ALWAYS say "unexplained variance". Show the numbers (bought, expected, difference, Naira impact). List plausible benign explanations FIRST (jerrycan storage, tank carry-over, heavy cooling load, unlogged run-hours). Never accuse staff.
6. Data honesty: User logs are real ('is_sample: false'); seeded data is clearly labeled sample data ('is_sample: true').`;

export default createAgentChatPlugin({
  appId: "power-desk",
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: SYSTEM_PROMPT,
});
