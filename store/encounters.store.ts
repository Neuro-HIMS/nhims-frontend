"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Admission,
  BillingItemKind,
  BillingItemStatus,
  BillingLineItem,
  ConsultationNote,
  LabOrder,
  LabOrderStatus,
  LabResultRow,
  MedicalAlert,
  Prescription,
  PrescriptionLine,
  PrescriptionStatus,
  RadiologyOrder,
  RadiologyOrderStatus,
  Referral,
  TreatmentEntry,
  Visit,
  VisitStatus,
  VitalsRecord,
} from "@/lib/clinical-types";

// In-browser shared state for the clinical workflow until the Spring Boot backend lands.
// Records publishes visits here; downstream modules (Nurse, Consultation, Wards) read
// and append clinical data without losing context across page navigations.

interface EncountersState {
  visits: Visit[];
  vitals: VitalsRecord[];
  consultations: ConsultationNote[];
  treatments: TreatmentEntry[];
  admissions: Admission[];
  referrals: Referral[];
  alerts: MedicalAlert[];
  labOrders: LabOrder[];
  prescriptions: Prescription[];
  radiologyOrders: RadiologyOrder[];
  billing: BillingLineItem[];

  bookVisit: (visit: Omit<Visit, "id" | "visitNo" | "createdAt"> & { visitNo?: string }) => Visit;
  updateVisitStatus: (visitId: string, status: VisitStatus) => void;
  setVisitPriority: (visitId: string, priority: Visit["priority"]) => void;

  addVitals: (vitals: Omit<VitalsRecord, "id" | "recordedAt">) => VitalsRecord;
  addConsultation: (note: Omit<ConsultationNote, "id" | "authoredAt">) => ConsultationNote;
  addTreatment: (entry: Omit<TreatmentEntry, "id" | "prescribedAt" | "status"> & { status?: TreatmentEntry["status"] }) => TreatmentEntry;
  setTreatmentStatus: (id: string, status: TreatmentEntry["status"]) => void;
  admitPatient: (entry: Omit<Admission, "id" | "admittedAt">) => Admission;
  dischargePatient: (admissionId: string, summary: string) => void;
  addReferral: (entry: Omit<Referral, "id" | "referredAt" | "status"> & { status?: Referral["status"] }) => Referral;
  addAlert: (entry: Omit<MedicalAlert, "id" | "recordedAt">) => MedicalAlert;
  removeAlert: (id: string) => void;

  // Orders + results
  orderLab: (input: Omit<LabOrder, "id" | "orderedAt" | "status"> & { status?: LabOrderStatus }) => LabOrder;
  setLabOrderStatus: (id: string, status: LabOrderStatus) => void;
  submitLabResult: (id: string, results: LabResultRow[], summary: string, enteredBy: string) => void;

  prescribe: (input: Omit<Prescription, "id" | "prescribedAt" | "status" | "lines"> & {
    status?: PrescriptionStatus;
    lines: Omit<PrescriptionLine, "id">[];
  }) => Prescription;
  setPrescriptionStatus: (id: string, status: PrescriptionStatus) => void;
  dispensePrescription: (id: string, dispensedBy: string, lineDispensed: Record<string, number>, pharmacyNotes?: string) => void;

  orderRadiology: (input: Omit<RadiologyOrder, "id" | "orderedAt" | "status"> & { status?: RadiologyOrderStatus }) => RadiologyOrder;
  setRadiologyStatus: (id: string, status: RadiologyOrderStatus) => void;
  submitRadiologyReport: (id: string, reportText: string, reportedBy: string) => void;

