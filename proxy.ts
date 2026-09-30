import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { PLACEHOLDER_MODULES, SHOW_PLACEHOLDER_SECTIONS } from "@/config/placeholder-sections";

const PREFIXES = PLACEHOLDER_MODULES.map((m) => `/${m}`);

export function proxy(request: NextRequest) {
  if (SHOW_PLACEHOLDER_SECTIONS) {
    return NextResponse.next();
  }
  const path = request.nextUrl.pathname;
  if (PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

// Must stay a static literal (Next reads it at build time) — keep in sync with PLACEHOLDER_MODULES.
export const config = {
  matcher: [
    "/surgery",
    "/surgery/:path*",
    "/dental",
    "/dental/:path*",
    "/mental-health",
    "/mental-health/:path*",
    "/physiotherapy",
    "/physiotherapy/:path*",
    "/blood-bank",
    "/blood-bank/:path*",
    "/emergency",
    "/emergency/:path*",
  ],
};
