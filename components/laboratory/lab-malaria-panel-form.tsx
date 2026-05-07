"use client";

/** Structured malaria / RDT worksheet — persisted as JSON on the lab order. */
export function emptyMalariaPanel(): Record<string, unknown> {
  return {
    mpTotalTests: 0,
    mpFalciparumPositive: false,
    mpMalariaPositive: false,
    mpOvalePositive: false,
    mpVivaxPositive: false,
    mpKnowlesiPositive: false,
    mpTrophozoitePositive: false,
    mpSchizontsPositive: false,
    mpGametocytePositive: false,
    mpCountLt200k: false,
    mpCount200k499k: false,
    mpCountGte500k: false,
    mrdtTotalTests: 0,
    pfHrp2PositiveRdt: false,
    pfPldhPositiveRdt: false,
    panPldhPositiveRdt: false,
    allOthers: "",
  };
}

export function malariaPanelHasSignal(p: Record<string, unknown>): boolean {
  for (const [key, v] of Object.entries(p)) {
    if (key === "allOthers" && typeof v === "string" && v.trim()) return true;
    if (typeof v === "boolean" && v) return true;
    if (typeof v === "number" && v > 0) return true;
  }
  return false;
}

export function parseMalariaPanelJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return emptyMalariaPanel();
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return { ...emptyMalariaPanel(), ...o };
  } catch {
    return emptyMalariaPanel();
  }
}

/** Human-readable lines for folder / read-only views */
export function summariseMalariaPanelForDisplay(value: Record<string, unknown>): Array<{ label: string; text: string }> {
  const out: Array<{ label: string; text: string }> = [];
  const pushNum = (key: string, label: string) => {
    const n = typeof value[key] === "number" ? (value[key] as number) : Number(value[key]);
    if (Number.isFinite(n) && n > 0) out.push({ label, text: String(n) });
  };
  const pushBool = (key: string, label: string) => {
    if (value[key] === true) out.push({ label, text: "Positive / Yes" });
  };
  pushNum("mpTotalTests", "MP — total tests");
  pushNum("mrdtTotalTests", "mRDT — total tests");
  pushBool("mpFalciparumPositive", "MP falciparum");
  pushBool("mpMalariaPositive", "MP malaria");
  pushBool("mpOvalePositive", "MP ovale");
  pushBool("mpVivaxPositive", "MP vivax");
  pushBool("mpKnowlesiPositive", "MP knowlesi");
  pushBool("mpTrophozoitePositive", "MP trophozoite");
  pushBool("mpSchizontsPositive", "MP schizonts");
  pushBool("mpGametocytePositive", "MP gametocyte");
  pushBool("mpCountLt200k", "MP count <200k/µl");
  pushBool("mpCount200k499k", "MP count 200k–499k/µl");
  pushBool("mpCountGte500k", "MP count ≥500k/µl");
  pushBool("pfHrp2PositiveRdt", "Pf HRP2 RDT");
  pushBool("pfPldhPositiveRdt", "Pf-pLDH RDT");
  pushBool("panPldhPositiveRdt", "Pan-pLDH RDT");
  const other = typeof value.allOthers === "string" ? value.allOthers.trim() : "";
  if (other) out.push({ label: "Other findings", text: other });
  return out;
}

/** Read-only malaria worksheet block for encounter folder / reports */
export function LabMalariaPanelReadonly({ value }: { value: Record<string, unknown> }) {
  const lines = summariseMalariaPanelForDisplay(value);
  if (lines.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-muted/15 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Malaria / RDT worksheet
      </p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {lines.map((row) => (
          <div key={row.label} className="space-y-0.5">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{row.label}</dt>
            <dd className="text-sm text-foreground">{row.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface LabMalariaPanelFormProps {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export function LabMalariaPanelForm({ value, onChange }: LabMalariaPanelFormProps) {
  const patch = (partial: Record<string, unknown>) => onChange({ ...value, ...partial });

  function numField(key: string, label: string) {
    const n = typeof value[key] === "number" ? (value[key] as number) : Number(value[key]) || 0;
    return (
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <input
          type="number"
          min={0}
          className="h-9 rounded-md border border-input bg-background px-2 font-clinical text-sm"
          value={Number.isFinite(n) ? n : 0}
          onChange={(e) => patch({ [key]: Math.max(0, Number(e.target.value) || 0) })}
        />
      </label>
    );
  }

  function boolField(key: string, label: string) {
    const checked = Boolean(value[key]);
    return (
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input type="checkbox" checked={checked} onChange={(e) => patch({ [key]: e.target.checked })} />
        <span>{label}</span>
      </label>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-border bg-muted/15 p-4">
      <p className="text-sm font-semibold text-foreground">Results of test — malaria investigation</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {numField("mpTotalTests", "Malaria parasite — total tests")}
        {numField("mrdtTotalTests", "mRDT — total tests")}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {boolField("mpFalciparumPositive", "MP falciparum positive")}
        {boolField("mpMalariaPositive", "MP malaria positive")}
        {boolField("mpOvalePositive", "MP ovale positive")}
        {boolField("mpVivaxPositive", "MP vivax positive")}
        {boolField("mpKnowlesiPositive", "MP knowlesi positive")}
        {boolField("mpTrophozoitePositive", "MP trophozoite positive")}
        {boolField("mpSchizontsPositive", "MP schizonts positive")}
        {boolField("mpGametocytePositive", "MP gametocyte positive")}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {boolField("mpCountLt200k", "MP count <200,000 /µl")}
        {boolField("mpCount200k499k", "MP count (200,000–499,000) /µl")}
        {boolField("mpCountGte500k", "MP count ≥500,000 /µl")}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {boolField("pfHrp2PositiveRdt", "Pf HRP2 positive RDT")}
        {boolField("pfPldhPositiveRdt", "Pf-pLDH positive RDT")}
        {boolField("panPldhPositiveRdt", "Pan-pLDH positive RDT")}
      </div>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">All others</span>
        <textarea
          rows={2}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={typeof value.allOthers === "string" ? value.allOthers : ""}
          onChange={(e) => patch({ allOthers: e.target.value })}
        />
      </label>
    </div>
  );
}