  // Billing
  addBillingItem: (item: Omit<BillingLineItem, "id" | "createdAt" | "amount">) => BillingLineItem;
  setBillingItemStatus: (id: string, status: BillingItemStatus, payment?: { method: string; receiptNo: string }) => void;
  markBillingItemServiced: (id: string) => void;
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function makeVisitNo(date: string) {
  // V<YY><MM><DD><nnn> — sequential within day not strictly required for mock.
  const [y, m, d] = date.split("-");
  const seq = Math.floor(Math.random() * 900 + 100);
  return `V${y.slice(2)}${m}${d}${seq}`;
}

function nowIso() {
  return new Date().toISOString();
}

// ── Seed data ────────────────────────────────────────────────────────────
// A few sample visits so the nurse station is not empty before a fresh booking.
// Declared before the store factory so the persist initializer can read them
// during module evaluation (avoids TDZ at store construction time).

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const SEED_TODAY = todayDate();

const SEED_VISITS: Visit[] = [
  {
    id: "V-seed-001",
    visitNo: "V" + SEED_TODAY.replace(/-/g, "").slice(2) + "001",
    patientId: "GH-2026-04821",
    patientName: "Kofi Acheampong",
    patientSex: "M",
    patientDob: "1985-03-12",
    patientPhone: "0244123456",
    visitType: "opd",
    serviceId: "general-opd-initial",
    serviceName: "General OPD - Initial Consultation",
    department: "General OPD",
    clinicianId: "CL-001",
    clinicianName: "Dr. Kwame Asante",
    fee: 70,
    sponsor: "NHIS",
    scheme: "NATIONAL HEALTH INSURANCE",
    appointmentDate: SEED_TODAY,
    appointmentTime: "08:12",
    reason: "Chest pain, shortness of breath",
    priority: "emergency",
    status: "awaiting-triage",
    source: "records",
    createdAt: new Date().toISOString(),
  },
  {
    id: "V-seed-002",
    visitNo: "V" + SEED_TODAY.replace(/-/g, "").slice(2) + "002",
    patientId: "GH-2026-03109",
    patientName: "Abena Osei",
    patientSex: "F",
    patientDob: "1992-07-22",
    patientPhone: "0201987654",
    visitType: "anc",
    serviceId: "maternity-anc-review",
    serviceName: "ANC Review",
    department: "Maternity",
    clinicianId: "CL-003",
    clinicianName: "Midwife Adwoa Mensah",
    fee: 55,
    sponsor: "NHIS",
    scheme: "NATIONAL HEALTH INSURANCE",
    appointmentDate: SEED_TODAY,
    appointmentTime: "08:25",
    reason: "Routine ANC visit at 28 weeks",
    priority: "routine",
    status: "awaiting-triage",
    source: "records",
    createdAt: new Date().toISOString(),
  },
  {
    id: "V-seed-003",
    visitNo: "V" + SEED_TODAY.replace(/-/g, "").slice(2) + "003",
    patientId: "GH-2026-05512",
    patientName: "Esi Yeboah",
    patientSex: "F",
    patientDob: "2001-05-08",
    patientPhone: "0554332211",
    visitType: "opd",
    serviceId: "general-opd-initial",
    serviceName: "General OPD - Initial Consultation",
    department: "General OPD",
    clinicianId: "CL-001",
    clinicianName: "Dr. Kwame Asante",
    fee: 70,
    sponsor: "SELF PAY / UNINSURED - GH",
    scheme: "SELF PAY",
    appointmentDate: SEED_TODAY,
    appointmentTime: "09:00",
    reason: "Cough and cold for 4 days",
    priority: "pending",
    status: "checked-in",
    source: "records",
    createdAt: new Date().toISOString(),
  },
];

const SEED_ALERTS: MedicalAlert[] = [
  {
    id: "AL-seed-001",
    patientId: "GH-2026-04821",
    category: "allergy",
    label: "Penicillin allergy",
    notes: "Anaphylactic reaction reported in 2018.",
    recordedBy: "Dr. Kwame Asante",
    recordedAt: new Date().toISOString(),
  },
  {
    id: "AL-seed-002",
    patientId: "GH-2026-04821",
    category: "chronic",
    label: "Type 2 Diabetes",
    notes: "On metformin 500mg BD.",
    recordedBy: "Dr. Kwame Asante",
    recordedAt: new Date().toISOString(),
  },
];

const SEED_BILLING: BillingLineItem[] = SEED_VISITS.map((v) => ({
  id: `BL-${v.id}-CONS`,
  visitId: v.id,
  patientId: v.patientId,
  kind: "consultation" as BillingItemKind,
  description: v.serviceName,
  quantity: 1,
  unitPrice: v.fee,
  amount: v.fee,
  sponsor: v.sponsor,
  serviced: false,
  status: v.sponsor === "NHIS" ? ("claimed" as BillingItemStatus) : ("pending" as BillingItemStatus),
  createdBy: "Records Officer",
  createdAt: v.createdAt,
}));

const SEED_LAB_ORDERS: LabOrder[] = [
  {
    id: "LO-seed-001",
    visitId: SEED_VISITS[0].id,
    patientId: SEED_VISITS[0].patientId,
    patientName: SEED_VISITS[0].patientName,
    patientSex: SEED_VISITS[0].patientSex,
    patientDob: SEED_VISITS[0].patientDob,
    testCode: "FBC",
    testName: "Full Blood Count",
    category: "Haematology",
    clinicalNotes: "Rule out anaemia. Patient with chest pain and SOB.",
    urgency: "urgent",
    orderedBy: "Dr. Kwame Asante",
    orderedAt: new Date().toISOString(),
    status: "ordered",
    fee: 60,
  },
];

export const useEncountersStore = create<EncountersState>()(
  persist(
    (set, get) => ({
      visits: SEED_VISITS,
      vitals: [],
      consultations: [],
      treatments: [],
      admissions: [],
      referrals: [],
      alerts: SEED_ALERTS,
      labOrders: SEED_LAB_ORDERS,
      prescriptions: [],
      radiologyOrders: [],
      billing: [
        ...SEED_BILLING,
        {
          id: "BL-LO-seed-001",
          visitId: SEED_LAB_ORDERS[0].visitId,
          patientId: SEED_LAB_ORDERS[0].patientId,
          kind: "lab" as BillingItemKind,
          description: SEED_LAB_ORDERS[0].testName,
          quantity: 1,
          unitPrice: SEED_LAB_ORDERS[0].fee,
          amount: SEED_LAB_ORDERS[0].fee,
          sponsor: SEED_VISITS[0].sponsor,
          serviced: false,
          status: SEED_VISITS[0].sponsor === "NHIS" ? ("claimed" as BillingItemStatus) : ("pending" as BillingItemStatus),
          createdBy: "Dr. Kwame Asante",
          createdAt: new Date().toISOString(),
          sourceRef: "LO-seed-001",
        },
      ],

      bookVisit: (input) => {
        const visit: Visit = {
          id: makeId("V"),
          visitNo: input.visitNo ?? makeVisitNo(input.appointmentDate),
          createdAt: nowIso(),
          ...input,
        };
        set((state) => ({ visits: [visit, ...state.visits] }));
        return visit;
      },

      updateVisitStatus: (visitId, status) => {
        set((state) => ({
          visits: state.visits.map((v) => (v.id === visitId ? { ...v, status } : v)),
        }));
      },

      setVisitPriority: (visitId, priority) => {
        set((state) => ({
          visits: state.visits.map((v) => (v.id === visitId ? { ...v, priority } : v)),
        }));
      },

      addVitals: (input) => {
        const record: VitalsRecord = { id: makeId("VT"), recordedAt: nowIso(), ...input };
        set((state) => ({ vitals: [record, ...state.vitals] }));
        // Routine flow: after vitals, patient is awaiting consultation.
        const visit = get().visits.find((v) => v.id === input.visitId);
        if (visit && (visit.status === "in-vitals" || visit.status === "awaiting-vitals" || visit.status === "in-triage")) {
          get().updateVisitStatus(visit.id, "awaiting-consultation");
        }
        return record;
      },

      addConsultation: (input) => {
        const note: ConsultationNote = { id: makeId("CN"), authoredAt: nowIso(), ...input };
        set((state) => ({ consultations: [note, ...state.consultations] }));
        return note;
      },

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
          treatments: state.treatments.map((t) => (t.id === id ? { ...t, status } : t)),
        }));
      },

