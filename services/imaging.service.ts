import { apiClient } from "./api-client";
import { clinicalService } from "./clinical.service";
import { isMockEnabled } from "@/services/mocks/mock-config";
import { withMock } from "@/services/mocks/with-mock";
import { useNotificationStore } from "@/store/notification.store";
import type { ApiResponse } from "@/types/api.types";
import type { RadiologyOrderDto } from "@/types/clinical.types";

export interface ImagingAttachment {
  id: string;
  fileName: string;
  contentType: string;
  /** Object URL (mock) or download URL (backend). */
  url: string;
  sizeBytes: number;
}

// Mock stores — in memory for the browser session (mock-layer rule).
const cancelReasons = new Map<string, string>();
const attachments = new Map<string, ImagingAttachment[]>();

export const SCAN_CANCEL_REASONS = [
  "Patient didn't come",
  "Patient refused",
  "Patient may be pregnant",
  "Machine not working",
  "Wrong scan requested",
  "Other",
] as const;

/** Imaging pieces the backend doesn't have yet — see docs/agents/backend-gaps.md#RAD-02-cancel and #RAD-03. */
export const imagingService = {
  /**
   * Cancel a scan request with a reason; the doctor is told.
   * TODO(backend): POST /clinical/radiology-orders/{id}/cancel { reason } — keep the reason
   * (today PATCH status CANCELLED stores none) and notify the doctor — see backend-gaps.md#RAD-02-cancel.
   */
  async cancel(order: RadiologyOrderDto, reason: string): Promise<RadiologyOrderDto> {
    return withMock(
      "imaging-cancel",
      async () => {
        // No cancel-with-reason endpoint yet: cancel via the status change; the reason is kept for this session only.
        const cancelled = await clinicalService.updateRadiologyOrderStatus(order.id, "CANCELLED");
        cancelReasons.set(order.id, reason);
        return cancelled;
      },
      async () => {
        const cancelled = await clinicalService.updateRadiologyOrderStatus(order.id, "CANCELLED");
        cancelReasons.set(order.id, reason);
        useNotificationStore.getState().addNotification({
          type: "general",
          title: `Scan cancelled: ${order.serviceName}`,
          message: `${order.serviceName} for ${order.patientName} was cancelled: ${reason.toLowerCase()}.`,
          patientId: order.patientId ?? undefined,
          patientName: order.patientName,
          href: `/opd?view=consult&encounterId=${order.encounterId}`,
        });
        return cancelled;
      },
    );
  },

  cancelReasonFor(order: Pick<RadiologyOrderDto, "id" | "cancellationReason">): string | null {
    return order.cancellationReason?.trim() || cancelReasons.get(order.id) || null;
  },

  /** TODO(backend): GET /clinical/radiology-orders/{id}/attachments — see backend-gaps.md#RAD-03. */
  async attachments(orderId: string): Promise<ImagingAttachment[]> {
    if (!isMockEnabled("imaging-attachments")) return []; // TODO(backend): fetch once the endpoint exists
    return withMock(
      "imaging-attachments",
      async () => {
        try {
          const res = await apiClient.get<ApiResponse<ImagingAttachment[]>>(`/clinical/radiology-orders/${orderId}/attachments`);
          return res.data.data;
        } catch {
          return []; // not available yet
        }
      },
      () => attachments.get(orderId) ?? [],
    );
  },

  /** TODO(backend): POST /clinical/radiology-orders/{id}/attachments (multipart; JPEG/PNG/PDF, max 20 MB) — see backend-gaps.md#RAD-03. */
  async attach(orderId: string, file: File): Promise<ImagingAttachment> {
    return withMock(
      "imaging-attachments",
      async () => {
        const body = new FormData();
        body.append("file", file);
        const res = await apiClient.post<ApiResponse<ImagingAttachment>>(`/clinical/radiology-orders/${orderId}/attachments`, body);
        return res.data.data;
      },
      () => {
        const item: ImagingAttachment = {
          id: `mock-att-${Date.now()}`,
          fileName: file.name,
          contentType: file.type,
          url: URL.createObjectURL(file),
          sizeBytes: file.size,
        };
        attachments.set(orderId, [...(attachments.get(orderId) ?? []), item]);
        return item;
      },
    );
  },

  /** Whether attaching files works here (mocked or real) — hides the drop zone when it can't. */
  attachmentsAvailable(): boolean {
    // TODO(backend): true once the attachments endpoint exists.
    return isMockEnabled("imaging-attachments");
  },
};
