import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type {
  BillDto,
  CreateBillPayload,
  FinanceDashboardDto,
  FinanceNhisClaimDto,
  FinancePriceItemDto,
  FinanceReportSnapshotDto,
  PaymentDto,
  RecordPaymentPayload,
  RevenueSummaryDto,
  ServiceCatalogDto,
  ServicePricingDto,
} from "@/types/finance.types";

// ─────────────────────────────────────────────────────────────────────────────
// Centralised Finance API client. Extending — keeps the legacy V4 endpoints
// (price items, NHIS claims, NHIS reports) so existing screens stay green.
// ─────────────────────────────────────────────────────────────────────────────
export const financeService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  async dashboard(): Promise<FinanceDashboardDto> {
    const res = await apiClient.get<ApiResponse<FinanceDashboardDto>>("/finance/dashboard");
    return res.data.data;
  },

  // ── Service catalog (canonical names) ──────────────────────────────────────
  async listServices(activeOnly = false): Promise<ServiceCatalogDto[]> {
    const res = await apiClient.get<ApiResponse<ServiceCatalogDto[]>>("/finance/catalog/services", {
      params: { activeOnly },
    });
    return res.data.data;
  },

  async createService(payload: {
    serviceCode: string;
    serviceName: string;
    serviceGroup: string;
    nhisTariffCode?: string;
    description?: string;
    active?: boolean;
  }): Promise<ServiceCatalogDto> {
    const res = await apiClient.post<ApiResponse<ServiceCatalogDto>>("/finance/catalog/services", payload);
    return res.data.data;
  },

  async updateService(
    serviceId: string,
    payload: {
      serviceName: string;
      serviceGroup: string;
      nhisTariffCode?: string;
      description?: string;
      active?: boolean;
    },
  ): Promise<ServiceCatalogDto> {
    const res = await apiClient.put<ApiResponse<ServiceCatalogDto>>(`/finance/catalog/services/${serviceId}`, payload);
    return res.data.data;
  },

  async serviceGroups(): Promise<string[]> {
    const res = await apiClient.get<ApiResponse<string[]>>("/finance/catalog/groups");
    return res.data.data;
  },

  async payerTypes(): Promise<string[]> {
    const res = await apiClient.get<ApiResponse<string[]>>("/finance/catalog/payers");
    return res.data.data;
  },

  async paymentMethods(): Promise<Array<{ value: string; label: string }>> {
    const res = await apiClient.get<ApiResponse<Array<{ value: string; label: string }>>>(
      "/finance/catalog/payment-methods",
    );
    return res.data.data;
  },

  // ── Pricing matrix ─────────────────────────────────────────────────────────
  async listPricingMatrix(params?: { serviceId?: string; payerType?: string }): Promise<ServicePricingDto[]> {
    const res = await apiClient.get<ApiResponse<ServicePricingDto[]>>("/finance/pricing/matrix", { params });
    return res.data.data;
  },

  async addPricing(payload: {
    serviceId: string;
    payerType: string;
    payerLabel?: string;
    unitPriceMinor: number;
    currency?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    active?: boolean;
    notes?: string;
  }): Promise<ServicePricingDto> {
    const res = await apiClient.post<ApiResponse<ServicePricingDto>>("/finance/pricing/matrix", payload);
    return res.data.data;
  },

  async updatePricing(
    pricingId: string,
    payload: {
      serviceId: string;
      payerType: string;
      payerLabel?: string;
      unitPriceMinor: number;
      currency?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
      active?: boolean;
      notes?: string;
    },
  ): Promise<ServicePricingDto> {
    const res = await apiClient.put<ApiResponse<ServicePricingDto>>(
      `/finance/pricing/matrix/${pricingId}`,
      payload,
    );
    return res.data.data;
  },

  // ── Billing ────────────────────────────────────────────────────────────────
  async listBills(): Promise<BillDto[]> {
    const res = await apiClient.get<ApiResponse<BillDto[]>>("/finance/bills");
    return res.data.data;
  },

  async getBill(billId: string): Promise<BillDto> {
    const res = await apiClient.get<ApiResponse<BillDto>>(`/finance/bills/${billId}`);
    return res.data.data;
  },

  async createBill(payload: CreateBillPayload): Promise<BillDto> {
    const res = await apiClient.post<ApiResponse<BillDto>>("/finance/bills", payload);
    return res.data.data;
  },

  async cancelBill(billId: string, reason?: string): Promise<BillDto> {
    const res = await apiClient.delete<ApiResponse<BillDto>>(`/finance/bills/${billId}`, {
      params: reason ? { reason } : undefined,
    });
    return res.data.data;
  },

  // ── Payments ───────────────────────────────────────────────────────────────
  async listPayments(): Promise<PaymentDto[]> {
    const res = await apiClient.get<ApiResponse<PaymentDto[]>>("/finance/payments");
    return res.data.data;
  },

  async listPaymentsForBill(billId: string): Promise<PaymentDto[]> {
    const res = await apiClient.get<ApiResponse<PaymentDto[]>>(`/finance/bills/${billId}/payments`);
    return res.data.data;
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<PaymentDto> {
    const res = await apiClient.post<ApiResponse<PaymentDto>>("/finance/payments", payload);
    return res.data.data;
  },

  // ── Revenue ────────────────────────────────────────────────────────────────
  async revenueSummary(params?: { from?: string; to?: string }): Promise<RevenueSummaryDto> {
    const res = await apiClient.get<ApiResponse<RevenueSummaryDto>>("/finance/revenue/summary", { params });
    return res.data.data;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Legacy V4 endpoints — kept for back-compat with the old workspace views.
  // ───────────────────────────────────────────────────────────────────────────
  async listPricing(): Promise<FinancePriceItemDto[]> {
    const res = await apiClient.get<ApiResponse<FinancePriceItemDto[]>>("/finance/pricing/items");
    return res.data.data;
  },
  async createPricing(payload: {
    category: string;
    itemCode: string;
    itemName: string;
    unitPriceMinor: number;
    currency?: string;
    notes?: string;
  }): Promise<FinancePriceItemDto> {
    const res = await apiClient.post<ApiResponse<FinancePriceItemDto>>("/finance/pricing/items", payload);
    return res.data.data;
  },
  async updatePricingLegacy(
    itemId: string,
    payload: {
      category: string;
      itemName: string;
      unitPriceMinor: number;
      currency?: string;
      active: boolean;
      notes?: string;
    },
  ): Promise<FinancePriceItemDto> {
    const res = await apiClient.put<ApiResponse<FinancePriceItemDto>>(`/finance/pricing/items/${itemId}`, payload);
    return res.data.data;
  },
  async listClaims(): Promise<FinanceNhisClaimDto[]> {
    const res = await apiClient.get<ApiResponse<FinanceNhisClaimDto[]>>("/finance/nhis/claims");
    return res.data.data;
  },
  async createClaim(payload: {
    patientPublicId?: string;
    claimReference?: string;
    amountMinor: number;
    status?: string;
    servicePeriodStart?: string;
    servicePeriodEnd?: string;
    notes?: string;
  }): Promise<FinanceNhisClaimDto> {
    const res = await apiClient.post<ApiResponse<FinanceNhisClaimDto>>("/finance/nhis/claims", payload);
    return res.data.data;
  },
  async patchClaimStatus(claimId: string, status: string): Promise<FinanceNhisClaimDto> {
    const res = await apiClient.patch<ApiResponse<FinanceNhisClaimDto>>(
      `/finance/nhis/claims/${claimId}/status`,
      { status },
    );
    return res.data.data;
  },
  async listReports(): Promise<FinanceReportSnapshotDto[]> {
    const res = await apiClient.get<ApiResponse<FinanceReportSnapshotDto[]>>("/finance/nhis/reports");
    return res.data.data;
  },
  async generateReport(payload?: { periodLabel?: string; reportType?: string }): Promise<FinanceReportSnapshotDto> {
    const res = await apiClient.post<ApiResponse<FinanceReportSnapshotDto>>(
      "/finance/nhis/reports/generate",
      payload ?? {},
    );
    return res.data.data;
  },

};
