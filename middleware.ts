import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PREFIXES = ["/surgery", "/dental", "/mental-health", "/physiotherapy", "/blood-bank", "/emergency"];

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_PLACEHOLDER_SPECIALTY_ROUTES === "true") {
    return NextResponse.next();
  }
  const path = request.nextUrl.pathname;
  if (PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

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
