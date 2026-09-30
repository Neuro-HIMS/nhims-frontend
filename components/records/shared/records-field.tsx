import type { ReactNode } from "react";

export function RecordsField({
  label,
  children,
  className,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  /** id of the control inside, so the label is linked to it (screen readers, click-to-focus). */
  htmlFor?: string;
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}


