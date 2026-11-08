import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, Link } from "react-router";
import { useCallback, useState } from "react";
import { useNavigationState } from "@/hooks/use-navigation-state";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useDbSync } from "@agent-native/core/client/hooks";
import { createAgentNativeQueryClient } from "@agent-native/core/client/hooks";
import { appPath } from "@agent-native/core/client/api-path";
import { configureTracking } from "@agent-native/core/client/analytics";
import { getLocaleInitScript, useT } from "@agent-native/core/client/i18n";
import { getThemeInitScript } from "@agent-native/core/client/theme";
import { AppProviders } from "@agent-native/toolkit/app/providers";
import { CommandMenu, useCommandMenuShortcut } from "@agent-native/toolkit/app/shared";
import { IconSun, IconMoon } from "@tabler/icons-react";
import changelog from "../CHANGELOG.md?raw";
import { Layout as AppLayout } from "@/components/layout/Layout";
import { TAB_ID } from "@/lib/tab-id";
import { APP_TITLE } from "@/lib/app-config";
import type { LinksFunction } from "react-router";
import stylesheet from "./global.css?url";
import { i18nCatalog } from "./i18n";

configureTracking({
  getDefaultProps: (_name, properties) => ({
    ...properties,
    app: "power-desk",
    template: "chat",
  }),
});

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

const THEME_INIT_SCRIPT = getThemeInitScript();
const LOCALE_INIT_SCRIPT = getLocaleInitScript();

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <script
          data-agent-native-locale-init
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }}
        />
        <link rel="manifest" href={appPath("/manifest.json")} />
        <meta name="theme-color" content="#d97706" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content={APP_TITLE} />
        <link rel="icon" type="image/svg+xml" href={appPath("/favicon.svg")} />
        <link rel="apple-touch-icon" href={appPath("/icon-180.svg")} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function DbSyncSetup() {
  const qc = useQueryClient();
  useNavigationState();
  useDbSync({
    queryClient: qc,
    ignoreSource: TAB_ID,
  });
  return null;
}

function ThemeToggleItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const isDark = resolvedTheme === "dark";
  return (
    <CommandMenu.Item
      onSelect={() => setTheme(isDark ? "light" : "dark")}
      keywords={["theme", "dark", "light", "mode"]}
    >
      {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
      {t("root.toggleTheme")}
    </CommandMenu.Item>
  );
}

function AppContent() {
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const t = useT();
  useCommandMenuShortcut(useCallback(() => setCmdkOpen(true), []));
  return (
    <>
      <CommandMenu
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        changelog={changelog}
        changelogKey="chat"
      >
        <CommandMenu.Group heading={t("root.commandActions")}>
          <CommandMenu.Item onSelect={() => {}}>
            {t("root.commandSearch")}
          </CommandMenu.Item>
        </CommandMenu.Group>
        <CommandMenu.Group heading={t("root.commandAppearance")}>
          <ThemeToggleItem />
        </CommandMenu.Group>
      </CommandMenu>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </>
  );
}

export default function Root() {
  const [queryClient] = useState(() => createAgentNativeQueryClient());
  return (
    <AppProviders queryClient={queryClient} i18n={{ catalog: i18nCatalog }}>
      <DbSyncSetup />
      <AppContent />
    </AppProviders>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  console.error("Application error:", error);
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <div className="max-w-md space-y-4">
        <div className="size-14 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-2xl font-bold">
          ⚡
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {is404 ? "Page Not Found (404)" : "Application Error"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {is404
            ? "The page or route you are looking for does not exist."
            : (error as Error)?.message ?? "An unexpected error occurred."}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Return to Desk
          </Link>
          {!is404 && (
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
