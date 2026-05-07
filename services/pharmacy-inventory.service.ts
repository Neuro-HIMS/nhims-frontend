import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type {
  AdjustStockPayload,
  CreatePharmacyInventoryItemPayload,
  CreatePharmacySupplierPayload,
  PharmacyInventoryItemDto,
  PharmacyStockLotDto,
  PharmacyStockMovementDto,
  PharmacySupplierDto,
  ReceiveStockPayload,
  StockCsvImportResultDto,
  StockOverviewRowDto,
  UpdatePharmacyInventoryItemPayload,
  UpdatePharmacySupplierPayload,
} from "@/types/pharmacy-inventory.types";

export const pharmacyInventoryService = {
  async listSuppliers(params?: {
    q?: string;
    country?: string;
    active?: boolean;
  }): Promise<PharmacySupplierDto[]> {
    const res = await apiClient.get<ApiResponse<PharmacySupplierDto[]>>("/pharmacy/suppliers", {
      params: {
        q: params?.q || undefined,
        country: params?.country || undefined,
        active: params?.active,
      },
    });
    return res.data.data;
  },

  async getSupplier(id: string): Promise<PharmacySupplierDto> {
    const res = await apiClient.get<ApiResponse<PharmacySupplierDto>>(`/pharmacy/suppliers/${id}`);
    return res.data.data;
  },

  async createSupplier(payload: CreatePharmacySupplierPayload): Promise<PharmacySupplierDto> {
    const res = await apiClient.post<ApiResponse<PharmacySupplierDto>>("/pharmacy/suppliers", payload);
    return res.data.data;
  },

  async updateSupplier(id: string, payload: UpdatePharmacySupplierPayload): Promise<PharmacySupplierDto> {
    const res = await apiClient.patch<ApiResponse<PharmacySupplierDto>>(`/pharmacy/suppliers/${id}`, payload);
    return res.data.data;
  },

  async deactivateSupplier(id: string): Promise<void> {
    await apiClient.delete(`/pharmacy/suppliers/${id}`);
  },

  async listInventoryItems(active?: boolean): Promise<PharmacyInventoryItemDto[]> {
    const res = await apiClient.get<ApiResponse<PharmacyInventoryItemDto[]>>("/pharmacy/inventory-items", {
      params: active !== undefined ? { active } : undefined,
    });
    return res.data.data;
  },

  async getInventoryItem(id: string): Promise<PharmacyInventoryItemDto> {
    const res = await apiClient.get<ApiResponse<PharmacyInventoryItemDto>>(`/pharmacy/inventory-items/${id}`);
    return res.data.data;
  },

  async createInventoryItem(payload: CreatePharmacyInventoryItemPayload): Promise<PharmacyInventoryItemDto> {
    const res = await apiClient.post<ApiResponse<PharmacyInventoryItemDto>>("/pharmacy/inventory-items", payload);
    return res.data.data;
  },

  async updateInventoryItem(
    id: string,
    payload: UpdatePharmacyInventoryItemPayload,
  ): Promise<PharmacyInventoryItemDto> {
    const res = await apiClient.patch<ApiResponse<PharmacyInventoryItemDto>>(
      `/pharmacy/inventory-items/${id}`,
      payload,
    );
    return res.data.data;
  },

  async deactivateInventoryItem(id: string): Promise<void> {
    await apiClient.delete(`/pharmacy/inventory-items/${id}`);
  },

  async stockOverview(activeItemsOnly?: boolean): Promise<StockOverviewRowDto[]> {
    const res = await apiClient.get<ApiResponse<StockOverviewRowDto[]>>("/pharmacy/stock/overview", {
      params: activeItemsOnly !== undefined ? { activeItemsOnly } : undefined,
    });
    return res.data.data;
  },

  async listLots(itemId?: string): Promise<PharmacyStockLotDto[]> {
    const res = await apiClient.get<ApiResponse<PharmacyStockLotDto[]>>("/pharmacy/stock/lots", {
      params: itemId ? { itemId } : undefined,
    });
    return res.data.data;
  },

  async listMovements(itemId?: string): Promise<PharmacyStockMovementDto[]> {
    const res = await apiClient.get<ApiResponse<PharmacyStockMovementDto[]>>("/pharmacy/stock/movements", {
      params: itemId ? { itemId } : undefined,
    });
    return res.data.data;
  },

  async receiveStock(payload: ReceiveStockPayload): Promise<PharmacyStockLotDto> {
    const res = await apiClient.post<ApiResponse<PharmacyStockLotDto>>("/pharmacy/stock/receive", payload);
    return res.data.data;
  },

  async adjustLot(lotId: string, payload: AdjustStockPayload): Promise<PharmacyStockLotDto> {
    const res = await apiClient.post<ApiResponse<PharmacyStockLotDto>>(
      `/pharmacy/stock/lots/${lotId}/adjust`,
      payload,
    );
    return res.data.data;
  },

  async exportStockCsv(activeItemsOnly = true): Promise<Blob> {
    const res = await apiClient.get("/pharmacy/stock/export/csv", {
      params: { activeItemsOnly },
      responseType: "blob",
    });
    return res.data as Blob;
  },

  async importStockCsv(file: File): Promise<StockCsvImportResultDto> {
    const body = new FormData();
    body.append("file", file);
    const res = await apiClient.post<ApiResponse<StockCsvImportResultDto>>("/pharmacy/stock/import/csv", body);
    return res.data.data;
  },
};
