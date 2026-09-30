import { apiClient } from "./api-client";
import { clinicalService } from "./clinical.service";
import { isMockEnabled } from "@/services/mocks/mock-config";
import { withMock } from "@/services/mocks/with-mock";
import { mockLabSetupFor, mockRecordRejection, mockRejectionFor, mockSaveLabSetup } from "@/services/mocks/handlers/lab";
import { useNotificationStore } from "@/store/notification.store";
import type { LabTestSetup } from "@/lib/lab-results";
import type { ApiResponse } from "@/types/api.types";
import type { ClinicalServiceDto, LabOrderDto } from "@/types/clinical.types";

export const SAMPLE_REJECTION_REASONS = [
  "Not enough sample",
  "Clotted",
  "Haemolysed",
  "Wrong tube",
  "Label missing or wrong",
  "Other",
] as const;

/** Lab pieces the backend doesn't have yet — see docs/agents/backend-gaps.md#LAB-08 and #LAB-02. */
export const labService = {
  /** Whether test measurements can be saved here (only mocked until the endpoint exists). */
  setupEditable(): boolean {
    return isMockEnabled("lab-setup");
  },

  /**
   * TODO(backend): GET /clinical/catalog/services/{id}/lab-setup — what the test measures, units,
   * normal ranges by age/sex and critical limits — see backend-gaps.md#LAB-08.
   * Mocked under NEXT_PUBLIC_MOCK_AREAS=lab-setup (or "all"); without it, tests have no set
   * measurements and staff type the result rows themselves.
   */
  async setupFor(service: Pick<ClinicalServiceDto, "id" | "serviceCode" | "serviceName">): Promise<LabTestSetup> {
    return withMock(
      "lab-setup",
      async () => {
        try {
          const res = await apiClient.get<ApiResponse<LabTestSetup>>(`/clinical/catalog/services/${service.id}/lab-setup`);
          return res.data.data;
        } catch {
          // Not available yet: no preset measurements — staff type the result rows themselves.
          return { serviceId: service.id, sampleType: "", parameters: [] };
        }
      },
      () => mockLabSetupFor(service),
    );
  },

  /** TODO(backend): PUT /clinical/catalog/services/{id}/lab-setup — see backend-gaps.md#LAB-08. */
  async saveSetup(setup: LabTestSetup): Promise<LabTestSetup> {
    return withMock(
      "lab-setup",
      async () => {
        const res = await apiClient.put<ApiResponse<LabTestSetup>>(`/clinical/catalog/services/${setup.serviceId}/lab-setup`, setup);
        return res.data.data;
      },
      () => mockSaveLabSetup(setup),
    );
  },

  /**
   * Reject a sample: the order is cancelled (real) so the doctor can request a new one, and the
   * reason is kept and the doctor told.
   * TODO(backend): POST /clinical/lab-orders/{id}/reject { reason } — store the reason on the order and
   * notify the requesting doctor — see backend-gaps.md#LAB-02-reject. Reason + bell are mocked meanwhile.
   */
  async rejectSample(order: LabOrderDto, reason: string): Promise<LabOrderDto> {
    return withMock(
      "lab-reject",
      async () => {
        // No reject-with-reason endpoint yet: cancel via the status change; the reason is kept for this session only.
        const cancelled = await clinicalService.updateLabOrderStatus(order.id, "CANCELLED");
        mockRecordRejection(order.id, reason);
        return cancelled;
      },
      async () => {
        const cancelled = await clinicalService.updateLabOrderStatus(order.id, "CANCELLED");
        mockRecordRejection(order.id, reason);
        useNotificationStore.getState().addNotification({
          type: "general",
          title: `Sample rejected: ${order.serviceName}`,
          message: `Sample for ${order.serviceName} (${order.patientName}) was rejected: ${reason.toLowerCase()}. Please request a new sample.`,
          patientId: order.patientId,
          patientName: order.patientName,
          href: `/opd?view=consult&encounterId=${order.encounterId}`,
        });
        return cancelled;
      },
    );
  },

  /** Why a sample was rejected, if we know (mocked store until the backend keeps it). */
  rejectionFor(orderId: string): { reason: string; rejectedAt: string } | null {
    return mockRejectionFor(orderId);
  },
};
