"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ImagePlus, RotateCcw, Save, Search, Trash2 } from "lucide-react";

import { FACILITY_SERVICE_TO_APP_MODULE } from "@/config/facility-service-modules";
import { authService } from "@/services/auth.service";
import { facilityService } from "@/services/facility.service";
import { useAuthStore } from "@/store/auth.store";
import type {
  FacilityConfig,
  FacilityProfile,
  FacilityService,
  FacilityServiceCategory,
  FacilitySettingsDto,
  FacilitySettingsPayload,
} from "@/types/facility.types";
import { MODULE_PATHS } from "@/lib/access-control";
import type { AppModule } from "@/types/auth.types";
import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const VIEW_CONFIG = [
  { id: "profile", label: "Profile", description: "Identity, branding, and contact details." },
  { id: "services", label: "Services", description: "Service lines and capacity targets." },
  { id: "config", label: "Configuration", description: "Operational defaults and workflow preferences." },
] as const;

const SUB_NAV = VIEW_CONFIG.map((v) => ({
  label: v.label,
  view: v.id,
  href: `/facility?view=${v.id}`,
}));

const SERVICE_CATEGORY_LABELS: Record<FacilityServiceCategory, string> = {
  clinical: "Clinical care",
  diagnostic: "Diagnostics & pharmacy",
  support: "Support & records",
};

const CATEGORY_ORDER: FacilityServiceCategory[] = ["clinical", "diagnostic", "support"];

type ViewId = (typeof VIEW_CONFIG)[number]["id"];

type WorkspaceModel = FacilitySettingsPayload;

interface FacilitySettingsWorkspaceProps {
  facilityId: string;
  facilityName: string;
  facilityCode: string;
}

