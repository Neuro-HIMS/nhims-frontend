import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SuccessPanelAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary";
}

interface SuccessPanelProps {
  title: string;
  description: string;
  actions?: SuccessPanelAction[];
}

/** Milestone confirmation (patient registered, bill paid, …) with what to do next (design brief §8.4). */
export function SuccessPanel({ title, description, actions }: SuccessPanelProps) {
  return (
    <div className="rounded-xl border border-success/30 bg-success-bg p-5 text-center">
      <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {actions && actions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <Button key={action.label} type="button" variant={action.variant ?? "outline"} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
