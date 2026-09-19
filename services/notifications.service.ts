import type { Notification } from "@/store/notification.store";
import { withMock } from "@/services/mocks/with-mock";
import { mockNotificationsFeed } from "@/services/mocks/handlers/notifications";

export const notificationsService = {
  /**
   * TODO(backend): GET /notifications — see docs/agents/backend-gaps.md#ALL-06.
   * Until it exists, this only returns data when NEXT_PUBLIC_MOCK_AREAS includes
   * "notifications" — otherwise it resolves to an empty feed (the bell shows
   * "You're all caught up.", which is a real, valid state, not an error).
   */
  async feed(): Promise<Omit<Notification, "read">[]> {
    return withMock(
      "notifications",
      async () => {
        // The endpoint doesn't exist yet — resolve to empty rather than
        // throwing, so the bell shows the real "all caught up" empty state
        // instead of erroring on every page.
        return [];
      },
      mockNotificationsFeed
    );
  },
};
