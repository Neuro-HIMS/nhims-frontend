// Billing module — frontend types. Mirrors com.nero.hims.billing DTOs.
// Reuses Bill/BillItem/Payment shapes from finance.types.ts to keep the
// model identical (the cashier and finance officer ultimately edit the
// same underlying ledger).

import type { BillDto, BillStatus, PayerType, PaymentDto, PaymentMethod, ServiceCatalogDto, ServiceGroup } from "@/types/finance.types";

export type { BillDto, BillStatus, PayerType, PaymentDto, PaymentMethod, ServiceCatalogDto, ServiceGroup };

export interface BillingDashboardDto {
  openBills: number;
  invoicedBills: number;
  partialBills: number;
  paidTodayCount: number;
  todayCollectedMinor: number;
  todayCashMinor: number;
  todayMomoMinor: number;
  todayCardMinor: number;
  todayInsuranceMinor: number;
  outstandingMinor: number;
  monthCollectedMinor: number;
}

export interface InvoiceGroupTotal {
  lineTotalMinor: number;
  discountMinor: number;
  nhisCoveredMinor: number;
  itemCount: number;
}

export interface InvoiceDetailDto {
  bill: BillDto;
  payments: PaymentDto[];
  totalsByGroup: Record<string, InvoiceGroupTotal>;
}

export interface ChargeInput {
  serviceId?: string | null;
  customServiceCode?: string;
  customServiceName?: string;
  customServiceGroup?: string;
  payerType?: string;
  quantity?: number;
  unitPriceMinorOverride?: number | null;
  discountMinor?: number;
  notes?: string;
}

export interface CreatePatientBillPayload {
  patientId: string;
  primaryPayer: PayerType | string;
  secondaryPayer?: PayerType | string;
  nhisMemberNo?: string;
  insuranceCardNo?: string;
  visitReference?: string;
  discountMinor?: number;
  notes?: string;
  charges: ChargeInput[];
}

export interface AddChargesPayload {
  charges: ChargeInput[];
}

export interface RecordBillPaymentPayload {
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

export interface ApplyDiscountPayload {
  discountMinor: number;
  reason?: string;
}

export interface ChargeKindOption {
  value: string;
  label: string;
}

export interface PaymentMethodOption {
  value: string;
  label: string;
}
