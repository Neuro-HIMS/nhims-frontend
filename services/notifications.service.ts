import type { Notification } from "@/store/notification.store";
import { canSeeCriticalInbox } from "@/lib/permissions";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import { withMock } from "@/services/mocks/with-mock";
import { mockNotificationsFeed } from "@/services/mocks/handlers/notifications";

/** Open critical lab results for me (real endpoint) — always part of the bell. */
async function criticalLabItems(): Promise<Omit<Notification, "read">[]> {
  // Only some roles may read the inbox (backend INBOX_ROLES); don't poll a request that will be refused.
  if (!canSeeCriticalInbox(useAuthStore.getState().user?.role)) return [];
  try {
    const alerts = await clinicalService.labCriticalAlertsInbox();
    return alerts
      .filter((a) => a.status === "OPEN")
      .map((a) => ({
        id: `critical-${a.id}`,
        type: "critical_lab" as const,
        title: `Critical result: ${a.serviceName}`,
        message: `${a.summary.replace(/^Critical:\s*/i, "")} for ${a.patientPublicId}. Open the patient to act and confirm you've seen it.`,
        href: `/opd?view=consult&encounterId=${a.encounterId}`,
        createdAt: a.createdAt,
      }));
  } catch {
    return []; // roles without access to the lab inbox simply don't see these
  }
}

export const notificationsService = {
  /**
   * Critical lab results come from the real inbox. Everything else:
   * TODO(backend): GET /notifications — see docs/agents/backend-gaps.md#ALL-06.
   * Until it exists, the general feed only has items when NEXT_PUBLIC_MOCK_AREAS includes
   * "notifications" — otherwise it's empty ("You're all caught up." is a real, valid state).
   */
  async feed(): Promise<Omit<Notification, "read">[]> {
    const [critical, general] = await Promise.all([
      criticalLabItems(),
      withMock("notifications", async () => [] as Omit<Notification, "read">[], mockNotificationsFeed),
    ]);
    return [...critical, ...general];
  },
};
