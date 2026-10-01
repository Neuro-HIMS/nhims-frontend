"use client";

import { useSearchParams } from "next/navigation";

import { ClaimView } from "@/components/finance/views/claim-view";
import { FinanceDashboard } from "@/components/finance/views/finance-dashboard";
import { NhisClaimsView } from "@/components/finance/views/nhis-claims-view";
import { NhisReportsView } from "@/components/finance/views/nhis-reports-view";
import { OldPricesView } from "@/components/finance/views/old-prices-view";
import { RevenueView } from "@/components/finance/views/revenue-view";
import { ServicesPricesView } from "@/components/finance/views/services-prices-view";
import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";

const SUB_NAV = [
  { label: "Overview", view: "dashboard", href: "/finance?view=dashboard" },
  { label: "Services and prices", view: "catalog", href: "/finance?view=catalog" },
  { label: "Revenue", view: "revenue", href: "/finance?view=revenue" },
  { label: "NHIS claims", view: "nhis-claims", href: "/finance?view=nhis-claims" },
  { label: "NHIS reports", view: "nhis-reports", href: "/finance?view=nhis-reports" },
  { label: "Old prices", view: "old-prices", href: "/finance?view=old-prices" },
];

// Old links: the pricing matrix is now part of "Services and prices"; bills and payments live in /billing.
const ALIASES: Record<string, string> = { pricing: "catalog" };
const VIEWS = ["dashboard", "catalog", "revenue", "nhis-claims", "nhis-reports", "old-prices", "claim"];

/** Finance: page → workspace → view. One claim (`view=claim&claimId=`) replaces the tabs. */
export function FinanceWorkspace() {
  const params = useSearchParams();
  const raw = params.get("view") ?? "dashboard";
  const requested = ALIASES[raw] ?? raw;
  const view = VIEWS.includes(requested) ? requested : "dashboard";

  if (view === "claim") return <ClaimView />;

  return (
    <div className="space-y-4">
      <PageCard title="Prices and revenue" description="Set prices, track money coming in and manage NHIS claims." />
      <ModuleSubNav items={SUB_NAV} basePath="/finance" />
      <div className="pt-2">
        {view === "dashboard" && <FinanceDashboard />}
        {view === "catalog" && <ServicesPricesView />}
        {view === "revenue" && <RevenueView />}
        {view === "nhis-claims" && <NhisClaimsView />}
        {view === "nhis-reports" && <NhisReportsView />}
        {view === "old-prices" && <OldPricesView />}
      </div>
    </div>
  );
}