      admitPatient: (input) => {
        const entry: Admission = { id: makeId("AD"), admittedAt: nowIso(), ...input };
        set((state) => ({ admissions: [entry, ...state.admissions] }));
        get().updateVisitStatus(input.visitId, "admitted");
        return entry;
      },

      dischargePatient: (admissionId, summary) => {
        const dischargedAt = nowIso();
        set((state) => ({
          admissions: state.admissions.map((a) =>
            a.id === admissionId ? { ...a, dischargedAt, dischargeSummary: summary } : a
          ),
        }));
        const admission = get().admissions.find((a) => a.id === admissionId);
        if (admission) get().updateVisitStatus(admission.visitId, "discharged");
      },

      addReferral: (input) => {
        const entry: Referral = {
          id: makeId("RF"),
          referredAt: nowIso(),
          status: input.status ?? "pending",
          ...input,
        };
        set((state) => ({ referrals: [entry, ...state.referrals] }));
        return entry;
      },

      addAlert: (input) => {
        const entry: MedicalAlert = { id: makeId("AL"), recordedAt: nowIso(), ...input };
        set((state) => ({ alerts: [entry, ...state.alerts] }));
        return entry;
      },

      removeAlert: (id) => {
        set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
      },

      // ── Orders ───────────────────────────────────────────────
      orderLab: (input) => {
        const order: LabOrder = {
          id: makeId("LO"),
          orderedAt: nowIso(),
          status: input.status ?? "ordered",
          ...input,
        };
        set((state) => ({ labOrders: [order, ...state.labOrders] }));
        const visit = get().visits.find((v) => v.id === input.visitId);
        // Auto-add billing line for the lab service.
        get().addBillingItem({
          visitId: input.visitId,
          patientId: input.patientId,
          kind: "lab",
          description: input.testName,
          quantity: 1,
          unitPrice: input.fee,
          sponsor: visit?.sponsor ?? "SELF PAY",
          serviced: false,
          status: visit?.sponsor === "NHIS" ? "claimed" : "pending",
          sourceRef: order.id,
          createdBy: input.orderedBy,
        });
        return order;
      },

