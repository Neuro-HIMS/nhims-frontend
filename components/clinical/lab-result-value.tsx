import { ArrowDown, ArrowUp, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export type LabFlag = "NORMAL" | "LOW" | "HIGH" | "CRITICAL";

interface LabResultValueProps {
  value: string | number;
  unit?: string;
  flag: LabFlag;
  /** e.g. "3.5–5.0 mmol/L" — always shown alongside the value. */
  refRange?: string;
  className?: string;
}

/** A lab value with its flag — low is blue, high is orange, critical is a bold red pill. Never color alone. */
export function LabResultValue({ value, unit, flag, refRange, className }: LabResultValueProps) {
  const text = unit ? `${value} ${unit}` : String(value);

  if (flag === "CRITICAL") {
    return (
      <span className={cn("inline-flex flex-col gap-0.5", className)}>
        <span className="result-critical inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-sm">
          <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          {text} — Critical
        </span>
        {refRange && <span className="font-clinical text-xs text-muted-foreground">Normal range: {refRange}</span>}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "font-clinical inline-flex w-fit items-center gap-1 text-sm",
          flag === "LOW" && "result-low",
          flag === "HIGH" && "result-high",
          flag === "NORMAL" && "text-[hsl(var(--result-normal))]"
        )}
      >
        {flag === "LOW" && <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />}
        {flag === "HIGH" && <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />}
        {text}
        {flag === "LOW" && " — Low"}
        {flag === "HIGH" && " — High"}
      </span>
      {refRange && <span className="font-clinical text-xs text-muted-foreground">Normal range: {refRange}</span>}
    </span>
  );
}
