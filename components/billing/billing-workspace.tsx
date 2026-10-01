"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FilePlus2 } from "lucide-react";

import { BillDetailView } from "@/components/billing/views/bill-detail-view";
import { BillingDashboardView } from "@/components/billing/views/billing-dashboard-view";
import { BillsView } from "@/components/billing/views/bills-view";
import { NewBillView } from "@/components/billing/views/new-bill-view";
import { PaymentsView } from "@/components/billing/views/payments-view";
import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
import { Button } from "@/components/ui/button";

const SUB_NAV = [
  { label: "Overview", view: "dashboard", href: "/billing?view=dashboard" },
  { label: "Bills", view: "bills", href: "/billing?view=bills" },
  { label: "Payments", view: "payments", href: "/billing?view=payments" },
];

const VIEWS = ["dashboard", "bills", "payments", "new"];

/** Cashier: page → workspace → view. One bill (`view=bills&billId=`) replaces the tabs. */
export function BillingWorkspace() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view");
  const view = requested && VIEWS.includes(requested) ? requested : "dashboard";
  const billId = searchParams.get("billId");

  if (view === "bills" && billId) return <BillDetailView billId={billId} />;
  if (view === "new") return <NewBillView />;

  return (
    <div className="space-y-4">
      <PageCard
        title="Bills and payments"
        description="Create bills, take payments and print receipts."
        actions={
          <Button asChild>
            <Link href="/billing?view=new">
              <FilePlus2 className="mr-1.5 h-4 w-4" /> New bill
            </Link>
          </Button>
        }
      />
      <ModuleSubNav items={SUB_NAV} basePath="/billing" />
      <div className="pt-2">
        {view === "dashboard" && <BillingDashboardView />}
        {view === "bills" && <BillsView />}
        {view === "payments" && <PaymentsView />}
      </div>
    </div>
  );
}
