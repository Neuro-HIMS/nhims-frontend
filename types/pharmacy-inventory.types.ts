/** Mirrors backend pharmacy inventory DTOs (`com.nero.hims.pharmacy.api.dto`). */

export interface PharmacySupplierDto {
  id: string;
  name: string;
  country: string;
  city: string;
  street: string;
  streetNumber: string;
  postcode: string;
  addressLineExtra: string;
  contactPerson: string;
  contactEmail: string;
  phone: string;
  notes: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreatePharmacySupplierPayload {
  name: string;
  country?: string;
  city?: string;
  street?: string;
  streetNumber?: string;
  postcode?: string;
  addressLineExtra?: string;
  contactPerson?: string;
  contactEmail?: string;
  phone?: string;
  notes?: string;
}

export type UpdatePharmacySupplierPayload = Partial<CreatePharmacySupplierPayload> & {
  active?: boolean;
};

export interface PharmacyInventoryItemDto {
  id: string;
  catalogServiceId: string | null;
  catalogServiceName: string;
  defaultSupplierId: string | null;
  defaultSupplierName: string;
  skuCode: string;
  displayName: string;
  dosageForm: string;
  strength: string;
  reorderLevel: string | number;
  active: boolean;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreatePharmacyInventoryItemPayload {
  catalogServiceId?: string | null;
  defaultSupplierId?: string | null;
  skuCode?: string;
  displayName: string;
  dosageForm?: string;
  strength?: string;
  reorderLevel?: number;
  notes?: string;
}

export interface UpdatePharmacyInventoryItemPayload {
  removeCatalogLink?: boolean;
  removeDefaultSupplierLink?: boolean;
  catalogServiceId?: string | null;
  defaultSupplierId?: string | null;
  skuCode?: string;
  displayName?: string;
  dosageForm?: string;
  strength?: string;
  reorderLevel?: number;
  notes?: string;
  active?: boolean;
}

export type StockOverviewStatus = "ADEQUATE" | "LOW" | "OUT" | "EXPIRING_SOON";

export interface StockOverviewRowDto {
  itemId: string;
  skuCode: string;
  displayName: string;
  dosageForm: string;
  strength: string;
  reorderLevel: string | number;
  totalQuantityOnHand: string | number;
  nearestExpiry: string | null;
  stockStatus: StockOverviewStatus;
}

export interface PharmacyStockLotDto {
  id: string;
  itemId: string;
  itemDisplayName: string;
  supplierId: string | null;
  supplierName: string;
  batchNo: string;
  expiryDate: string | null;
  quantityOnHand: string | number;
  unit: string;
  unitCostMinor: number | null;
  currency: string;
  receivedAt: string | null;
}

export interface ReceiveStockPayload {
  itemId: string;
  supplierId?: string | null;
  batchNo?: string;
  expiryDate?: string | null;
  quantity: number;
  unit?: string;
  unitCostMinor?: number | null;
  currency?: string;
  referenceNote?: string;
}

export interface AdjustStockPayload {
  quantity: number;
  direction: "IN" | "OUT";
  referenceNote?: string;
}

export interface PharmacyStockMovementDto {
  id: string;
  lotId: string;
  itemId: string;
  itemDisplayName: string;
  batchNo: string;
  movementType: string;
  quantityDelta: string | number;
  referenceNote: string;
  createdByName: string;
  createdAt: string | null;
}

/** Bulk stock CSV import result from `/pharmacy/stock/import/csv`. */
export interface StockCsvImportResultDto {
  imported: number;
  skipped: number;
  errors: string[];
}
