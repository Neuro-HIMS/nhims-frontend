/**
 * Centralised query key factory.
 *
 * Why: scattered magic strings cause cache invalidation bugs.
 * All query keys are defined here and imported everywhere else.
 * The hierarchical structure lets us invalidate at any level:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.patients.all })
 *   → invalidates all patient queries
 *
 *   queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(id) })
 *   → invalidates only that patient's detail
 */
export const queryKeys = {
    // ── Auth
    auth: {
      currentUser: ["auth", "currentUser"] as const,
    },
  
    // ── Patients
    patients: {
      all: ["patients"] as const,
      nextReference: ["patients", "nextReference"] as const,
      /** Stable key for TanStack Query — pass the same shape as {@link import("@/types/patients.types").PatientSearchParams}. */
      search: (params: { mode: string; q?: string; firstName?: string; lastName?: string }) =>
        ["patients", "search", params.mode, params.q ?? "", params.firstName ?? "", params.lastName ?? ""] as const,
      detail: (id: string) => ["patients", id] as const,
      allergies: (id: string) => ["patients", id, "allergies"] as const,
      visits: (id: string) => ["patients", id, "visits"] as const,
    },
  
    // ── OPD
    opd: {
      queue: ["opd", "queue"] as const,
      consultation: (visitId: string) => ["opd", "consultation", visitId] as const,
      vitals: (visitId: string) => ["opd", "vitals", visitId] as const,
    },

    // ── Clinical encounters (the workflow hub: nurse, OPD, lab, pharmacy)
    clinical: {
      all: ["clinical"] as const,
      today: ["clinical", "encounters", "today"] as const,
      encounters: ["clinical", "encounters"] as const,
      encounter: (id: string) => ["clinical", "encounters", id] as const,
      byPatient: (patientId: string) => ["clinical", "encounters", "by-patient", patientId] as const,
      vitals: (encounterId: string) => ["clinical", "encounters", encounterId, "vitals"] as const,
      patientVitals: (patientId: string) => ["clinical", "patients", patientId, "vitals"] as const,
      consultations: (encounterId: string) =>
        ["clinical", "encounters", encounterId, "consultations"] as const,
      labOrders: (encounterId: string) => ["clinical", "encounters", encounterId, "lab-orders"] as const,
      radiologyOrders: (encounterId: string) =>
        ["clinical", "encounters", encounterId, "radiology-orders"] as const,
      radiologyWorklist: ["clinical", "radiology", "worklist"] as const,
      labCatalogSetup: ["clinical", "catalog", "lab-setup"] as const,
      labWorklist: ["clinical", "lab", "worklist"] as const,
      labOrder: (id: string) => ["clinical", "lab-orders", id] as const,
      prescriptions: (encounterId: string) =>
        ["clinical", "encounters", encounterId, "prescriptions"] as const,
      pharmacyQueue: ["clinical", "pharmacy", "queue"] as const,
      prescription: (id: string) => ["clinical", "prescriptions", id] as const,
      admissions: (encounterId: string) => ["clinical", "encounters", encounterId, "admissions"] as const,
      referrals: (encounterId: string) => ["clinical", "encounters", encounterId, "referrals"] as const,
      alerts: (patientId: string) => ["clinical", "patients", patientId, "alerts"] as const,
      conditions: (q: string, activeOnly: boolean) =>
        ["clinical", "conditions", q, activeOnly] as const,
      /** Paginated classifications (same `/clinical/conditions` catalogue). */
      conditionsPage: (
        q: string,
        page: number,
        activeOnly: boolean,
        size: number = 20,
      ) => ["clinical", "conditions-page", q, page, activeOnly, size] as const,
      folder: (encounterId: string) => ["clinical", "encounters", encounterId, "folder"] as const,
    },
  
    // ── IPD
    ipd: {
      wards: ["ipd", "board"] as const,
      ward: (wardId: string) => ["ipd", "ward", wardId] as const,
      admission: (admissionId: string) => ["ipd", "admission", admissionId] as const,
      mar: (admissionId: string) => ["ipd", "mar", admissionId] as const,
    },
  
    // ── ANC
    anc: {
      all: ["anc"] as const,
      record: (patientId: string) => ["anc", patientId] as const,
      visits: (patientId: string) => ["anc", patientId, "visits"] as const,
    },
  
    // ── Laboratory
    lab: {
      worklist: ["lab", "worklist"] as const,
      request: (requestId: string) => ["lab", "request", requestId] as const,
      results: (requestId: string) => ["lab", "results", requestId] as const,
    },
  
    // ── Pharmacy
    pharmacy: {
      queue: ["pharmacy", "queue"] as const,
      prescription: (id: string) => ["pharmacy", "prescription", id] as const,
      inventory: ["pharmacy", "inventory"] as const,
      drug: (id: string) => ["pharmacy", "drug", id] as const,
    },

    pharmacyInventory: {
      all: ["pharmacy-inventory"] as const,
      suppliers: (q: string, country: string, active: string) =>
        ["pharmacy-inventory", "suppliers", q, country, active] as const,
      items: (active: string) => ["pharmacy-inventory", "items", active] as const,
      overview: (activeOnly: string) => ["pharmacy-inventory", "overview", activeOnly] as const,
      lots: (itemId: string) => ["pharmacy-inventory", "lots", itemId] as const,
      movements: (itemId: string) => ["pharmacy-inventory", "movements", itemId] as const,
    },
  
    // ── Billing / NHIS
    billing: {
      claims: ["billing", "claims"] as const,
      claim: (id: string) => ["billing", "claim", id] as const,
      invoices: ["billing", "invoices"] as const,
    },
  
    // ── Reports hub (definitions from backend catalogue)
    reporting: {
      definitions: ["reports", "definitions"] as const,
      dhims2: (month: string) => ["reports", "run", "dhims2", month] as const,
      monthly: (month: string) => ["reports", "run", "monthly", month] as const,
      exports: ["reports", "run", "exports"] as const,
    },

    // ── DHIMS2
    dhims2: {
      report: (period: string) => ["dhims2", "report", period] as const,
      submissions: ["dhims2", "submissions"] as const,
    },
  
    // ── Admin
    admin: {
      users: ["admin", "users"] as const,
      user: (id: string) => ["admin", "user", id] as const,
      auditLog: ["admin", "auditLog"] as const,
    },
  } as const;