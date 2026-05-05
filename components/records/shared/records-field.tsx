import type { ReactNode } from "react";

export function RecordsField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}


