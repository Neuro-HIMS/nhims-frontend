"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Save } from "lucide-react";

import { FACILITY_SERVICE_TO_APP_MODULE } from "@/config/facility-service-modules";
import { FacilityDiagnosisClassificationsSettings } from "@/components/facility/facility-conditions-dictionary";
import { FacilityConfigView } from "@/components/facility/views/facility-config-view";
import { FacilityProfileView } from "@/components/facility/views/facility-profile-view";
import { FacilityServicesView } from "@/components/facility/views/facility-services-view";
import { authService } from "@/services/auth.service";
import { facilityService } from "@/services/facility.service";
import { useAuthStore } from "@/store/auth.store";
import type {
  FacilityConfig,
  FacilityProfile,
  FacilityService,
  FacilitySettingsDto,
  FacilitySettingsPayload,
} from "@/types/facility.types";
import type { AppModule } from "@/types/auth.types";
import { MODULE_PATHS } from "@/lib/access-control";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";
import { InlineNotice } from "@/components/common/inline-notice";
import { CardSkeleton } from "@/components/common/skeletons";
import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const VIEW_CONFIG = [
  { id: "profile", label: "Facility details", description: "Identity, logo and contact details." },
  { id: "services", label: "Services", description: "Switch sections on or off for everyone." },
  { id: "config", label: "Opening hours and booking rules", description: "Appointment and visit rules." },
  { id: "conditions", label: "Diagnosis list", description: "The diagnoses your team can pick from a visit." },
] as const;

const SUB_NAV = VIEW_CONFIG.map((v) => ({
  label: v.label,
  view: v.id,
  href: `/facility?view=${v.id}`,
}));

type ViewId = (typeof VIEW_CONFIG)[number]["id"];

type WorkspaceModel = FacilitySettingsPayload;

interface FacilitySettingsWorkspaceProps {
  facilityName: string;
  facilityCode: string;
}

