"use client";

import { useSearchParams } from "next/navigation";
import { Landmark } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { FinanceDashboard } from "@/components/finance/views/finance-dashboard";
import { ServiceCatalogView } from "@/components/finance/views/service-catalog-view";
import { PricingMatrixView } from "@/components/finance/views/pricing-matrix-view";
import { BillingView } from "@/components/finance/views/billing-view";
import { PaymentsView } from "@/components/finance/views/payments-view";
import { NhisClaimsView } from "@/components/finance/views/nhis-claims-view";
import { RevenueView } from "@/components/finance/views/revenue-view";
import { NhisReportsView } from "@/components/finance/views/nhis-reports-view";

const SUB_NAV = [
  { label: "Dashboard",       view: "dashboard",   href: "/finance?view=dashboard" },
  { label: "Service Catalog", view: "catalog",     href: "/finance?view=catalog" },
  { label: "Pricing Matrix",  view: "pricing",     href: "/finance?view=pricing" },
  { label: "Billing",         view: "billing",     href: "/finance?view=billing" },
  { label: "Payments",        view: "payments",    href: "/finance?view=payments" },
  { label: "NHIS Claims",     view: "nhis-claims", href: "/finance?view=nhis-claims" },
  { label: "Revenue",         view: "revenue",     href: "/finance?view=revenue" },
  { label: "NHIS Reports",    view: "nhis-reports",href: "/finance?view=nhis-reports" },
];

export function FinanceWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "dashboard";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Landmark className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Service catalog with consistent service names, payer-aware pricing (NHIS · IGF · Cash · private insurers),
            billing, Mobile Money + cash receipts, NHIS claims pipeline, and revenue stream attribution (IGF, NHIS,
            donor, capitation).
          </p>
        </div>
      </div>

      <ModuleSubNav items={SUB_NAV} basePath="/finance" />

      <div className="pt-2">
        {view === "dashboard" && <FinanceDashboard />}
        {view === "catalog" && <ServiceCatalogView />}
        {view === "pricing" && <PricingMatrixView />}
        {view === "billing" && <BillingView />}
        {view === "payments" && <PaymentsView />}
        {view === "nhis-claims" && <NhisClaimsView />}
        {view === "revenue" && <RevenueView />}
        {view === "nhis-reports" && <NhisReportsView />}
      </div>
    </div>
  );
}
