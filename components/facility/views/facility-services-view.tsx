"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { FacilityService, FacilityServiceCategory } from "@/types/facility.types";

const SERVICE_CATEGORY_LABELS: Record<FacilityServiceCategory, string> = {
  clinical: "Clinical care",
  diagnostic: "Diagnostics and pharmacy",
  support: "Support and records",
};

const CATEGORY_ORDER: FacilityServiceCategory[] = ["clinical", "diagnostic", "support"];

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  emergency: "Care for patients who need help right away.",
  opd: "See patients who walk in without an appointment.",
  ipd: "Beds, admissions and ward care.",
  maternity_anc: "Care for pregnant women, from booking to delivery.",
  surgical_services: "Planned operations and recovery.",
  dental: "Dental check-ups and procedures.",
  mental_health: "Mental health clinic and reviews.",
  laboratory: "Collect samples and test them.",
  radiology: "Scans and imaging reports.",
  pharmacy: "Give out medicines and manage stock.",
  physiotherapy: "Physical therapy and rehabilitation.",
  blood_bank: "Store and issue blood for transfusion.",
  records_registration: "Register patients and manage their records.",
};

interface FacilityServicesViewProps {
  services: FacilityService[];
  onChange: (next: FacilityService[]) => void;
}

export function FacilityServicesView({ services, onChange }: FacilityServicesViewProps) {
  const [query, setQuery] = useState("");
  const [pendingOff, setPendingOff] = useState<FacilityService | null>(null);

  function updateService(id: string, patch: Partial<FacilityService>) {
    onChange(services.map((service) => (service.id === id ? { ...service, ...patch } : service)));
  }

  function handleToggle(service: FacilityService, next: boolean) {
    if (!next) {
      setPendingOff(service);
      return;
    }
    updateService(service.id, { enabled: true });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, query]);

  const grouped = useMemo(() => {
    const map = new Map<FacilityServiceCategory, FacilityService[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const row of filtered) {
      const bucket = map.get(row.category);
      if (bucket) bucket.push(row);
    }
    return map;
  }, [filtered]);

  const enabledCount = services.filter((s) => s.enabled).length;

  return (
    <div className="space-y-4">
      <InlineNotice tone="info">
        Turning a section on or off here applies the next time each person signs in — not straight away for people
        already using the system.
      </InlineNotice>

      <Card className="overflow-visible">
        <CardHeader className="space-y-3 border-b border-border pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Sections in use</CardTitle>
              <CardDescription>Switch a section on or off, and set how many people it expects each day.</CardDescription>
            </div>
            <Badge variant="secondary">{enabledCount} of {services.length} on</Badge>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sections"
              className="h-9 pl-9"
              aria-label="Search sections"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-6 pb-2">
            {CATEGORY_ORDER.map((category) => {
              const rows = grouped.get(category) ?? [];
              if (!rows.length) return null;
              return (
                <section key={category} className="space-y-2">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {SERVICE_CATEGORY_LABELS[category]}
                  </h3>
                  <ul className="space-y-2">
                    {rows.map((service) => (
                      <li
                        key={service.id}
                        className="rounded-lg border border-border bg-surface-muted px-3 py-2.5 transition-colors hover:bg-muted"
                      >
                        <div className="flex flex-col gap-2.5 min-[650px]:grid min-[650px]:grid-cols-[minmax(0,1fr)_auto_7.5rem] min-[650px]:items-center min-[650px]:gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {SERVICE_DESCRIPTIONS[service.id] ?? "A service line at your facility."}
                            </p>
                          </div>
                          <label className="flex cursor-pointer items-center gap-2 min-[650px]:justify-center">
                            <Checkbox
                              checked={service.enabled}
                              onCheckedChange={(v) => handleToggle(service, v === true)}
                            />
                            <span className="text-xs text-foreground">{service.enabled ? "On" : "Off"}</span>
                          </label>
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] leading-none font-medium text-muted-foreground">
                              Expected per day
                            </span>
                            <Input
                              type="number"
                              min={0}
                              max={50000}
                              value={service.targetDaily}
                              className="h-8 text-sm tabular-nums"
                              onChange={(event) =>
                                updateService(service.id, {
                                  targetDaily: parseBoundedInt(event.target.value, 0, 50_000, service.targetDaily),
                                })
                              }
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No section matches your search.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingOff !== null}
        onOpenChange={(open) => !open && setPendingOff(null)}
        title={`Switch off ${pendingOff?.name ?? "this section"}?`}
        description="It will disappear from everyone's menu after they next sign in."
        confirmLabel="Yes, switch it off"
        destructive
        onConfirm={() => {
          if (pendingOff) updateService(pendingOff.id, { enabled: false });
        }}
      />
    </div>
  );
}

function parseBoundedInt(raw: string, min: number, max: number, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) return fallback;
  return rounded;
}
