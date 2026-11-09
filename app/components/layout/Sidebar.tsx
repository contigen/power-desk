import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  IconDashboard,
  IconReceipt2,
  IconAlertTriangle,
  IconSun,
  IconBolt,
  IconSettings,
  IconInfoCircle,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { APP_TITLE } from "@/lib/app-config";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const navItems = [
  {
    icon: IconDashboard,
    label: "Desk & Chat",
    href: "/",
    description: "Week glance & agent chat",
  },
  {
    icon: IconReceipt2,
    label: "Ledger",
    href: "/ledger",
    description: "Fuel purchases & run hours",
  },
  {
    icon: IconAlertTriangle,
    label: "Variance",
    href: "/variance",
    description: "Unexplained fuel variance flags",
  },
  {
    icon: IconSun,
    label: "Break-Even",
    href: "/break-even",
    description: "Solar payback simulator",
  },
  {
    icon: IconBolt,
    label: "Generators",
    href: "/generators",
    description: "Gen ratings & consumption specs",
  },
  {
    icon: IconSettings,
    label: "Settings",
    href: "/settings",
    description: "Tolerance, Telegram & automations",
  },
  {
    icon: IconInfoCircle,
    label: "About & Honesty",
    href: "/about",
    description: "Data disclosures & sources",
  },
];

interface SidebarProps {
  collapsed?: boolean;
  collapsible?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  collapsed = false,
  collapsible = true,
  onCollapsedChange,
}: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 select-none",
        collapsed ? "w-14" : "w-60"
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "h-14 justify-center px-0" : "h-14 px-4 justify-between"
        )}
      >
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white font-black shadow-xs">
            <IconBolt className="size-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-extrabold text-sm tracking-tight text-foreground block">
                {APP_TITLE}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block -mt-0.5">
                Fuel & Solar Ledger
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Nav Items */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto space-y-1",
          collapsed ? "px-1.5 py-3" : "px-3 py-3"
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? location.pathname === "/" || location.pathname.startsWith("/chat/")
              : location.pathname.startsWith(item.href);

          const link = (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0 py-2.5"
              )}
            >
              <Icon className={cn("size-4 shrink-0", isActive ? "text-primary-foreground" : "text-amber-600/80 group-hover:text-primary")} />
              {!collapsed && (
                <div className="min-w-0 flex-1 truncate">
                  <span className="block truncate">{item.label}</span>
                </div>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* Footer / Collapse Toggle */}
      <div className="mt-auto shrink-0 border-t border-sidebar-border p-2">
        {!collapsed && (
          <div className="px-2.5 py-2 mb-1.5 rounded-md border border-border bg-muted/40 text-[11px] leading-tight text-foreground">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Lagos Operations</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Operate via Telegram or Web</p>
          </div>
        )}

        {collapsible && (
          <button
            type="button"
            onClick={() => onCollapsedChange?.(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex h-8 w-full cursor-pointer items-center rounded-md text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors",
              collapsed ? "justify-center" : "justify-between px-2.5"
            )}
          >
            {!collapsed && <span className="text-[11px] font-medium">Collapse Menu</span>}
            {collapsed ? (
              <IconLayoutSidebarLeftExpand className="size-4" />
            ) : (
              <IconLayoutSidebarLeftCollapse className="size-4" />
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
