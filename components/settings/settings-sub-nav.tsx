"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/settings/profile", label: "My profile" },
  { href: "/settings/security", label: "Sign-in and security" },
] as const;

export function SettingsSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account settings" className="flex flex-wrap gap-2 border-b border-border pb-4">
      {LINKS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
