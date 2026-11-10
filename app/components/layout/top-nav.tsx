import { useState } from "react";
import { Link, useLocation } from "react-router";
import { IconMenu2, IconX, IconPlus } from "@tabler/icons-react";
import { useActionQuery } from "@agent-native/core/client/hooks";

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: readonly NavItem[] = [
  { label: "desk", href: "/" },
  { label: "ledger", href: "/ledger" },
  { label: "variance", href: "/variance" },
  { label: "break-even", href: "/break-even" },
  { label: "generators", href: "/generators" },
  { label: "settings", href: "/settings" },
  { label: "about", href: "/about" },
];

type TopNavProps = {
  onOpenFuelModal: () => void;
  onOpenRunModal: () => void;
};

export function TopNav({ onOpenFuelModal, onOpenRunModal }: TopNavProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: settings } = useActionQuery("get-settings", {});

  const isSampleData = settings?.showSampleData ?? true;

  function isActive(href: string): boolean {
    if (href === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/chat/") || location.pathname === "/home";
    }
    return location.pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-900 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-white hover:text-neutral-300"
          >
            <span className="inline-block size-2 bg-sky-400" />
            <span>power-desk</span>
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`font-mono text-xs tracking-tight transition-colors ${
                    active
                      ? "font-medium text-white underline decoration-sky-400 decoration-2 underline-offset-8"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`hidden font-mono text-[11px] uppercase tracking-wider sm:inline-block ${
              isSampleData ? "text-amber-400/80" : "text-emerald-400/80"
            }`}
          >
            {isSampleData ? "sample benchmarks" : "live entries"}
          </span>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={onOpenFuelModal}
              className="flex items-center gap-1.5 border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-xs text-neutral-200 transition-colors hover:border-neutral-600 hover:text-white"
            >
              <IconPlus className="size-3 text-sky-400" />
              <span>log fuel</span>
            </button>

            <button
              type="button"
              onClick={onOpenRunModal}
              className="flex items-center gap-1.5 border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-xs text-neutral-200 transition-colors hover:border-neutral-600 hover:text-white"
            >
              <IconPlus className="size-3 text-sky-400" />
              <span>log run</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex size-9 items-center justify-center border border-neutral-800 bg-neutral-950 text-neutral-300 md:hidden"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <IconX className="size-4" /> : <IconMenu2 className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-b border-neutral-900 bg-black px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`font-mono text-xs tracking-tight ${
                    active ? "font-semibold text-white" : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-neutral-900 pt-4">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenFuelModal();
              }}
              className="flex w-full items-center justify-center gap-1.5 border border-neutral-800 bg-neutral-950 py-2 font-mono text-xs text-neutral-200"
            >
              <IconPlus className="size-3 text-sky-400" />
              <span>log fuel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenRunModal();
              }}
              className="flex w-full items-center justify-center gap-1.5 border border-neutral-800 bg-neutral-950 py-2 font-mono text-xs text-neutral-200"
            >
              <IconPlus className="size-3 text-sky-400" />
              <span>log run</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
