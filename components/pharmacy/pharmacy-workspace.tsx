"use client";

import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
import { PharmacyInventoryShell } from "@/components/pharmacy/inventory/pharmacy-inventory-shell";
import { DispenseView } from "@/components/pharmacy/views/dispense-view";
import { PharmacyFindView } from "@/components/pharmacy/views/pharmacy-find-view";
import { PharmacyQueueView } from "@/components/pharmacy/views/pharmacy-queue-view";

const SUB_NAV = [
  { label: "Prescriptions waiting", view: "queue", href: "/pharmacy?view=queue" },
  { label: "Find a patient", view: "search", href: "/pharmacy?view=search" },
  { label: "Stock", view: "inventory", href: "/pharmacy?view=inventory&tab=stock" },
];

const VIEWS = ["queue", "search", "inventory", "dispense"];

/** Pharmacy: page → workspace → view. One prescription (`view=dispense&prescriptionId=`) replaces the tabs. */
export function PharmacyWorkspace() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view");
  const view = requested && VIEWS.includes(requested) ? requested : "queue";

  if (view === "dispense") return <DispenseView />;

  return (
    <div className="space-y-4">
      <PageCard title="Pharmacy" description="Dispense prescriptions and manage stock." />
      <ModuleSubNav items={SUB_NAV} basePath="/pharmacy" />
      <div className="pt-2">
        {view === "queue" && <PharmacyQueueView />}
        {view === "search" && <PharmacyFindView />}
        {view === "inventory" && <PharmacyInventoryShell />}
      </div>
    </div>
  );
}
