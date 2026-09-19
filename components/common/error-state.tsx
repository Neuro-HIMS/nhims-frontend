import { Illustration } from "@/components/common/illustrations";
import { Button } from "@/components/ui/button";
import { getFriendlyError } from "@/lib/api-errors";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

/** A section that failed to load — message + "Try again", rest of the page stays usable (design brief §8.3). */
export function ErrorState({ error, onRetry, title, className }: ErrorStateProps) {
  const friendly = getFriendlyError(error);
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <Illustration name="error" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title ?? friendly.title}</p>
        <p className="text-sm text-muted-foreground">{friendly.message}</p>
        {friendly.reference && <p className="text-xs text-muted-foreground">Reference: {friendly.reference}</p>}
      </div>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
