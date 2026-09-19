import { toast } from "sonner";

/**
 * The one way to show a toast. Keeps wording, duration and dismiss behaviour
 * consistent app-wide (design brief §8.4/§8.3: errors stay until closed).
 */
export const notify = {
  success(message: string) {
    toast.success(message);
  },
  /** Stays on screen until the user closes it — never auto-hides. */
  error(message: string) {
    toast.error(message, { duration: Infinity });
  },
  info(message: string) {
    toast.message(message);
  },
};
