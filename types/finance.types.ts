// ─────────────────────────────────────────────────────────────────────────────
// Finance module — frontend types. Mirrors the Java DTOs in
// com.nero.hims.finance.api.dto. Money is in *minor units* (pesewas for GHS).
// ─────────────────────────────────────────────────────────────────────────────

// Legacy V4 — kept for back-compat with existing screens.
export type FinancePriceCategory = "SERVICE" | "MEDICATION" | "SUPPLY" | "LAB" | "OTHER";
export type FinanceClaimStatus = "DRAFT" | "READY" | "SUBMITTED" | "REJECTED" | "PAID";

export interface FinancePriceItemDto {
  id: string;
  category: string;
  itemCode: string;
  itemName: string;
  unitPriceMinor: number;
  currency: string;
  active: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceNhisClaimDto {
  id: string;
  patientPublicId: string;
  claimReference: string;
  amountMinor: number;
  status: string;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceReportSnapshotDto {
  id: string;
  reportType: string;
  periodLabel: string;
  payloadJson: string;
  createdAt: string;
  createdByUserId: string | null;
}

// ─── V5 — service catalog, pricing matrix, billing, payments ─────────────────
export type ServiceGroup =
  | "CONSULTATION" | "LAB" | "IMAGING" | "PHARMACY" | "PROCEDURE"
  | "WARD" | "MATERNITY" | "DENTAL" | "THEATRE" | "EMERGENCY" | "OTHER";

export type PayerType =
  | "NHIS" | "IGF" | "CASH" | "INSURANCE_PRIVATE" | "CORPORATE" | "DONOR" | "CAPITATION";

export type PaymentMethod =
  | "CASH"
  | "MOMO_MTN" | "MOMO_VODAFONE" | "MOMO_AIRTELTIGO"
  | "BANK_CARD" | "BANK_TRANSFER" | "CHEQUE"
  | "NHIS_REIMBURSEMENT" | "INSURANCE_PAYOUT" | "WAIVER";

export type RevenueStream =
  | "IGF" | "NHIS" | "DONOR" | "CAPITATION"
  | "PRIVATE_INSURANCE" | "CORPORATE" | "OTHER";

export type BillStatus = "OPEN" | "INVOICED" | "PARTIAL" | "PAID" | "CANCELLED" | "WRITTEN_OFF";

export interface ServiceCatalogDto {
  id: string;
  serviceCode: string;
  serviceName: string;
  serviceGroup: ServiceGroup | string;
  nhisTariffCode: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePricingDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceGroup: ServiceGroup | string;
  payerType: PayerType | string;
  payerLabel: string;
  unitPriceMinor: number;
  currency: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  active: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillItemDto {
  id: string;
  serviceId: string | null;
  serviceCode: string;
  serviceName: string;
  serviceGroup: string;
  payerType: PayerType | string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  nhisCoveredMinor: number;
  discountMinor: number;
  currency: string;
}

export interface BillDto {
  id: string;
  billNumber: string;
  patientId: string | null;
  patientPublicId: string;
  patientName: string;
  primaryPayer: PayerType | string;
  secondaryPayer: PayerType | string;
  nhisMemberNo: string;
  insuranceCardNo: string;
  visitReference: string;
  status: BillStatus | string;
  subtotalMinor: number;
  discountMinor: number;
  nhisCoveredMinor: number;
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  currency: string;
  notes: string;
  issuedAt: string | null;
  closedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  items: BillItemDto[];
}

export interface PaymentDto {
  id: string;
  billId: string | null;
  receiptNumber: string;
  method: PaymentMethod | string;
  amountMinor: number;
  currency: string;
  payerLabel: string;
  momoProvider: string;
  momoMsisdn: string;
  momoTransactionId: string;
  bankReference: string;
  notes: string;
  receivedAt: string | null;
  receivedByUserId: string | null;
}

export interface FinanceDashboardDto {
  todayReceivedMinor: number;
  todayIgfMinor: number;
  todayNhisMinor: number;
  todayMomoMinor: number;
  monthReceivedMinor: number;
  monthIgfMinor: number;
  monthNhisMinor: number;
  openBills: number;
  partialBills: number;
  pendingClaimsMinor: number;
  submittedClaimsMinor: number;
  activeServiceCount: number;
  activePricingCount: number;
}

export interface RevenueSummaryDto {
  periodFrom: string;
  periodTo: string;
  totalReceivedMinor: number;
  totalAccruedMinor: number;
  totalEarnedMinor: number;
  receivedByStream: Record<string, number>;
  accruedByStream: Record<string, number>;
  receivedByMethod: Record<string, number>;
  dailyReceived: Array<{ day: string; amountMinor: number }>;
}

export interface CreateBillItemPayload {
  serviceId: string;
  payerType?: PayerType | string;
  quantity?: number;
  unitPriceMinorOverride?: number | null;
  discountMinor?: number;
}

export interface CreateBillPayload {
  patientId?: string | null;
  patientPublicId?: string;
  patientName: string;
  primaryPayer: PayerType | string;
  secondaryPayer?: PayerType | string;
  nhisMemberNo?: string;
  insuranceCardNo?: string;
  visitReference?: string;
  discountMinor?: number;
  notes?: string;
  items: CreateBillItemPayload[];
}

export interface RecordPaymentPayload {
  billId?: string | null;
  method: PaymentMethod | string;
  amountMinor: number;
  currency?: string;
  payerLabel?: string;
  momoProvider?: string;
  momoMsisdn?: string;
  momoTransactionId?: string;
  bankReference?: string;
  notes?: string;
}
