import type { AppModule, UserRole } from "@/types/auth.types";

export interface UserListItem {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string | null;
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  assignedModules: AppModule[];
}

export interface CreateUserPayload {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  facilityId?: string;
  assignedModules?: AppModule[];
}

export interface AccessReviewUser {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
}

export interface AccessReviewItem {
  module: AppModule;
  label: string;
  count: number;
  users: AccessReviewUser[];
}
