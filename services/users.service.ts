import { apiClient } from "./api-client";
import type { ApiResponse } from "@/types/api.types";
import type { AppModule, UserRole } from "@/types/auth.types";
import type { AccessReviewItem, CreateUserPayload, UserListItem } from "@/types/users.types";

export const usersService = {
  async list(params?: { search?: string; role?: string; active?: boolean }): Promise<UserListItem[]> {
    const response = await apiClient.get<ApiResponse<UserListItem[]>>("/users", { params });
    return response.data.data;
  },

  async getById(userId: string): Promise<UserListItem> {
    const response = await apiClient.get<ApiResponse<UserListItem>>(`/users/${userId}`);
    return response.data.data;
  },

  async create(payload: CreateUserPayload): Promise<UserListItem> {
    const response = await apiClient.post<ApiResponse<UserListItem>>("/users", payload);
    return response.data.data;
  },

  async updateStatus(userId: string, active: boolean): Promise<UserListItem> {
    const response = await apiClient.patch<ApiResponse<UserListItem>>(`/users/${userId}/status`, { active });
    return response.data.data;
  },

  async updateAccess(userId: string, role: UserRole, assignedModules: AppModule[]): Promise<UserListItem> {
    const response = await apiClient.patch<ApiResponse<UserListItem>>(`/users/${userId}/access`, {
      role,
      assignedModules,
    });
    return response.data.data;
  },

  async resetPassword(userId: string): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/users/${userId}/reset-password`
    );
    return response.data.data;
  },

  async accessReview(): Promise<AccessReviewItem[]> {
    const response = await apiClient.get<ApiResponse<AccessReviewItem[]>>("/users/access-review");
    return response.data.data;
  },
};
