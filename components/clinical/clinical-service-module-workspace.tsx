"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ModuleSubNav, type SubNavItem } from "@/components/layouts/module-subnav";
import type { AppModule } from "@/types/auth.types";

export interface ClinicalServiceModuleWorkspaceProps {
  module: AppModule;
  title: string;
  subtitle: string;
  facilityServiceId: string;
  basePath: string;
  subNav: SubNavItem[];
}

export function ClinicalServiceModuleWorkspace({
  module,
  title,
  subtitle,
  facilityServiceId,
  basePath,
  subNav,
}: ClinicalServiceModuleWorkspaceProps) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? subNav[0]?.view ?? "overview";

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <p className="text-xs text-muted-foreground">
          Facility service line{" "}
          <span className="font-mono text-foreground/90">{facilityServiceId}</span>
          {" · "}
          Workspace module{" "}
          <Link href={basePath} className="font-medium text-primary underline-offset-4 hover:underline">
            {module}
          </Link>
        </p>
      </header>
      <ModuleSubNav items={subNav} basePath={basePath} />
      <div className="rounded-lg border border-border bg-card p-5 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Simulation · {view}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Backend workflows for this module are still pending. Routing, JWT module keys, and Facility Settings → Services are aligned so toggling the matching service
          line reflects planned capacity for this workspace.
        </p>
      </div>
    </div>
  );
}
