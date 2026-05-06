"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  BillingItemKind,
  BillingItemStatus,
  BillingLineItem,
  RadiologyOrder,
  RadiologyOrderStatus,
  TreatmentEntry,
} from "@/lib/clinical-types";

/**
 * Stripped-down in-browser store. Phase 8 retired most of this surface
 * in favour of the backend `/api/clinical/...` APIs. The two slices that
 * stay are radiology orders + the nursing treatment sheet — they don't
 * have backend counterparts yet (planned outside the nurse-station
 * scope) so they remain client-only for now.
 *
 * When radiology and the treatment sheet move to the backend, this file
 * can be deleted entirely.
 */
interface EncountersState {
  treatments: TreatmentEntry[];
  radiologyOrders: RadiologyOrder[];
  /** Local-only billing tape for radiology orders (radiology workspace
   * uses it to gate report submission on payment). When radiology moves
   * to the backend, this disappears too. */
  billing: BillingLineItem[];

  addTreatment: (
    entry: Omit<TreatmentEntry, "id" | "prescribedAt" | "status"> & {
      status?: TreatmentEntry["status"];
    },
  ) => TreatmentEntry;
  setTreatmentStatus: (id: string, status: TreatmentEntry["status"]) => void;

  orderRadiology: (
    input: Omit<RadiologyOrder, "id" | "orderedAt" | "status"> & {
      status?: RadiologyOrderStatus;
    },
  ) => RadiologyOrder;
  setRadiologyStatus: (id: string, status: RadiologyOrderStatus) => void;
  submitRadiologyReport: (id: string, reportText: string, reportedBy: string) => void;
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function appendRadiologyBill(
  state: EncountersState,
  order: RadiologyOrder,
): BillingLineItem[] {
  const item: BillingLineItem = {
    id: makeId("BL"),
    visitId: order.visitId,
    patientId: order.patientId,
    kind: "radiology" as BillingItemKind,
    description: `${order.modality} - ${order.studyName}`,
    quantity: 1,
    unitPrice: order.fee,
    amount: order.fee,
    sponsor: "SELF PAY",
    serviced: false,
    status: "pending" as BillingItemStatus,
    sourceRef: order.id,
    createdBy: order.orderedBy,
    createdAt: nowIso(),
  };
  return [item, ...state.billing];
}

export const useEncountersStore = create<EncountersState>()(
  persist(
    (set, get) => ({
      treatments: [],
      radiologyOrders: [],
      billing: [],

      addTreatment: (input) => {
        const entry: TreatmentEntry = {
          id: makeId("TX"),
          prescribedAt: nowIso(),
          status: input.status ?? "ordered",
          ...input,
        };
        set((state) => ({ treatments: [entry, ...state.treatments] }));
        return entry;
      },

      setTreatmentStatus: (id, status) => {
        set((state) => ({
          treatments: state.treatments.map((t) =>
            t.id === id ? { ...t, status } : t,
          ),
        }));
      },

      orderRadiology: (input) => {
        const order: RadiologyOrder = {
          id: makeId("RAD"),
          orderedAt: nowIso(),
          status: input.status ?? "ordered",
          ...input,
        };
        set((state) => ({
          radiologyOrders: [order, ...state.radiologyOrders],
          billing: appendRadiologyBill(state, order),
        }));
        return order;
      },

      setRadiologyStatus: (id, status) => {
        set((state) => ({
          radiologyOrders: state.radiologyOrders.map((o) =>
            o.id === id ? { ...o, status } : o,
          ),
        }));
      },

      submitRadiologyReport: (id, reportText, reportedBy) => {
        const at = nowIso();
        set((state) => ({
          radiologyOrders: state.radiologyOrders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  reportText,
                  reportedBy,
                  reportedAt: at,
                  status: "reported" as RadiologyOrderStatus,
                }
              : o,
          ),
        }));
        const order = get().radiologyOrders.find((o) => o.id === id);
        if (order) {
          set((state) => ({
            billing: state.billing.map((b) =>
              b.sourceRef === order.id ? { ...b, serviced: true, servicedAt: at } : b,
            ),
          }));
        }
      },
    }),
    {
      name: "hmis-encounters",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persisted, _version) => {
        // v2 → v3: legacy state is incompatible — drop it. Data was
        // either client-only mock state or has migrated to the backend.
        if (!persisted) return persisted;
        const { treatments, radiologyOrders, billing } =
          persisted as Partial<EncountersState> & Record<string, unknown>;
        return {
          treatments: Array.isArray(treatments) ? treatments : [],
          radiologyOrders: Array.isArray(radiologyOrders) ? radiologyOrders : [],
          billing: Array.isArray(billing) ? billing : [],
        } as EncountersState;
      },
    },
  ),
);
