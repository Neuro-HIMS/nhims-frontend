"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { Button } from "@/components/ui/button";
import type { PharmacySupplierDto } from "@/types/pharmacy-inventory.types";

type SortKey = "name" | "country" | "updatedAt";

interface SuppliersTableProps {
  rows: PharmacySupplierDto[];
  onEdit: (row: PharmacySupplierDto) => void;
}

export function SuppliersTable({ rows, onEdit }: SuppliersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "country") cmp = (a.country || "").localeCompare(b.country || "");
      else {
        const ta = a.updatedAt ?? "";
        const tb = b.updatedAt ?? "";
        cmp = ta.localeCompare(tb);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function ThSort({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <th className="px-4 py-2.5">
        <button
          type="button"
          className={`flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wider ${
            active ? "text-foreground" : "text-muted-foreground"
          }`}
          onClick={() => toggleSort(col)}
        >
          {label}
          {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
        </button>
      </th>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <ThSort col="name" label="Supplier" />
            <ThSort col="country" label="Country" />
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Contact
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </th>
            <ThSort col="updatedAt" label="Last update" />
            <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No suppliers match these filters.
              </td>
            </tr>
          ) : (
            sorted.map((s) => (
              <tr key={s.id} className="table-row-interactive hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="patient-id mt-0.5">{s.city ? `${s.city} · ` : ""}{s.phone}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.country || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <p>{s.contactPerson || "—"}</p>
                  <p className="patient-id">{s.contactEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`status-pill text-xs ${s.active ? "status-pill-active" : "status-pill-inactive"}`}
                  >
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 font-clinical text-muted-foreground">
                  {s.updatedAt ? formatDateTime(s.updatedAt) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(s)} aria-label="Edit supplier">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
