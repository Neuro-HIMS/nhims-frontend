import { apiClient } from "./api-client";
import { withMock } from "@/services/mocks/with-mock";

export interface FeedbackSubmission {
  message: string;
  pageUrl?: string;
}

export const feedbackService = {
  /** TODO(backend): POST /feedback — see docs/agents/backend-gaps.md#ALL-08. */
  async submit(body: FeedbackSubmission): Promise<void> {
    return withMock(
      "feedback",
      async () => {
        await apiClient.post("/feedback", body);
      },
      async () => undefined
    );
  },
};
