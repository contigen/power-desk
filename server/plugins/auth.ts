import { createAuthPlugin } from "@agent-native/core/server";

const appTitle = "Power Desk";

export default createAuthPlugin({
  rootAuth: false,
  publicPaths: [
    "/",
    "/home",
    "/ledger",
    "/variance",
    "/break-even",
    "/generators",
    "/settings",
    "/about",
  ],
  marketing: {
    appName: appTitle,
    tagline:
      "A fuel and generator ledger for Nigerian small businesses operated via Telegram, spotting unexplained fuel variance and calculating solar break-even.",
    features: [
      "Track generator run-hours and fuel purchases in Nigerian Naira",
      "Spot unexplained fuel variance with benign operational checks",
      "Calculate 5-year solar and battery break-even paybacks with Generative UI",
    ],
  },
});
