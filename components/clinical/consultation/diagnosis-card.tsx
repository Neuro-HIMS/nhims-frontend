"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus, X } from "lucide-react";

import { InlineNotice } from "@/components/common/inline-notice";
import { StatusPill } from "@/components/common/status-pill";
import { ConditionSearch } from "@/components/clinical/consultation/condition-search";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  MAX_ADDITIONAL_DIAGNOSES,
  missingForRecord,
  newRowKey,
  type AdditionalDiagnosis,
  type CaseKind,
  type ConsultationDraft,
  type PickedCondition,
} from "@/hooks/use-consultation-draft";
import { isNotifiableDisease } from "@/lib/notifiable-diseases";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { surveillanceService } from "@/services/surveillance.service";

interface DiagnosisCardProps {
  draft: ConsultationDraft;
  onChange: (patch: Partial<ConsultationDraft>) => void;
  disabled?: boolean;
  /** Inside a dialog: no card border or heading (the dialog section provides them). */
  bare?: boolean;
  /** Rendered at the bottom — the save button lives with the diagnoses because the record needs them. */
  footer?: React.ReactNode;
}

/**
 * DOC-04 — the diagnosis fields the record and DHIMS2 reporting need:
 * provisional (working) diagnosis, principal diagnosis with new/old case, and
 * additional diagnoses each with new/old case.
 */