export function FacilitySettingsWorkspace({
  facilityId,
  facilityName,
  facilityCode,
}: FacilitySettingsWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSessionUser = useAuthStore((s) => s.setUser);

  const rawView = searchParams.get("view");
  const activeView: ViewId = isViewId(rawView) ? rawView : "profile";

  const defaults = useMemo(
    () => createDefaultPayload(facilityName, facilityCode),
    [facilityName, facilityCode]
  );

  const [model, setModel] = useState<WorkspaceModel>(defaults);
  const [baseline, setBaseline] = useState<WorkspaceModel>(defaults);
  const [serverLogoUrl, setServerLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDirty, setLogoDirty] = useState<"none" | "replace" | "clear">("none");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isViewId(rawView)) updateView("profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawView]);

  useEffect(() => {
    void loadFacility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  async function loadFacility() {
    setLoading(true);
    setFeedback(null);
    try {
      const dto = await facilityService.get(facilityId);
      const merged = mergeFromApi(dto, defaults);
      setModel(merged);
      setBaseline(structuredClone(merged));
      setServerLogoUrl(dto.logoDataUrl);
      setLogoPreview(null);
      setLogoDirty("none");
    } catch {
      setFeedback({ text: "Could not load facility settings from the server.", tone: "error" });
      setModel(defaults);
      setBaseline(structuredClone(defaults));
    } finally {
      setLoading(false);
    }
  }

  function updateView(view: ViewId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const hasChanges =
    JSON.stringify(model) !== JSON.stringify(baseline) || logoDirty !== "none";

  function handleLogoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 220 * 1024) {
      setFeedback({ text: "Please choose an image under 220 KB.", tone: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setLogoPreview(result);
        setLogoDirty("replace");
        setFeedback(null);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleClearLogo() {
    setLogoPreview(null);
    setLogoDirty("clear");
    setFeedback(null);
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      let logoBase64: string | undefined;
      let logoContentType: string | undefined;
      if (logoDirty === "replace" && logoPreview) {
        const parsed = parseDataUrl(logoPreview);
        if (parsed) {
          logoBase64 = parsed.base64;
          logoContentType = parsed.contentType;
        }
      }

      const dto = await facilityService.update(facilityId, {
        name: model.profile.facilityName.trim(),
        settings: model,
        logoBase64: logoDirty === "replace" ? logoBase64 : undefined,
        logoContentType: logoDirty === "replace" ? logoContentType : undefined,
        clearLogo: logoDirty === "clear",
      });

      const merged = mergeFromApi(dto, createDefaultPayload(dto.name, dto.code));
      setModel(merged);
      setBaseline(structuredClone(merged));
      setServerLogoUrl(dto.logoDataUrl);
      setLogoPreview(null);
      setLogoDirty("none");
      setFeedback({ text: "Facility settings saved.", tone: "info" });

      const session = await authService.reissueSession();
      setSessionUser(session.user);
      router.refresh();
    } catch {
      setFeedback({
        text: "Could not save facility settings. Check your connection and try again.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setModel(structuredClone(baseline));
    setLogoPreview(null);
    setLogoDirty("none");
    setFeedback({ text: "Unsaved changes were reverted.", tone: "info" });
  }

  const logoDisplay = logoDirty === "clear" ? null : logoPreview ?? serverLogoUrl;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Facility Settings</h1>
          <p className="text-sm text-muted-foreground">
            Profile, services, and operational defaults — synced with the server.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={hasChanges ? "secondary" : "outline"}>{hasChanges ? "Unsaved changes" : "Up to date"}</Badge>
          <Button variant="outline" type="button" disabled={saving} onClick={() => void loadFacility()}>
            {loading ? <Spinner className="mr-1 h-4 w-4" /> : <RotateCcw className="mr-1 h-4 w-4" />}
            Reload
          </Button>
          <Button variant="outline" type="button" disabled={!hasChanges || saving} onClick={handleReset}>
            Reset
          </Button>
          <Button type="button" disabled={!hasChanges || saving || loading} onClick={() => void handleSave()}>
            {saving ? <Spinner className="mr-1 h-4 w-4" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </header>

      <ModuleSubNav items={SUB_NAV} basePath="/facility" />

      {feedback && (
        <div
          className={
            feedback.tone === "error"
              ? "flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              : "notice-info flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          }
        >
          {feedback.tone === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Loading facility settings...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 pt-2">
          {activeView === "profile" && (
            <FacilityProfileView
              profile={model.profile}
              logoDisplayUrl={logoDisplay}
              onProfileChange={(profile) => setModel((m) => ({ ...m, profile }))}
              onPickLogo={() => fileRef.current?.click()}
              onClearLogo={handleClearLogo}
              fileInput={<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />}
            />
          )}

          {activeView === "services" && (
            <FacilityServicesView services={model.services} onChange={(services) => setModel((m) => ({ ...m, services }))} />
          )}

          {activeView === "config" && (
            <FacilityConfigView config={model.config} onChange={(config) => setModel((m) => ({ ...m, config }))} />
          )}
        </div>
      )}
    </section>
  );
}

function FacilityProfileView({
  profile,
  logoDisplayUrl,
  onProfileChange,
  onPickLogo,
  onClearLogo,
  fileInput,
}: {
  profile: FacilityProfile;
  logoDisplayUrl: string | null;
  onProfileChange: (next: FacilityProfile) => void;
  onPickLogo: () => void;
  onClearLogo: () => void;
  fileInput: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facility profile</CardTitle>
        <CardDescription>Official name, branding, location, and facility flags.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fileInput}
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Facility logo</p>
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/40">
              {logoDisplayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview data URLs and API logos
                <img src={logoDisplayUrl} alt="Facility logo preview" className="h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-center text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onPickLogo}>
                <ImagePlus className="mr-1 h-4 w-4" />
                Upload
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onClearLogo} disabled={!logoDisplayUrl}>
                <Trash2 className="mr-1 h-4 w-4" />
                Remove
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">PNG or JPEG, max ~200 KB. Shown next to your facility name in the header after save.</p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput
                label="Facility name"
                value={profile.facilityName}
                onChange={(value) => onProfileChange({ ...profile, facilityName: value })}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Facility code</p>
                <Input value={profile.facilityCode} readOnly className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">Code is managed by the system.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledSelect
                label="Facility level"
                value={profile.facilityLevel}
                onValueChange={(value) => onProfileChange({ ...profile, facilityLevel: value as FacilityProfile["facilityLevel"] })}
                options={[
                  { label: "Primary", value: "PRIMARY" },
                  { label: "Secondary", value: "SECONDARY" },
                  { label: "Tertiary", value: "TERTIARY" },
                ]}
              />
              <LabeledSelect
                label="Ownership"
                value={profile.ownershipType}
                onValueChange={(value) => onProfileChange({ ...profile, ownershipType: value as FacilityProfile["ownershipType"] })}
                options={[
                  { label: "Public", value: "PUBLIC" },
                  { label: "Private", value: "PRIVATE" },
                  { label: "Mission", value: "MISSION" },
                ]}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Region" value={profile.region} onChange={(value) => onProfileChange({ ...profile, region: value })} />
              <LabeledInput label="District" value={profile.district} onChange={(value) => onProfileChange({ ...profile, district: value })} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Address</p>
              <Textarea
                value={profile.address}
                onChange={(event) => onProfileChange({ ...profile, address: event.target.value })}
                className="min-h-24"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Phone" value={profile.phone} onChange={(value) => onProfileChange({ ...profile, phone: value })} />
              <LabeledInput label="Email" type="email" value={profile.email} onChange={(value) => onProfileChange({ ...profile, email: value })} />
            </div>

            <LabeledInput label="Timezone" value={profile.timezone} onChange={(value) => onProfileChange({ ...profile, timezone: value })} />

            <div className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Facility flags</p>
              <div className="space-y-3">
                <FlagCheckbox
                  label="Teaching hospital"
                  description="Academic training and supervision workflows."
                  checked={profile.isTeachingHospital}
                  onCheckedChange={(checked) => onProfileChange({ ...profile, isTeachingHospital: checked })}
                />
                <Separator />
                <FlagCheckbox
                  label="Referral center"
                  description="Accepts referrals from lower-level facilities."
                  checked={profile.isReferralCenter}
                  onCheckedChange={(checked) => onProfileChange({ ...profile, isReferralCenter: checked })}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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

function FacilityServicesView({
  services,
  onChange,
}: {
  services: FacilityService[];
  onChange: (next: FacilityService[]) => void;
}) {
  const [query, setQuery] = useState("");

  function updateService(id: string, patch: Partial<FacilityService>) {
    onChange(services.map((service) => (service.id === id ? { ...service, ...patch } : service)));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.replace(/_/g, " ").includes(q) ||
        s.leadUnit.toLowerCase().includes(q)
    );
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
    <Card className="overflow-visible">
      <CardHeader className="space-y-3 border-b border-border/60 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Service lines</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Toggle lines and capacity targets. Scroll the page to see all services — the list uses the main workspace scroll so nothing is clipped.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{enabledCount} enabled</Badge>
            <Badge variant="outline">{services.length} total</Badge>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by service name, id, or lead unit..."
            className="h-9 pl-9"
            aria-label="Filter services"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Nested Radix ScrollArea + Card overflow-hidden broke scroll height; rely on <main> scroll instead. */}
        <div className="space-y-6 pb-6">
          {CATEGORY_ORDER.map((category) => {
            const rows = grouped.get(category) ?? [];
            if (!rows.length) return null;
            return (
              <section key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{SERVICE_CATEGORY_LABELS[category]}</h3>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                    {rows.length} line{rows.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <ul className="space-y-2">
                  {rows.map((service) => (
                    <li
                      key={service.id}
                      className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 shadow-none ring-1 ring-transparent transition-colors hover:bg-muted/35"
                    >
                      <div className="flex flex-col gap-2.5 min-[650px]:grid min-[650px]:grid-cols-[minmax(0,1fr)_auto_7.5rem] min-[650px]:items-center min-[650px]:gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-sm font-medium leading-tight text-foreground">{service.name}</span>
                            <Badge variant="outline" className="h-5 shrink-0 px-1.5 font-mono text-[10px] uppercase text-muted-foreground">
                              {service.id.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          {service.hmisModuleKey ? (
                            <p className="mt-1">
                              <Link
                                href={MODULE_PATHS[service.hmisModuleKey]}
                                className="text-[11px] font-medium text-primary underline-offset-4 hover:underline"
                              >
                                HMIS module · {service.hmisModuleKey}
                              </Link>
                            </p>
                          ) : null}
                          <div className="mt-1.5 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                            <span className="w-16 shrink-0 text-[11px] font-medium text-muted-foreground">Lead unit</span>
                            <Input
                              value={service.leadUnit}
                              maxLength={120}
                              className="h-8 text-sm"
                              onChange={(event) =>
                                updateService(service.id, { leadUnit: event.target.value.slice(0, 120) })
                              }
                            />
                          </div>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 min-[650px]:justify-center">
                          <Checkbox
                            checked={service.enabled}
                            onCheckedChange={(v) => updateService(service.id, { enabled: v === true })}
                          />
                          <span className="text-xs text-foreground">Active</span>
                        </label>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium leading-none text-muted-foreground">Daily target</span>
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
            <p className="py-8 text-center text-sm text-muted-foreground">No services match your search.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FacilityConfigView({
  config,
  onChange,
}: {
  config: FacilityConfig;
  onChange: (next: FacilityConfig) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operational configuration</CardTitle>
        <CardDescription>
          Scheduling intervals, language, and guarded clinical workflows. Values are validated on the server (ranges shown under each field).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Scheduling &amp; display</p>
            <p className="text-xs text-muted-foreground">Timers and booking limits used by queues and appointment views.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label="Queue auto-refresh"
              value={String(config.queueAutoRefreshSec)}
              suffix="sec"
              hint="Allowed: 5–300"
              onChange={(value) =>
                onChange({
                  ...config,
                  queueAutoRefreshSec: parseBoundedInt(value, 5, 300, config.queueAutoRefreshSec),
                })
              }
            />
            <LabeledInput
              label="Default appointment slot"
              value={String(config.appointmentSlotMinutes)}
              suffix="min"
              hint="Allowed: 5–120"
              onChange={(value) =>
                onChange({
                  ...config,
                  appointmentSlotMinutes: parseBoundedInt(value, 5, 120, config.appointmentSlotMinutes),
                })
              }
            />
            <LabeledInput
              label="Booking horizon"
              value={String(config.appointmentBookingHorizonDays)}
              suffix="days"
              hint="How far ahead patients may book (1–365)"
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
            <LabeledSelect
              label="Default language"
              value={config.defaultLanguage}
              onValueChange={(value) => onChange({ ...config, defaultLanguage: value as FacilityConfig["defaultLanguage"] })}
              options={[
                { label: "English", value: "en" },
                { label: "French", value: "fr" },
              ]}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Clinical &amp; coverage workflows</p>
            <p className="text-xs text-muted-foreground">Front-of-house rules before consultations and insurance checks.</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="space-y-3">
              <FlagCheckbox
                label="Require triage before consultation"
                description="Patients must pass triage before entering the clinician queue."
                checked={config.requireTriageBeforeConsultation}
                onCheckedChange={(checked) => onChange({ ...config, requireTriageBeforeConsultation: checked })}
              />
              <Separator />
              <FlagCheckbox
                label="NHIS validation"
                description="Prompt for scheme verification where billing integration expects it."
                checked={config.enableNhisValidation}
                onCheckedChange={(checked) => onChange({ ...config, enableNhisValidation: checked })}
              />
              <Separator />
              <FlagCheckbox
                label="Critical lab alerts"
                description="Surface abnormal lab flags to responsible clinicians."
                checked={config.enableCriticalLabAlerts}
                onCheckedChange={(checked) => onChange({ ...config, enableCriticalLabAlerts: checked })}
              />
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Documentation integrity</p>
            <p className="text-xs text-muted-foreground">Backdating is capped to reduce audit risk (0 disables).</p>
          </div>
          <LabeledInput
            label="Allow backdated clinical notes"
            value={String(config.allowBackdatedClinicalDays)}
            suffix="days"
            hint="Allowed: 0–30 calendar days"
            onChange={(value) =>
              onChange({
                ...config,
                allowBackdatedClinicalDays: parseBoundedInt(value, 0, 30, config.allowBackdatedClinicalDays),
              })
            }
          />
        </section>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Offline-only queues were removed from configuration — connectivity remains required for consistent audit trails. Save refreshes your session and header
        branding.
      </CardFooter>
    </Card>
  );
}

function LabeledInput({
  label,
  value,
  type = "text",
  suffix,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  suffix?: string;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={suffix ? "flex-1" : undefined} />
        {suffix ? (
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Mirrors backend canonical service ids and defaults for offline fallback UI. */
const FACILITY_SERVICE_SEEDS: Omit<FacilityService, "hmisModuleKey">[] = [
  {
    id: "emergency",
    name: "Accident & Emergency (A&E)",
    category: "clinical",
    enabled: true,
    targetDaily: 80,
    leadUnit: "Emergency Unit",
  },
  {
    id: "opd",
    name: "Outpatient Department (OPD)",
    category: "clinical",
    enabled: true,
    targetDaily: 200,
    leadUnit: "Nursing / Records",
  },
  {
    id: "ipd",
    name: "Inpatient & Wards",
    category: "clinical",
    enabled: true,
    targetDaily: 120,
    leadUnit: "Nursing Administration",
  },
  {
    id: "maternity_anc",
    name: "Maternity & ANC",
    category: "clinical",
    enabled: true,
    targetDaily: 90,
    leadUnit: "Midwifery",
  },
  {
    id: "surgical_services",
    name: "Theatre & Surgery",
    category: "clinical",
    enabled: true,
    targetDaily: 25,
    leadUnit: "Surgical Services",
  },
  {
    id: "dental",
    name: "Dental Clinic",
    category: "clinical",
    enabled: false,
    targetDaily: 40,
    leadUnit: "Dental Unit",
  },
  {
    id: "mental_health",
    name: "Mental Health (Psychiatry OP)",
    category: "clinical",
    enabled: false,
    targetDaily: 35,
    leadUnit: "Mental Health",
  },
  {
    id: "laboratory",
    name: "Laboratory Services",
    category: "diagnostic",
    enabled: true,
    targetDaily: 220,
    leadUnit: "Medical Laboratory",
  },
  {
    id: "radiology",
    name: "Radiology & Imaging",
    category: "diagnostic",
    enabled: false,
    targetDaily: 55,
    leadUnit: "Imaging Department",
  },
  {
    id: "pharmacy",
    name: "Pharmacy & Dispensing",
    category: "diagnostic",
    enabled: true,
    targetDaily: 200,
    leadUnit: "Pharmacy",
  },
  {
    id: "physiotherapy",
    name: "Physiotherapy & Rehabilitation",
    category: "support",
    enabled: false,
    targetDaily: 45,
    leadUnit: "Physiotherapy",
  },
  {
    id: "blood_bank",
    name: "Blood Transfusion",
    category: "support",
    enabled: false,
    targetDaily: 15,
    leadUnit: "Blood Bank",
  },
  {
    id: "records_registration",
    name: "Patient Registration & Medical Records",
    category: "support",
    enabled: true,
    targetDaily: 250,
    leadUnit: "Health Information",
  },
];

const FACILITY_SERVICE_DEFAULTS: FacilityService[] = FACILITY_SERVICE_SEEDS.map((row) => {
  const hmisModuleKey = FACILITY_SERVICE_TO_APP_MODULE[row.id];
  return { ...row, ...(hmisModuleKey ? { hmisModuleKey } : {}) };
});

const DEFAULT_FACILITY_CONFIG: FacilityConfig = {
  queueAutoRefreshSec: 30,
  appointmentSlotMinutes: 15,
  appointmentBookingHorizonDays: 90,
  defaultLanguage: "en",
  requireTriageBeforeConsultation: true,
  enableNhisValidation: true,
  enableCriticalLabAlerts: true,
  allowBackdatedClinicalDays: 0,
};

function createDefaultPayload(facilityName: string, facilityCode: string): WorkspaceModel {
  return {
    profile: {
      facilityName,
      facilityCode,
      facilityLevel: "TERTIARY",
      ownershipType: "PUBLIC",
      region: "Greater Accra",
      district: "Ayawaso",
      address: "Hospital Road, Accra, Ghana",
      phone: "+233 30 000 0000",
      email: "facility@nhims.local",
      timezone: "Africa/Accra",
      isTeachingHospital: true,
      isReferralCenter: true,
    },
    services: FACILITY_SERVICE_DEFAULTS.map((row) => ({ ...row })),
    config: { ...DEFAULT_FACILITY_CONFIG },
  };
}

function mergeFromApi(dto: FacilitySettingsDto, defaults: WorkspaceModel): WorkspaceModel {
  const raw = dto.settings as Partial<WorkspaceModel> & Record<string, unknown>;
  const profileIn = raw.profile as Partial<FacilityProfile> | undefined;
  const servicesIn = raw.services as FacilityService[] | undefined;
  const rawConfig = raw.config as Record<string, unknown> | undefined;

  const defaultById = new Map(defaults.services.map((s) => [s.id, s]));

  const services =
    servicesIn && servicesIn.length > 0
      ? servicesIn.map((row) => {
          const fb = defaultById.get(row.id);
          return fb ? normalizeServiceRow(row, fb) : normalizeLooseServiceRow(row);
        })
      : defaults.services.map((s) => ({ ...s }));

  return {
    profile: {
      ...defaults.profile,
      ...profileIn,
      facilityName: dto.name,
      facilityCode: dto.code,
    },
    services,
    config: mergeConfigFromApi(rawConfig, defaults.config),
  };
}

function normalizeServiceRow(row: Partial<FacilityService>, fb: FacilityService): FacilityService {
  const targetRaw = row.targetDaily;
  const targetDaily =
    typeof targetRaw === "number" && Number.isFinite(targetRaw)
      ? Math.min(50_000, Math.max(0, Math.round(targetRaw)))
      : fb.targetDaily;
  const leadRaw = row.leadUnit?.trim() ?? "";
  const leadUnit = leadRaw.length > 0 ? leadRaw.slice(0, 120) : fb.leadUnit;
  return {
    ...fb,
    enabled: typeof row.enabled === "boolean" ? row.enabled : fb.enabled,
    targetDaily,
    leadUnit,
    hmisModuleKey: resolveHmisModuleKey(row.hmisModuleKey, fb.hmisModuleKey),
  };
}

function normalizeLooseServiceRow(row: FacilityService): FacilityService {
  const fb =
    FACILITY_SERVICE_DEFAULTS.find((s) => s.id === row.id) ??
    ({
      id: row.id,
      name: row.name || row.id,
      category: parseCategory(row.category),
      enabled: Boolean(row.enabled),
      targetDaily: 50,
      leadUnit: "",
      hmisModuleKey: FACILITY_SERVICE_TO_APP_MODULE[row.id],
    } satisfies FacilityService);

  return normalizeServiceRow(row, fb);
}

function parseCategory(value: unknown): FacilityServiceCategory {
  if (value === "clinical" || value === "diagnostic" || value === "support") return value;
  return "clinical";
}

function mergeConfigFromApi(raw: Record<string, unknown> | undefined, defaults: FacilityConfig): FacilityConfig {
  if (!raw || typeof raw !== "object") return { ...defaults };

  const queueAutoRefreshSec = parseBoundedInt(String(raw.queueAutoRefreshSec ?? defaults.queueAutoRefreshSec), 5, 300, defaults.queueAutoRefreshSec);
  const appointmentSlotMinutes = parseBoundedInt(
    String(raw.appointmentSlotMinutes ?? defaults.appointmentSlotMinutes),
    5,
    120,
    defaults.appointmentSlotMinutes
  );
  const appointmentBookingHorizonDays = parseBoundedInt(
    String(raw.appointmentBookingHorizonDays ?? defaults.appointmentBookingHorizonDays),
    1,
    365,
    defaults.appointmentBookingHorizonDays
  );

  let allowBack = defaults.allowBackdatedClinicalDays;
  if (typeof raw.allowBackdatedClinicalDays === "number" && Number.isFinite(raw.allowBackdatedClinicalDays)) {
    allowBack = parseBoundedInt(String(raw.allowBackdatedClinicalDays), 0, 30, allowBack);
  } else if (raw.allowBackdatedEntries === true) {
    allowBack = 7;
  }

  const lang = raw.defaultLanguage === "fr" ? "fr" : "en";

  return {
    queueAutoRefreshSec,
    appointmentSlotMinutes,
    appointmentBookingHorizonDays,
    defaultLanguage: lang,
    requireTriageBeforeConsultation:
      typeof raw.requireTriageBeforeConsultation === "boolean" ? raw.requireTriageBeforeConsultation : defaults.requireTriageBeforeConsultation,
    enableNhisValidation: typeof raw.enableNhisValidation === "boolean" ? raw.enableNhisValidation : defaults.enableNhisValidation,
    enableCriticalLabAlerts:
      typeof raw.enableCriticalLabAlerts === "boolean" ? raw.enableCriticalLabAlerts : defaults.enableCriticalLabAlerts,
    allowBackdatedClinicalDays: allowBack,
  };
}

function parseDataUrl(dataUrl: string): { contentType: string; base64: string } | null {
  const trimmed = dataUrl.trim();
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(trimmed);
  if (!match) return null;
  return { contentType: match[1], base64: match[2] };
}

function isViewId(value: string | null): value is ViewId {
  return value === "profile" || value === "services" || value === "config";
}

function parseBoundedInt(raw: string, min: number, max: number, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) return fallback;
  return rounded;
}

function resolveHmisModuleKey(fromApi: unknown, fallback?: AppModule): AppModule | undefined {
  if (typeof fromApi === "string" && fromApi in MODULE_PATHS) return fromApi as AppModule;
  return fallback;
}
