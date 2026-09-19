import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface UnitInputProps {
  value: string;
  onChange: (value: string) => void;
  /** e.g. "°C", "mmHg", "kg", "minutes" */
  unit?: string;
  /** Shown under the field in muted text, e.g. "From 5 to 300 seconds". */
  hint?: string;
  /** Shown under the field in warning tone when the value is out of the expected range. */
  warning?: string;
  type?: "text" | "number";
  min?: number;
  max?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** A number/text field with a suffix unit and an optional out-of-range warning (design brief §9, 03-components.md §6). */
export function UnitInput({
  value,
  onChange,
  unit,
  hint,
  warning,
  type = "number",
  min,
  max,
  disabled,
  id,
  className,
}: UnitInputProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={type}
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(unit && "flex-1", warning && "border-warning")}
        />
        {unit && <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{unit}</span>}
      </div>
      {warning ? (
        <p className="text-xs text-warning">{warning}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
