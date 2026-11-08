import { useLocation } from "react-router";
import { IconMenu2 } from "@tabler/icons-react";
import { useHeaderTitle, useHeaderActions } from "./HeaderActions";
import { useT } from "@agent-native/core/client/i18n";
import { AgentToggleButton } from "@agent-native/toolkit/app/chat";
import { APP_TITLE } from "@/lib/app-config";

const pageTitleKeys: Record<string, string> = {
  "/": "Desk & Agent",
  "/ledger": "Fuel & Run Ledger",
  "/variance": "Fuel Variance Analysis",
  "/break-even": "Solar Break-Even Simulator",
  "/generators": "Generators Inventory",
  "/settings": "Settings & Automations",
  "/about": "About & Honesty Disclosures",
};

function resolveTitle(pathname: string): string {
  if (pageTitleKeys[pathname]) return pageTitleKeys[pathname];
  if (pathname.startsWith("/ledger")) return "Fuel & Run Ledger";
  if (pathname.startsWith("/variance")) return "Fuel Variance Analysis";
  if (pathname.startsWith("/break-even")) return "Solar Break-Even Simulator";
  if (pathname.startsWith("/generators")) return "Generators Inventory";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/about")) return "About & Honesty Disclosures";
  return APP_TITLE;
}

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const location = useLocation();
  const t = useT();
  const title = useHeaderTitle();
  const actions = useHeaderActions();

  return (
    <header className="flex h-13 items-center gap-3 border-b border-border bg-card/60 backdrop-blur-xs px-4 lg:px-6 shrink-0">
      {onOpenMobileSidebar && (
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label={t("navigation.openNavigation")}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent md:hidden"
        >
          <IconMenu2 className="h-5 w-5" />
        </button>
      )}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {title ?? (
          <h1 className="text-base font-bold text-foreground tracking-tight truncate">
            {resolveTitle(location.pathname)}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <AgentToggleButton />
      </div>
    </header>
  );
}
