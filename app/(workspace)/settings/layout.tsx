import { SettingsSubNav } from "@/components/settings/settings-sub-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your profile and sign-in security.</p>
      </div>
      <SettingsSubNav />
      {children}
    </div>
  );
}
