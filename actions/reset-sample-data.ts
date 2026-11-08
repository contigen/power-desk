import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { runSeed } from "../scripts/seed.js";

export default defineAction({
  description:
    "Reset sample generator dataset. Wipes only rows marked as is_sample = true and reseeds 30 days of realistic benchmark data. Preserves all real entries logged by the user.",
  schema: z.object({}),
  http: { method: "POST" },
  run: async () => {
    await runSeed();
    return {
      success: true,
      message:
        "Sample dataset has been reset (Gen A 3.2kVA, Gen B 2.5kVA, 30 days of fuel and run records, 2 variance flags). Real entries were preserved.",
    };
  },
});
