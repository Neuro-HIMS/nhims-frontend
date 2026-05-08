import { cookies } from "next/headers";
import type { AppModule, Session } from "@/types/auth.types";

const ACCESS_COOKIE = process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME?.trim() || "hmis_access";

interface JwtPayload {
  exp: number;
  sub: string;
  username: string;
  firstName: string;
  lastName: string;
  role: Session["user"]["role"];
  assignedModules?: AppModule[];
  enabledHmisModuleKeys?: AppModule[];
  facilityId: string;
  facilityName: string;
  facilityCode: string;
  email: string;
  mustChangePassword?: boolean;
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) return null;

  try {
    const payload = decodeJwtPayload(token);

    if (!payload || isExpired(payload.exp)) {
      return null;
    }

    return {
      user: {
        userId: payload.sub,
        username: payload.username,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        assignedModules: payload.assignedModules ?? [],
        enabledHmisModuleKeys: payload.enabledHmisModuleKeys,
        facilityId: payload.facilityId,
        facilityName: payload.facilityName,
        facilityCode: payload.facilityCode,
        email: payload.email,
        mustChangePassword: Boolean(payload.mustChangePassword),
      },
      expiresAt: payload.exp * 1000,
    };
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(json) as Partial<JwtPayload>;

    if (!payload.exp || !payload.sub || !payload.role) {
      return null;
    }

    return payload as JwtPayload;
  } catch {
    return null;
  }
}

function isExpired(exp: number): boolean {
  return Date.now() / 1000 > exp - 30;
}
