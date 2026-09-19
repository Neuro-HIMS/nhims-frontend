import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  CloudUpload,
  Frown,
  ListX,
  ServerCrash,
  ShieldOff,
  UserSearch,
  WifiOff,
} from "lucide-react";

export type IllustrationName =
  | "no-results"
  | "all-done"
  | "empty-list"
  | "choose-patient"
  | "error"
  | "offline"
  | "no-access"
  | "upload";

const ICONS: Record<IllustrationName, LucideIcon> = {
  "no-results": Frown,
  "all-done": CheckCircle2,
  "empty-list": ListX,
  "choose-patient": UserSearch,
  error: ServerCrash,
  offline: WifiOff,
  "no-access": ShieldOff,
  upload: CloudUpload,
};

/** Plain greyscale icon-in-a-circle "illustration" — used by EmptyState/ErrorState/UploadDropzone. */
export function Illustration({ name, tone = "default" }: { name: IllustrationName; tone?: "default" | "good-news" }) {
  const Icon = ICONS[name];
  return (
    <div
      className={
        tone === "good-news"
          ? "mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-bg"
          : "mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted"
      }
    >
      <Icon
        className={tone === "good-news" ? "h-7 w-7 text-success" : "h-7 w-7 text-muted-foreground"}
        aria-hidden="true"
      />
    </div>
  );
}
