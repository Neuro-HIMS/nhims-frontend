"use client";

import { useSearchParams } from "next/navigation";

import { InventorySubNav } from "@/components/pharmacy/inventory/inventory-subnav";
import { MedicinesPage } from "@/components/pharmacy/inventory/medicines-page";
import { MovementsPage } from "@/components/pharmacy/inventory/movements-page";
import { SuppliersPage } from "@/components/pharmacy/inventory/suppliers/suppliers-page";
import { StockPage } from "@/components/pharmacy/inventory/stock/stock-page";

export function PharmacyInventoryShell() {
  const requested = useSearchParams().get("tab");
  const tab = requested && ["stock", "movements", "medicines", "suppliers"].includes(requested) ? requested : "stock";

  return (
    <div className="space-y-6">
      <InventorySubNav />
      {tab === "suppliers" && <SuppliersPage />}
      {tab === "stock" && <StockPage />}
      {tab === "movements" && <MovementsPage />}
      {tab === "medicines" && <MedicinesPage />}
    </div>
  );
}
