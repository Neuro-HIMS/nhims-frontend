import type { Notification } from "@/store/notification.store";
import { NOTIFICATIONS_FIXTURE } from "@/services/mocks/fixtures/notifications";

export async function mockNotificationsFeed(): Promise<Omit<Notification, "read">[]> {
  return NOTIFICATIONS_FIXTURE;
}
