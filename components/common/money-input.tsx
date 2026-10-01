import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  id?: string;
  /** What the user typed, e.g. "120.50" (parse with `parseMoney` from lib/billing). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Plain-language problem shown under the field. */
  error?: string;
  className?: string;
  "aria-describedby"?: string;
}

/** Amount in Ghana cedis: "GH₵" prefix, tabular digits, 2 decimals (03-components.md). */
export function MoneyInput({ id, value, onChange, placeholder = "0.00", disabled, error, className, ...rest }: MoneyInputProps) {
  const errorId = id && error ? `${id}-error` : undefined;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">GH₵</span>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          onBlur={() => {
            const t = value.replace(/,/g, "").trim();
            if (/^\d+(\.\d{1,2})?$/.test(t) && !value.includes(",")) onChange(Number.parseFloat(t).toFixed(2));
          }}
          className="pl-12 font-clinical tabular-nums"
          aria-invalid={Boolean(error)}
          aria-describedby={[errorId, rest["aria-describedby"]].filter(Boolean).join(" ") || undefined}
        />
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
