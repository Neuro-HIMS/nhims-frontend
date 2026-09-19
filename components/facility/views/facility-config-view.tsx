"use client";

import { UnitInput } from "@/components/common/unit-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { FacilityConfig } from "@/types/facility.types";

interface FacilityConfigViewProps {
  config: FacilityConfig;
  onChange: (next: FacilityConfig) => void;
}

export function FacilityConfigView({ config, onChange }: FacilityConfigViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointments</CardTitle>
          <CardDescription>How appointment slots are booked.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Length of each appointment</p>
              <UnitInput
                value={String(config.appointmentSlotMinutes)}
                unit="minutes"
                hint="From 5 to 120 minutes"
                onChange={(value) =>
                  onChange({
                    ...config,
                    appointmentSlotMinutes: parseBoundedInt(value, 5, 120, config.appointmentSlotMinutes),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">How far ahead patients can book</p>
              <UnitInput
                value={String(config.appointmentBookingHorizonDays)}
                unit="days"
                hint="From 1 to 365 days"
                onChange={(value) =>
                  onChange({
                    ...config,
                    appointmentBookingHorizonDays: parseBoundedInt(
                      value,
                      1,
                      365,
                      config.appointmentBookingHorizonDays
                    ),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">How often the waiting list refreshes on screen</p>
              <UnitInput
                value={String(config.queueAutoRefreshSec)}
                unit="seconds"
                hint="From 5 to 300 seconds"
                onChange={(value) =>
                  onChange({
                    ...config,
                    queueAutoRefreshSec: parseBoundedInt(value, 5, 300, config.queueAutoRefreshSec),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Language staff see by default</p>
              <Select
                value={config.defaultLanguage}
                onValueChange={(value) => onChange({ ...config, defaultLanguage: value as FacilityConfig["defaultLanguage"] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Before a doctor sees a patient</CardTitle>
          <CardDescription>Rules that apply to every visit at your facility.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <FlagCheckbox
              label="Require vitals and triage first"
              description="A patient must be triaged before a doctor can see them."
              checked={config.requireTriageBeforeConsultation}
              onCheckedChange={(checked) => onChange({ ...config, requireTriageBeforeConsultation: checked })}
            />
            <Separator />
            <FlagCheckbox
              label="Check NHIS cover"
              description="Ask staff to confirm a patient's NHIS status before billing."
              checked={config.enableNhisValidation}
              onCheckedChange={(checked) => onChange({ ...config, enableNhisValidation: checked })}
            />
            <Separator />
            <FlagCheckbox
              label="Alert on critical lab results"
              description="Tell the responsible doctor right away when a result is critical."
              checked={config.enableCriticalLabAlerts}
              onCheckedChange={(checked) => onChange({ ...config, enableCriticalLabAlerts: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Writing up notes late</CardTitle>
          <CardDescription>How many days after a visit staff may still add clinical notes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1">
            <p className="text-sm font-medium text-foreground">Days allowed</p>
            <UnitInput
              value={String(config.allowBackdatedClinicalDays)}
              unit="days"
              hint="0 turns this off — notes can only be added on the day of the visit"
              onChange={(value) =>
                onChange({
                  ...config,
                  allowBackdatedClinicalDays: parseBoundedInt(value, 0, 30, config.allowBackdatedClinicalDays),
                })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FlagCheckbox({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-transparent px-1 py-1 hover:bg-muted/50">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function parseBoundedInt(raw: string, min: number, max: number, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) return fallback;
  return rounded;
}