export function FacilitySettingsWorkspace({ facilityName, facilityCode }: FacilitySettingsWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSessionUser = useAuthStore((s) => s.setUser);

  const rawView = searchParams.get("view");
  const activeView: ViewId = isViewId(rawView) ? rawView : "profile";
  const activeConfig = VIEW_CONFIG.find((v) => v.id === activeView)!;

  const defaults = useMemo(() => createDefaultPayload(facilityName, facilityCode), [facilityName, facilityCode]);

  const [model, setModel] = useState<WorkspaceModel>(defaults);
  const [baseline, setBaseline] = useState<WorkspaceModel>(defaults);
  const [serverLogoUrl, setServerLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDirty, setLogoDirty] = useState<"none" | "replace" | "clear">("none");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isViewId(rawView)) updateView("profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawView]);

  useEffect(() => {
    void loadFacility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFacility() {
    setLoading(true);
    setLoadError(null);
    try {
      const dto = await facilityService.get();
      const merged = mergeFromApi(dto, defaults);
      setModel(merged);
      setBaseline(structuredClone(merged));
      setServerLogoUrl(dto.logoDataUrl);
      setLogoPreview(null);
      setLogoDirty("none");
    } catch (err) {
      setLoadError(getFriendlyError(err).message);
    } finally {
      setLoading(false);
    }
  }

  function updateView(view: ViewId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const hasChanges = JSON.stringify(model) !== JSON.stringify(baseline) || logoDirty !== "none";

  function handleLogoFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setLogoPreview(result);
        setLogoDirty("replace");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleClearLogo() {
    setLogoPreview(null);
    setLogoDirty("clear");
  }

  async function handleSave() {
    setSaving(true);
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

      const dto = await facilityService.update({
        name: model.profile.facilityName.trim(),
        code: model.profile.facilityCode.trim(),
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
      notify.success("Facility settings saved.");

      const session = await authService.reissueSession();
      setSessionUser(session.user);
      router.refresh();
    } catch (error: unknown) {
      notify.error(getFriendlyError(error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setModel(structuredClone(baseline));
    setLogoPreview(null);
    setLogoDirty("none");
    notify.info("Unsaved changes were undone.");
  }

  const logoDisplay = logoDirty === "clear" ? null : (logoPreview ?? serverLogoUrl);

  return (
    <div className="space-y-4">
      <PageCard
        title="Facility settings"
        description="Your facility's details, services and rules."
        actions={
          !loading && (
            <>
              <Badge variant={hasChanges ? "secondary" : "outline"}>{hasChanges ? "Unsaved changes" : "Up to date"}</Badge>
              <Button variant="secondary" type="button" disabled={saving} onClick={() => void loadFacility()}>
                {loading ? <Spinner className="mr-1.5 h-4 w-4" /> : <RotateCcw className="mr-1.5 h-4 w-4" />}
                Reload
              </Button>
              <Button variant="secondary" type="button" disabled={!hasChanges || saving} onClick={handleReset}>
                Undo changes
              </Button>
              <Button type="button" disabled={!hasChanges || saving} onClick={() => void handleSave()}>
                {saving ? <Spinner className="mr-1.5 h-4 w-4" /> : <Save className="mr-1.5 h-4 w-4" />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </>
          )
        }
      />

      <ModuleSubNav items={SUB_NAV} basePath="/facility" />

      <div>
        <h2 className="text-base font-semibold text-foreground">{activeConfig.label}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{activeConfig.description}</p>
      </div>

      {loadError && <InlineNotice tone="error">{loadError}</InlineNotice>}

      {loading ? (
        <CardSkeleton />
      ) : (
        <div className="pt-1">
          {activeView === "profile" && (
            <FacilityProfileView
              profile={model.profile}
              logoDisplayUrl={logoDisplay}
              onProfileChange={(profile) => setModel((m) => ({ ...m, profile }))}
              onLogoFile={handleLogoFile}
              onClearLogo={handleClearLogo}
            />
          )}

          {activeView === "services" && (
            <FacilityServicesView services={model.services} onChange={(services) => setModel((m) => ({ ...m, services }))} />
          )}

          {activeView === "config" && (
            <FacilityConfigView config={model.config} onChange={(config) => setModel((m) => ({ ...m, config }))} />
          )}

          {activeView === "conditions" && <FacilityDiagnosisClassificationsSettings />}
        </div>
      )}
    </div>
  );
}

/** Mirrors backend canonical service ids and defaults for offline fallback UI. */
const FACILITY_SERVICE_SEEDS: Omit<FacilityService, "hmisModuleKey">[] = [
  { id: "emergency", name: "Accident & Emergency (A&E)", category: "clinical", enabled: true, targetDaily: 80, leadUnit: "Emergency Unit" },
  { id: "opd", name: "Outpatient Department (OPD)", category: "clinical", enabled: true, targetDaily: 200, leadUnit: "Nursing / Records" },
  { id: "ipd", name: "Inpatient & Wards", category: "clinical", enabled: true, targetDaily: 120, leadUnit: "Nursing Administration" },
  { id: "maternity_anc", name: "Maternity & ANC", category: "clinical", enabled: true, targetDaily: 90, leadUnit: "Midwifery" },
  { id: "surgical_services", name: "Theatre & Surgery", category: "clinical", enabled: true, targetDaily: 25, leadUnit: "Surgical Services" },
  { id: "dental", name: "Dental Clinic", category: "clinical", enabled: false, targetDaily: 40, leadUnit: "Dental Unit" },
  { id: "mental_health", name: "Mental Health (Psychiatry OP)", category: "clinical", enabled: false, targetDaily: 35, leadUnit: "Mental Health" },
  { id: "laboratory", name: "Laboratory Services", category: "diagnostic", enabled: true, targetDaily: 220, leadUnit: "Medical Laboratory" },
  { id: "radiology", name: "Radiology & Imaging", category: "diagnostic", enabled: false, targetDaily: 55, leadUnit: "Imaging Department" },
  { id: "pharmacy", name: "Pharmacy & Dispensing", category: "diagnostic", enabled: true, targetDaily: 200, leadUnit: "Pharmacy" },
  { id: "physiotherapy", name: "Physiotherapy & Rehabilitation", category: "support", enabled: false, targetDaily: 45, leadUnit: "Physiotherapy" },
  { id: "blood_bank", name: "Blood Transfusion", category: "support", enabled: false, targetDaily: 15, leadUnit: "Blood Bank" },
  { id: "records_registration", name: "Patient Registration & Medical Records", category: "support", enabled: true, targetDaily: 250, leadUnit: "Health Information" },
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

function parseCategory(value: unknown): FacilityService["category"] {
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
  return value === "profile" || value === "services" || value === "config" || value === "conditions";
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
