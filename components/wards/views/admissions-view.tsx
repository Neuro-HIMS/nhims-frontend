"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  DataTable,
  TableToolbar,
  type DataTableColumn,
} from "@/components/common/data-table";
import { naturalName, cleanPersonName } from "@/lib/display-name";
import { formatClinicalDateTime } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";
import { dayOfStay } from "@/lib/wards";
import { clinicalService } from "@/services/clinical.service";
import type { AdmissionDto } from "@/types/clinical.types";

/** DOC-11 list — everyone on the wards now; open one for ward care, ward round and discharge. */
export function AdmissionsView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: queryKeys.ipd.activeAdmissions,
    queryFn: () => clinicalService.activeAdmissions(),
    refetchInterval: 30_000,
  });

  const rows = useMemo(() => {
    if (!q.data) return undefined;
    const s = search.trim().toLowerCase();
    return q.data
      .filter(
        (a) =>
          !s ||
          `${a.patientName} ${a.patientPublicId} ${a.ward} ${a.bed}`
            .toLowerCase()
            .includes(s),
      )
      .sort(
        (a, b) =>
          a.ward.localeCompare(b.ward) ||
          a.bed.localeCompare(b.bed, undefined, { numeric: true }),
      );
  }, [q.data, search]);

  const columns: DataTableColumn<AdmissionDto>[] = [
    {
      key: "patient",
      header: "Patient",
      cell: (a) => (
        <div>
          <p className="font-medium text-foreground">
            {naturalName(a.patientName)}
          </p>
          <p className="patient-id">{a.patientPublicId}</p>
        </div>
      ),
    },
    {
      key: "bed",
      header: "Ward and bed",
      cell: (a) => (
        <span className="text-foreground">
          {a.ward}
          {a.bed ? `, ${a.bed}` : ""}
        </span>
      ),
    },
    {
      key: "day",
      header: "Stay",
      cell: (a) => {
        const d = dayOfStay(a.admittedAt);
        return (
          <div>
            <p className="font-medium text-foreground">
              {d ? `Day ${d}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {a.admittedAt ? formatClinicalDateTime(a.admittedAt) : ""}
            </p>
          </div>
        );
      },
    },
    {
      key: "why",
      header: "Why",
      hideOnTablet: true,
      cell: (a) => (
        <span className="text-muted-foreground">{a.reason || "—"}</span>
      ),
    },
    {
      key: "doctor",
      header: "Admitted by",
      hideOnTablet: true,
      cell: (a) => (
        <span className="text-muted-foreground">
          {cleanPersonName(a.admittedByName) || "—"}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(a) => a.id}
      isLoading={q.isPending}
      error={q.isError ? q.error : undefined}
      onRetry={() => void q.refetch()}
      onRowClick={(a) =>
        router.push(`/wards?view=admission&admissionId=${a.id}`)
      }
      toolbar={
        <TableToolbar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Patient, ward or bed",
          }}
        />
      }
      empty={
        search.trim()
          ? {
              illustration: "no-results",
              title: "No one matches",
              description: "Try another name or bed.",
              action: { label: "Clear search", onClick: () => setSearch("") },
            }
          : {
              illustration: "empty-list",
              title: "No one is on the wards",
              description: "Patients admitted by a doctor appear here.",
            }
      }
    />
  );
}
