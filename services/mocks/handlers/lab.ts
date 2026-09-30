import type { LabTestSetup } from "@/lib/lab-results";
import { LAB_PARAMETER_FIXTURES } from "@/services/mocks/fixtures/lab-parameters";
import type { ClinicalServiceDto } from "@/types/clinical.types";

// In-memory for the browser session; resets on reload (mock-layer rule).
const edited = new Map<string, LabTestSetup>();
const rejections = new Map<string, { reason: string; rejectedAt: string }>();

export function mockLabSetupFor(service: Pick<ClinicalServiceDto, "id" | "serviceCode" | "serviceName">): LabTestSetup {
  const saved = edited.get(service.id);
  if (saved) return saved;
  const fixture = LAB_PARAMETER_FIXTURES[service.serviceCode];
  if (fixture) return { serviceId: service.id, sampleType: fixture.sampleType, parameters: fixture.parameters };
  return { serviceId: service.id, sampleType: "", parameters: [] };
}

export function mockSaveLabSetup(setup: LabTestSetup): LabTestSetup {
  edited.set(setup.serviceId, setup);
  return setup;
}

export function mockRecordRejection(orderId: string, reason: string) {
  const rec = { reason, rejectedAt: new Date().toISOString() };
  rejections.set(orderId, rec);
  return rec;
}

export function mockRejectionFor(orderId: string) {
  return rejections.get(orderId) ?? null;
}