      setLabOrderStatus: (id, status) => {
        set((state) => ({
          labOrders: state.labOrders.map((o) => (o.id === id ? { ...o, status } : o)),
        }));
      },

      submitLabResult: (id, results, summary, enteredBy) => {
        const at = nowIso();
        set((state) => ({
          labOrders: state.labOrders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  results,
                  resultSummary: summary,
                  resultEnteredBy: enteredBy,
                  resultEnteredAt: at,
                  status: "completed" as LabOrderStatus,
                }
              : o
          ),
        }));
        const order = get().labOrders.find((o) => o.id === id);
        if (order) {
          // Mark associated billing line as serviced.
          set((state) => ({
            billing: state.billing.map((b) =>
              b.sourceRef === order.id ? { ...b, serviced: true, servicedAt: at } : b
            ),
          }));
        }
      },

      prescribe: (input) => {
        const lines: PrescriptionLine[] = input.lines.map((l) => ({ id: makeId("RXL"), ...l }));
        const rx: Prescription = {
          id: makeId("RX"),
          prescribedAt: nowIso(),
          status: input.status ?? "ordered",
          ...input,
          lines,
        };
        set((state) => ({ prescriptions: [rx, ...state.prescriptions] }));
        const visit = get().visits.find((v) => v.id === input.visitId);
        // One billing line per prescription line.
        lines.forEach((line) => {
          get().addBillingItem({
            visitId: input.visitId,
            patientId: input.patientId,
            kind: "pharmacy",
            description: `${line.drug} ${line.strength} - ${line.frequency} x ${line.durationDays}d`,
            quantity: line.quantity,
            unitPrice: line.fee,
            sponsor: visit?.sponsor ?? "SELF PAY",
            serviced: false,
            status: visit?.sponsor === "NHIS" ? "claimed" : "pending",
            sourceRef: line.id,
            createdBy: input.prescribedBy,
          });
        });
        return rx;
      },

      setPrescriptionStatus: (id, status) => {
        set((state) => ({
          prescriptions: state.prescriptions.map((rx) => (rx.id === id ? { ...rx, status } : rx)),
        }));
      },

      dispensePrescription: (id, dispensedBy, lineDispensed, pharmacyNotes) => {
        const at = nowIso();
        const rx = get().prescriptions.find((p) => p.id === id);
        if (!rx) return;
        const updatedLines = rx.lines.map((line) => {
          const qty = lineDispensed[line.id];
          if (qty == null) return line;
          return { ...line, dispensedQty: qty, dispensedAt: at, dispensedBy };
        });
        const allDispensed = updatedLines.every((l) => (l.dispensedQty ?? 0) >= l.quantity);
        const anyDispensed = updatedLines.some((l) => (l.dispensedQty ?? 0) > 0);
        const nextStatus: PrescriptionStatus = allDispensed
          ? "dispensed"
          : anyDispensed
          ? "partially-dispensed"
          : rx.status;
        set((state) => ({
          prescriptions: state.prescriptions.map((p) =>
            p.id === id ? { ...p, lines: updatedLines, status: nextStatus, pharmacyNotes: pharmacyNotes ?? p.pharmacyNotes } : p
          ),
          billing: state.billing.map((b) => {
            const matchedLine = updatedLines.find((l) => l.id === b.sourceRef);
            if (!matchedLine) return b;
            const fullyDispensed = (matchedLine.dispensedQty ?? 0) >= matchedLine.quantity;
            return fullyDispensed && !b.serviced ? { ...b, serviced: true, servicedAt: at } : b;
          }),
        }));
      },

      orderRadiology: (input) => {
        const order: RadiologyOrder = {
          id: makeId("RAD"),
          orderedAt: nowIso(),
          status: input.status ?? "ordered",
          ...input,
        };
        set((state) => ({ radiologyOrders: [order, ...state.radiologyOrders] }));
        const visit = get().visits.find((v) => v.id === input.visitId);
        get().addBillingItem({
          visitId: input.visitId,
          patientId: input.patientId,
          kind: "radiology",
          description: `${input.modality} - ${input.studyName}`,
          quantity: 1,
          unitPrice: input.fee,
          sponsor: visit?.sponsor ?? "SELF PAY",
          serviced: false,
          status: visit?.sponsor === "NHIS" ? "claimed" : "pending",
          sourceRef: order.id,
          createdBy: input.orderedBy,
        });
        return order;
      },

      setRadiologyStatus: (id, status) => {
        set((state) => ({
          radiologyOrders: state.radiologyOrders.map((o) => (o.id === id ? { ...o, status } : o)),
        }));
      },

      submitRadiologyReport: (id, reportText, reportedBy) => {
        const at = nowIso();
        set((state) => ({
          radiologyOrders: state.radiologyOrders.map((o) =>
            o.id === id
              ? { ...o, reportText, reportedBy, reportedAt: at, status: "reported" as RadiologyOrderStatus }
              : o
          ),
        }));
        const order = get().radiologyOrders.find((o) => o.id === id);
        if (order) {
          set((state) => ({
            billing: state.billing.map((b) =>
              b.sourceRef === order.id ? { ...b, serviced: true, servicedAt: at } : b
            ),
          }));
        }
      },

      // ── Billing ─────────────────────────────────────────────
      addBillingItem: (input) => {
        const item: BillingLineItem = {
          id: makeId("BL"),
          createdAt: nowIso(),
          amount: (input.unitPrice ?? 0) * (input.quantity ?? 1),
          ...input,
        };
        set((state) => ({ billing: [item, ...state.billing] }));
        return item;
      },

      setBillingItemStatus: (id, status, payment) => {
        const at = nowIso();
        set((state) => ({
          billing: state.billing.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status,
                  paidAt: status === "paid" ? at : b.paidAt,
                  paymentMethod: payment?.method ?? b.paymentMethod,
                  receiptNo: payment?.receiptNo ?? b.receiptNo,
                }
              : b
          ),
        }));
      },

      markBillingItemServiced: (id) => {
        const at = nowIso();
        set((state) => ({
          billing: state.billing.map((b) =>
            b.id === id ? { ...b, serviced: true, servicedAt: at } : b
          ),
        }));
      },
    }),
    {
      name: "hmis-encounters",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    }
  )
);
