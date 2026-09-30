import { EmptyState } from "@/components/common/empty-state";
import { PageCard } from "@/components/layouts/page-card";
import { NAV_ITEMS } from "@/config/navigation";
import type { AppModule } from "@/types/auth.types";

export interface ClinicalServiceModuleWorkspaceProps {
  module: AppModule;
}

/** Placeholder for sections with no screens yet (see `config/placeholder-sections.ts`). */
export function ClinicalServiceModuleWorkspace({ module }: ClinicalServiceModuleWorkspaceProps) {
  const title = NAV_ITEMS.find((item) => item.module === module)?.label ?? "This section";

  return (
    <div className="space-y-4">
      <PageCard title={title} description="This part of NHIMS is still being built." />
      <div className="rounded-xl border border-border bg-card">
        <EmptyState
          illustration="empty-list"
          title="This section isn't ready yet."
          description="You can't record anything here yet. Keep using your usual paper forms for now."
          action={{ label: "Go to home", href: "/" }}
        />
      </div>
    </div>
  );
}
