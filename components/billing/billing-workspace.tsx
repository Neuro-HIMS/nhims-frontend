"use client";

import { useSearchParams } from "next/navigation";
import { Receipt } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { BillingDashboardView } from "@/components/billing/views/billing-dashboard-view";
import { BillsView } from "@/components/billing/views/bills-view";
import { NewBillView } from "@/components/billing/views/new-bill-view";
import { BillDetailView } from "@/components/billing/views/bill-detail-view";
import { PaymentsView } from "@/components/billing/views/payments-view";

const SUB_NAV = [
  { label: "Dashboard", view: "dashboard", href: "/billing?view=dashboard" },
  { label: "Bills & Invoices", view: "bills", href: "/billing?view=bills" },
  { label: "New Bill", view: "new", href: "/billing?view=new" },
  { label: "Payments", view: "payments", href: "/billing?view=payments" },
];

export function BillingWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "dashboard";
  const billId = searchParams.get("billId");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cashier workflow for invoices, charges, and payments. Tracks every service rendered to a patient — lab,
            medication, imaging, consultation — under one bill per visit.
          </p>
        </div>
      </div>

      <ModuleSubNav items={SUB_NAV} basePath="/billing" />

      <div className="pt-2">
        {view === "dashboard" && <BillingDashboardView />}
        {view === "bills" && (billId ? <BillDetailView billId={billId} /> : <BillsView />)}
        {view === "new" && <NewBillView />}
        {view === "payments" && <PaymentsView />}
      </div>
    </div>
  );
}
