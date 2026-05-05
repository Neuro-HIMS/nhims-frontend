import type { AppModule } from "@/types/auth.types";

interface ModuleHomeProps {
  module: AppModule;
  title: string;
  description: string;
}

export function ModuleHome({ module, title, description }: ModuleHomeProps) {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{module} module</p>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </header>

      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Simulation screen: backend integration is pending. Use this page to validate role/module routing and
          permissions.
        </p>
      </div>
    </section>
  );
}
