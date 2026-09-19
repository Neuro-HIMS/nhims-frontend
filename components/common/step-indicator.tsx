import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  /** 0-based index of the current step. */
  current: number;
  /** 0-based indices the user may still jump back to. */
  onStepClick?: (index: number) => void;
  className?: string;
}

/** Numbered progress rail for a multi-step form (design brief §8.6) — done, current, and upcoming steps. */
export function StepIndicator({ steps, current, onStepClick, className }: StepIndicatorProps) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-1 gap-y-2", className)}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = Boolean(onStepClick) && index < current;

        return (
          <li key={step.label} className="flex items-center">
            {index > 0 && (
              <span
                className={cn("mx-1.5 h-px w-4 shrink-0 sm:w-8", done ? "bg-primary" : "bg-border")}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              disabled={!clickable}
              aria-current={active ? "step" : undefined}
              onClick={() => clickable && onStepClick?.(index)}
              className={cn(
                "flex items-center gap-2 rounded-full px-1 py-1 text-left text-sm",
                clickable ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done && "bg-primary text-primary-foreground",
                  active && "border-2 border-primary text-primary",
                  !done && !active && "border border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden font-medium sm:inline",
                  active ? "text-foreground" : done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
