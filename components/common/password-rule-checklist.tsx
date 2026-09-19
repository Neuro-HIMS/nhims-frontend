import { Check, Circle } from "lucide-react";

import { PASSWORD_RULES } from "@/schemas/password.schema";
import { cn } from "@/lib/utils";

/** Live rule checklist shown under a new-password field — rules are visible before typing. */
export function PasswordRuleChecklist({ value }: { value: string }) {
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.id}
            className={cn("flex items-center gap-1.5 text-xs", met ? "text-success" : "text-muted-foreground")}
          >
            {met ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