export function DiagnosisCard({ draft, onChange, disabled, bare = false, footer }: DiagnosisCardProps) {
  // Is the facility's diagnosis list empty? Then nothing can be found or saved — say so plainly.
  const listSizeQuery = useQuery({
    queryKey: queryKeys.clinical.conditionsPage("", 0, true, 1),
    queryFn: () => clinicalService.conditionsPaged({ page: 0, size: 1, activeOnly: true }),
    staleTime: 5 * 60_000,
  });
  const listIsEmpty = listSizeQuery.data?.totalElements === 0;

  const missing = missingForRecord(draft);
  const pickedIds = [
    draft.principal?.conditionId,
    ...draft.additional.map((a) => a.condition?.conditionId),
  ].filter((x): x is string => Boolean(x));

  function setAdditional(key: string, patch: Partial<AdditionalDiagnosis>) {
    onChange({ additional: draft.additional.map((a) => (a.key === key ? { ...a, ...patch } : a)) });
  }

  function toggleSurveillance(conditionId: string, on: boolean) {
    const set = new Set(draft.surveillance);
    if (on) set.add(conditionId);
    else set.delete(conditionId);
    onChange({ surveillance: [...set] });
  }

  function pickCondition(next: PickedCondition | null, previous: PickedCondition | null): Partial<ConsultationDraft> {
    // Notifiable diseases are ticked for surveillance by default; the doctor can untick.
    const set = new Set(draft.surveillance);
    if (previous) set.delete(previous.conditionId);
    if (next && isNotifiableDisease(next.name)) set.add(next.conditionId);
    return { surveillance: [...set] };
  }

  return (
    <section className={bare ? "space-y-5" : "space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5"}>
      {!bare && (
        <div>
          <h2 className="text-base font-semibold text-foreground">Diagnosis</h2>
          <p className="text-xs text-muted-foreground">Recorded for this visit and used for the monthly DHIMS2 report.</p>
        </div>
      )}

      {listIsEmpty && (
        <InlineNotice tone="warning" title="The diagnosis list is empty.">
          Ask your facility administrator to add diagnoses in Facility settings → Diagnosis list. Your notes are kept on this
          computer until then.
        </InlineNotice>
      )}

      {/* Provisional */}
      <FieldGroup
        title="Provisional diagnosis"
        hint="Your working diagnosis before tests confirm it."
        htmlFor="dx-provisional"
      >
        <ConditionSearch
          id="dx-provisional"
          label="Provisional diagnosis"
          value={draft.provisional}
          disabled={disabled}
          onChange={(c) => onChange({ provisional: c })}
        />
        <div className="space-y-1.5">
          <label htmlFor="dx-provisional-text" className="text-xs text-muted-foreground">
            More detail (optional)
          </label>
          <Input
            id="dx-provisional-text"
            value={draft.provisionalText}
            disabled={disabled}
            onChange={(e) => onChange({ provisionalText: e.target.value })}
            placeholder="e.g. Suspected malaria, awaiting test"
          />
        </div>
      </FieldGroup>

      {/* Principal */}
      <FieldGroup
        title="Principal diagnosis"
        hint="The main diagnosis for this visit."
        htmlFor="dx-principal"
        action={
          !draft.principal && draft.provisional && !disabled ? (
            <button
              type="button"
              className="text-xs font-medium text-accent hover:underline"
              onClick={() => onChange({ principal: draft.provisional, ...pickCondition(draft.provisional, null) })}
            >
              Same as provisional
            </button>
          ) : null
        }
      >
        <ConditionSearch
          id="dx-principal"
          label="Principal diagnosis"
          value={draft.principal}
          disabled={disabled}
          excludeIds={draft.additional.map((a) => a.condition?.conditionId).filter((x): x is string => Boolean(x))}
          onChange={(c) => onChange({ principal: c, ...pickCondition(c, draft.principal) })}
        />
        {draft.principal && (
          <CaseChoice
            name="dx-principal-case"
            label={`Is ${draft.principal.name} a new or old case?`}
            value={draft.principalCase}
            disabled={disabled}
            onChange={(k) => onChange({ principalCase: k })}
          />
        )}
        {draft.principal && isNotifiableDisease(draft.principal.name) && (
          <SurveillanceRow
            name={draft.principal.name}
            checked={draft.surveillance.includes(draft.principal.conditionId)}
            flagged={draft.flagged.includes(draft.principal.conditionId)}
            disabled={disabled}
            onChange={(v) => toggleSurveillance(draft.principal!.conditionId, v)}
          />
        )}
      </FieldGroup>

      {/* Additional */}
      <FieldGroup title="Additional diagnoses (optional)" hint="Other conditions treated or found at this visit.">
        {draft.additional.length > 0 && (
          <ul className="space-y-3">
            {draft.additional.map((a, i) => (
              <li key={a.key} className="space-y-2 rounded-lg border border-border bg-surface-subtle p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <ConditionSearch
                      id={`dx-additional-${a.key}`}
                      label={`Additional diagnosis ${i + 1}`}
                      value={a.condition}
                      freeText={a.freeText}
                      disabled={disabled}
                      excludeIds={pickedIds.filter((id) => id !== a.condition?.conditionId)}
                      onChange={(c) => onChange({
                        additional: draft.additional.map((x) => (x.key === a.key ? { ...x, condition: c, freeText: "" } : x)),
                        ...pickCondition(c, a.condition),
                      })}
                      onFreeText={(text) => setAdditional(a.key, { freeText: text, condition: null })}
                    />
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => onChange({ additional: draft.additional.filter((x) => x.key !== a.key) })}
                      aria-label={`Remove additional diagnosis ${i + 1}`}
                      className="mt-1.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {(a.condition || a.freeText.trim()) && (
                  <CaseChoice
                    name={`dx-additional-case-${a.key}`}
                    label={`Is ${a.condition?.name ?? a.freeText} a new or old case?`}
                    value={a.caseKind}
                    disabled={disabled}
                    onChange={(k) => setAdditional(a.key, { caseKind: k })}
                  />
                )}
                {a.condition && isNotifiableDisease(a.condition.name) && (
                  <SurveillanceRow
                    name={a.condition.name}
                    checked={draft.surveillance.includes(a.condition.conditionId)}
                    flagged={draft.flagged.includes(a.condition.conditionId)}
                    disabled={disabled}
                    onChange={(v) => toggleSurveillance(a.condition!.conditionId, v)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {!disabled && draft.additional.length < MAX_ADDITIONAL_DIAGNOSES && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange({ additional: [...draft.additional, { key: newRowKey(), condition: null, freeText: "", caseKind: null }] })}
          >
            <Plus className="mr-1 h-4 w-4" /> Add a diagnosis
          </Button>
        )}
      </FieldGroup>

      {missing.length > 0 && !disabled && (
        <p className="text-xs text-muted-foreground">To save to the record, add {joinWords(missing)}.</p>
      )}

      {footer}
    </section>
  );
}

function joinWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function FieldGroup({
  title,
  hint,
  htmlFor,
  action,
  children,
}: {
  title: string;
  hint: string;
  htmlFor?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {htmlFor ? (
            <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
              {title}
            </label>
          ) : (
            <p className="text-sm font-medium text-foreground">{title}</p>
          )}
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function CaseChoice({
  name,
  label,
  value,
  disabled,
  onChange,
}: {
  name: string;
  label: string;
  value: CaseKind | null;
  disabled?: boolean;
  onChange: (k: CaseKind) => void;
}) {
  return (
    <RadioGroup
      name={name}
      aria-label={label}
      value={value ?? ""}
      disabled={disabled}
      onValueChange={(v) => onChange(v as CaseKind)}
      className="grid grid-cols-2 gap-2 sm:max-w-md"
    >
      <ChoiceOption className="py-2">
        <RadioGroupItem value="new" />
        <span>
          <span className="block text-sm font-medium">New case</span>
          <span className="block text-xs font-normal text-muted-foreground">First visit for this illness</span>
        </span>
      </ChoiceOption>
      <ChoiceOption className="py-2">
        <RadioGroupItem value="old" />
        <span>
          <span className="block text-sm font-medium">Old case</span>
          <span className="block text-xs font-normal text-muted-foreground">Returning for the same illness</span>
        </span>
      </ChoiceOption>
    </RadioGroup>
  );
}

function SurveillanceRow({
  name,
  checked,
  flagged,
  disabled,
  onChange,
}: {
  name: string;
  checked: boolean;
  flagged: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill tone="warning" icon={AlertTriangle}>
        Must be reported
      </StatusPill>
      {flagged ? (
        <span className="text-xs text-muted-foreground">{name} has been flagged for disease surveillance.</span>
      ) : !surveillanceService.available() ? (
        <span className="text-xs text-muted-foreground">Tell the disease surveillance officer about this case.</span>
      ) : (
        <label className="inline-flex items-center gap-2 text-xs text-foreground">
          <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
          Flag for disease surveillance
        </label>
      )}
    </div>
  );
}
