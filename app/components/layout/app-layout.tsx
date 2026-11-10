import { useState, type ReactNode } from "react";
import { TopNav } from "./top-nav";
import { LogFuelModal } from "@/components/modals/log-fuel-modal";
import { LogRunModal } from "@/components/modals/log-run-modal";
import { HeaderActionsProvider } from "./HeaderActions";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const [fuelModalOpen, setFuelModalOpen] = useState<boolean>(false);
  const [runModalOpen, setRunModalOpen] = useState<boolean>(false);

  return (
    <HeaderActionsProvider>
      <div className="flex min-h-screen w-full flex-col bg-black font-mono text-neutral-100 antialiased selection:bg-neutral-800 selection:text-white">
        <TopNav
          onOpenFuelModal={() => setFuelModalOpen(true)}
          onOpenRunModal={() => setRunModalOpen(true)}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>

        <footer className="border-t border-neutral-900 bg-black/60 py-4 text-center">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-[11px] text-neutral-500 sm:flex-row sm:px-6">
            <span>power-desk · nigerian sme generator & solar ledger</span>
            <span>lagos operations · deterministic accounting</span>
          </div>
        </footer>

        <LogFuelModal
          isOpen={fuelModalOpen}
          onClose={() => setFuelModalOpen(false)}
        />

        <LogRunModal
          isOpen={runModalOpen}
          onClose={() => setRunModalOpen(false)}
        />
      </div>
    </HeaderActionsProvider>
  );
}

export { AppLayout as Layout };
