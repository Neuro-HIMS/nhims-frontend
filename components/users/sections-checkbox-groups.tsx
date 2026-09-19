import { NAV_GROUP_LABELS, NAV_GROUP_ORDER, NAV_ITEMS, type NavGroup } from "@/config/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { AppModule } from "@/types/auth.types";

interface SectionsCheckboxGroupsProps {
  selected: AppModule[];
  onToggle: (module: AppModule, checked: boolean) => void;
  /** Sections not yet available to assign — shown disabled with a reason, never hidden. */
  disabledModules?: ReadonlySet<AppModule>;
}

/** "Sections they can open" — checkboxes grouped exactly like the left-hand menu (design brief ADM-03/04). */
export function SectionsCheckboxGroups({ selected, onToggle, disabledModules }: SectionsCheckboxGroupsProps) {
  const groups = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: NAV_ITEMS.filter((item) => item.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {NAV_GROUP_LABELS[group as NavGroup]}
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {items.map((item) => {
              const checked = selected.includes(item.module);
              const disabled = disabledModules?.has(item.module) ?? false;
              return (
                <label
                  key={item.module}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-border px-3 py-2",
                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/50"
                  )}
                  title={disabled ? "Switched off for this facility" : undefined}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(next) => onToggle(item.module, next === true)}
                  />
                  <span className="text-sm text-foreground">{item.label}</span>
                  {disabled && <span className="text-xs text-muted-foreground">— switched off</span>}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
