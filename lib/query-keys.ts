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
      search: (query: string) => ["patients", "search", query] as const,
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
  
    // ── IPD
    ipd: {
      wards: ["ipd", "wards"] as const,
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
  
    // ── Billing / NHIS
    billing: {
      claims: ["billing", "claims"] as const,
      claim: (id: string) => ["billing", "claim", id] as const,
      invoices: ["billing", "invoices"] as const,
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