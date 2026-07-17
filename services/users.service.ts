import { apiClient } from "./api-client";
import { normalizeModuleKey, normalizeModuleKeys, toBackendModuleKey } from "@/lib/module-keys";
import type { ApiResponse } from "@/types/api.types";
import type { AppModule, UserRole } from "@/types/auth.types";
import type { AccessReviewItem, CreateUserPayload, UserListItem } from "@/types/users.types";

/** Backend user DTOs carry uppercase module enum names — normalise to AppModule keys. */
function normalizeUserListItem(item: UserListItem): UserListItem {
  return { ...item, assignedModules: normalizeModuleKeys(item.assignedModules) };
}

export const usersService = {
  async list(params?: { search?: string; role?: string; active?: boolean }): Promise<UserListItem[]> {
    const response = await apiClient.get<ApiResponse<UserListItem[]>>("/users", { params });
    return response.data.data.map(normalizeUserListItem);
  },

  async getById(userId: string): Promise<UserListItem> {
    const response = await apiClient.get<ApiResponse<UserListItem>>(`/users/${userId}`);
    return normalizeUserListItem(response.data.data);
  },

  async create(payload: CreateUserPayload): Promise<UserListItem> {
    const body = {
      ...payload,
      assignedModules: payload.assignedModules?.map(toBackendModuleKey),
    };
    const response = await apiClient.post<ApiResponse<UserListItem>>("/users", body);
    return normalizeUserListItem(response.data.data);
  },

  async updateStatus(userId: string, active: boolean): Promise<UserListItem> {
    const response = await apiClient.patch<ApiResponse<UserListItem>>(`/users/${userId}/status`, { active });
    return normalizeUserListItem(response.data.data);
  },

  async updateAccess(userId: string, role: UserRole, assignedModules: AppModule[]): Promise<UserListItem> {
    const response = await apiClient.patch<ApiResponse<UserListItem>>(`/users/${userId}/access`, {
      role,
      assignedModules: assignedModules.map(toBackendModuleKey),
    });
    return normalizeUserListItem(response.data.data);
  },

  async resetPassword(userId: string): Promise<{ message: string; passwordResetToken: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string; passwordResetToken: string }>>(
      `/users/${userId}/reset-password`
    );
    return response.data.data;
  },

  async accessReview(): Promise<AccessReviewItem[]> {
    const response = await apiClient.get<ApiResponse<AccessReviewItem[]>>("/users/access-review");
    return response.data.data.map((item) => ({
      ...item,
      module: normalizeModuleKey(item.module),
    }));
  },
};
