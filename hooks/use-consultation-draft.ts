"use client";

import { useCallback, useEffect, useState } from "react";

/** DHIMS2 wording: a *new case* is the first visit for this illness; an *old case* is a return visit for the same illness. */
export type CaseKind = "new" | "old";

export interface PickedCondition {
  conditionId: string;
  name: string;
  code: string;
}

export interface AdditionalDiagnosis {
  /** Stable row key for React. */
  key: string;
  /** From the facility's diagnosis list… */
  condition: PickedCondition | null;
  /** …or typed, when it isn't on the list. */
  freeText: string;
  caseKind: CaseKind | null;
}

export interface ConsultationDraft {
  history: string;
  examination: string;
  assessment: string;
  plan: string;
  /** Working diagnosis before tests confirm it (required by the record). */
  provisional: PickedCondition | null;
  provisionalText: string;
  /** Main diagnosis reported for the visit (DHIMS2). */
  principal: PickedCondition | null;
  principalCase: CaseKind | null;
  additional: AdditionalDiagnosis[];
  /** Condition ids the doctor asked to flag for disease surveillance. */
  surveillance: string[];
  /** Condition ids already flagged — never sent twice. */
  flagged: string[];
  /** Set when the draft is an edit of a note already saved to the record. */
  editingNoteId: string | null;
  /** ISO time of the last local change, null for a fresh draft. */
  updatedAt: string | null;
  /** Fingerprint of what was last written to the record — survives a reload so nothing is re-sent needlessly. */
  savedKey: string | null;
}

export const EMPTY_DRAFT: ConsultationDraft = {
  history: "",
  examination: "",
  assessment: "",
  plan: "",
  provisional: null,
  provisionalText: "",
  principal: null,
  principalCase: null,
  additional: [],
  surveillance: [],
  flagged: [],
  editingNoteId: null,
  updatedAt: null,
  savedKey: null,
};

/** Principal + additional, as the record allows (5 in total). */
export const MAX_ADDITIONAL_DIAGNOSES = 4;

export function newRowKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

const storageKey = (encounterId: string) => `nhims:consult-draft:${encounterId}`;

type LegacyDraft = Partial<ConsultationDraft> & {
  diagnoses?: Array<{ conditionId: string; name: string; code: string; main: boolean; caseKind: CaseKind; surveillance: boolean }>;
};

function readDraft(encounterId: string): ConsultationDraft {
  try {
    const raw = localStorage.getItem(storageKey(encounterId));
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as LegacyDraft;
    const draft: ConsultationDraft = { ...EMPTY_DRAFT, ...parsed };
    // Drafts saved before the provisional/principal/additional layout: main → principal (and provisional).
    if (parsed.diagnoses && !parsed.principal) {
      const main = parsed.diagnoses.find((d) => d.main);
      if (main) {
        const picked = { conditionId: main.conditionId, name: main.name, code: main.code };
        draft.principal = picked;
        draft.provisional = draft.provisional ?? picked;
        draft.principalCase = main.caseKind;
      }
      draft.additional = parsed.diagnoses
        .filter((d) => !d.main)
        .map((d) => ({ key: newRowKey(), condition: { conditionId: d.conditionId, name: d.name, code: d.code }, freeText: "", caseKind: d.caseKind }));
      draft.surveillance = parsed.diagnoses.filter((d) => d.surveillance).map((d) => d.conditionId);
      delete (draft as LegacyDraft).diagnoses;
    }
    return draft;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function draftHasContent(d: ConsultationDraft): boolean {
  return Boolean(
    d.history.trim() ||
      d.examination.trim() ||
      d.assessment.trim() ||
      d.plan.trim() ||
      d.provisional ||
      d.provisionalText.trim() ||
      d.principal ||
      d.additional.some((a) => a.condition || a.freeText.trim()),
  );
}

/** What is still needed before the note can go to the record (the backend requires all of these). */
export function missingForRecord(d: ConsultationDraft): string[] {
  const missing: string[] = [];
  if (!d.provisional) missing.push("a provisional diagnosis");
  if (!d.principal) missing.push("a principal diagnosis");
  if (d.principal && !d.principalCase) missing.push("whether the principal diagnosis is a new or old case");
  if (d.additional.some((a) => (a.condition || a.freeText.trim()) && !a.caseKind)) {
    missing.push("new or old case for each additional diagnosis");
  }
  return missing;
}

/**
 * The doctor's in-progress notes + diagnoses for one visit, kept in this browser
 * (localStorage) so closing the tab or losing the network never loses them. The
 * backend only accepts a note once the diagnoses are complete, so the record is
 * written by (auto)save; this draft is the safety net until then.
 *
 * Only mount this after the page has loaded on the client (it reads localStorage
 * in its initial state).
 */
export function useConsultationDraft(encounterId: string) {
  const [draft, setDraft] = useState<ConsultationDraft>(() => readDraft(encounterId));

  // Written straight away (not debounced) so a reload right after a save can never lose
  // the saved note's id and create a second note.
  useEffect(() => {
    try {
      if (draftHasContent(draft) || draft.editingNoteId) {
        localStorage.setItem(storageKey(encounterId), JSON.stringify(draft));
      } else {
        localStorage.removeItem(storageKey(encounterId));
      }
    } catch {
      /* storage full or blocked — the on-screen draft still works */
    }
  }, [draft, encounterId]);

  const update = useCallback((patch: Partial<ConsultationDraft> | ((d: ConsultationDraft) => Partial<ConsultationDraft>)) => {
    setDraft((prev) => {
      const p = typeof patch === "function" ? patch(prev) : patch;
      return { ...prev, ...p, updatedAt: new Date().toISOString() };
    });
  }, []);

  const replace = useCallback((next: ConsultationDraft) => setDraft(next), []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(encounterId));
    } catch {
      /* ignore */
    }
    setDraft(EMPTY_DRAFT);
  }, [encounterId]);

  return { draft, update, replace, clear };
}
