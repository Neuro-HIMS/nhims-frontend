import { apiClient } from "@/services/api-client";
import type { ApiResponse, PagedResponse } from "@/types/api.types";
import type {
  AddChargesPayload,
  ApplyDiscountPayload,
  BillDto,
  BillingDashboardDto,
  ChargeKindOption,
  CreatePatientBillPayload,
  InvoiceDetailDto,
  PaymentDto,
  PaymentMethodOption,
  RecordBillPaymentPayload,
} from "@/types/billing.types";

// ─────────────────────────────────────────────────────────────────────────────
// Billing API client. Cashier-side wrapper around the finance ledger.
// Distinct from financeService — different audience, different calls.
// ─────────────────────────────────────────────────────────────────────────────
export const billingService = {
  async dashboard(): Promise<BillingDashboardDto> {
    const res = await apiClient.get<ApiResponse<BillingDashboardDto>>("/billing/dashboard");
    return res.data.data;
  },

  async listBills(params?: { status?: string; search?: string }): Promise<BillDto[]> {
    const res = await apiClient.get<ApiResponse<BillDto[]>>("/billing/bills", { params });
    return res.data.data;
  },

  async billsForPatient(
    patientId: string,
    params?: { page?: number; size?: number },
  ): Promise<PagedResponse<BillDto>> {
    const res = await apiClient.get<ApiResponse<PagedResponse<BillDto>>>(
      `/billing/bills/by-patient/${patientId}`,
      { params },
    );
    return res.data.data;
  },

  async getInvoice(billId: string): Promise<InvoiceDetailDto> {
    const res = await apiClient.get<ApiResponse<InvoiceDetailDto>>(`/billing/bills/${billId}/invoice`);
    return res.data.data;
  },

  async createBill(payload: CreatePatientBillPayload): Promise<BillDto> {
    const res = await apiClient.post<ApiResponse<BillDto>>("/billing/bills", payload);
    return res.data.data;
  },

  async addCharges(billId: string, payload: AddChargesPayload): Promise<InvoiceDetailDto> {
    const res = await apiClient.post<ApiResponse<InvoiceDetailDto>>(`/billing/bills/${billId}/charges`, payload);
    return res.data.data;
  },

  async removeCharge(billId: string, itemId: string): Promise<InvoiceDetailDto> {
    const res = await apiClient.delete<ApiResponse<InvoiceDetailDto>>(`/billing/bills/${billId}/charges/${itemId}`);
    return res.data.data;
  },

  async applyDiscount(billId: string, payload: ApplyDiscountPayload): Promise<InvoiceDetailDto> {
    const res = await apiClient.post<ApiResponse<InvoiceDetailDto>>(`/billing/bills/${billId}/discount`, payload);
    return res.data.data;
  },

  async invoiceBill(billId: string): Promise<BillDto> {
    const res = await apiClient.post<ApiResponse<BillDto>>(`/billing/bills/${billId}/invoice`);
    return res.data.data;
  },

  async cancelBill(billId: string, reason?: string): Promise<BillDto> {
    const res = await apiClient.post<ApiResponse<BillDto>>(`/billing/bills/${billId}/cancel`, { reason });
    return res.data.data;
  },

  async recordPayment(billId: string, payload: RecordBillPaymentPayload): Promise<PaymentDto> {
    const res = await apiClient.post<ApiResponse<PaymentDto>>(`/billing/bills/${billId}/payments`, payload);
    return res.data.data;
  },

  async listPayments(): Promise<PaymentDto[]> {
    const res = await apiClient.get<ApiResponse<PaymentDto[]>>("/billing/payments");
    return res.data.data;
  },

  async listPaymentsForBill(billId: string): Promise<PaymentDto[]> {
    const res = await apiClient.get<ApiResponse<PaymentDto[]>>(`/billing/bills/${billId}/payments`);
    return res.data.data;
  },

  async paymentMethods(): Promise<PaymentMethodOption[]> {
    const res = await apiClient.get<ApiResponse<PaymentMethodOption[]>>("/billing/payment-methods");
    return res.data.data;
  },

  async chargeKinds(): Promise<ChargeKindOption[]> {
    const res = await apiClient.get<ApiResponse<ChargeKindOption[]>>("/billing/charge-kinds");
    return res.data.data;
  },
};
