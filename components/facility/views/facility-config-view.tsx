"use client";

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
            <LabeledInput
              label="Length of each appointment"
              value={String(config.appointmentSlotMinutes)}
              suffix="minutes"
              hint="From 5 to 120 minutes"
              onChange={(value) =>
                onChange({
                  ...config,
                  appointmentSlotMinutes: parseBoundedInt(value, 5, 120, config.appointmentSlotMinutes),
                })
              }
            />
            <LabeledInput
              label="How far ahead patients can book"
              value={String(config.appointmentBookingHorizonDays)}
              suffix="days"
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
            <LabeledInput
              label="How long before a waiting patient shows as waiting long"
              value={String(config.queueAutoRefreshSec)}
              suffix="seconds"
              hint="From 5 to 300 seconds"
              onChange={(value) =>
                onChange({
                  ...config,
                  queueAutoRefreshSec: parseBoundedInt(value, 5, 300, config.queueAutoRefreshSec),
                })
              }
            />
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
          <LabeledInput
            label="Days allowed"
            value={String(config.allowBackdatedClinicalDays)}
            suffix="days"
            hint="0 turns this off — notes can only be added on the day of the visit"
            onChange={(value) =>
              onChange({
                ...config,
                allowBackdatedClinicalDays: parseBoundedInt(value, 0, 30, config.allowBackdatedClinicalDays),
              })
            }
          />
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

function LabeledInput({
  label,
  value,
  suffix,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full min-w-0 flex-1 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {suffix ? <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{suffix}</span> : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
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
