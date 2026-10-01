import type { ConfiguredBed, ConfiguredWard } from "@/types/ipd.types";

/**
 * Ward set-up saved in this browser (area `ipd-wards`) — backend-gaps.md#WRD-setup. Starts with three
 * example wards the administrator can change or switch off.
 */
const KEY = "nhims.sample.wards.v1";

function uid(): string {
  return `w-${Math.random().toString(36).slice(2, 10)}`;
}

function beds(prefix: string, n: number, kind: ConfiguredBed["kind"] = "STANDARD"): ConfiguredBed[] {
  return Array.from({ length: n }, (_, i) => ({ id: uid(), label: `${prefix}-${String(i + 1).padStart(2, "0")}`, kind, notes: "", active: true }));
}

function seed(): ConfiguredWard[] {
  return [
    { id: uid(), name: "Male Medical Ward", code: "MMW", kind: "GENERAL", for: "MEN", floor: "", notes: "", active: true, beds: beds("MM", 8) },
    { id: uid(), name: "Female Medical Ward", code: "FMW", kind: "GENERAL", for: "WOMEN", floor: "", notes: "", active: true, beds: beds("FM", 8) },
    { id: uid(), name: "Children's Ward", code: "CW", kind: "CHILDREN", for: "CHILDREN", floor: "", notes: "", active: true, beds: beds("CW", 6, "COT") },
  ];
}

function read(): ConfiguredWard[] {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ConfiguredWard[];
  } catch {
    // fall through to the example wards
  }
  const s = seed();
  write(s);
  return s;
}

function write(wards: ConfiguredWard[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(wards));
  } catch {
    // storage blocked: changes last until the page is reloaded
  }
}

export function mockListWards(): ConfiguredWard[] {
  return read();
}

export function mockSaveWard(input: Omit<ConfiguredWard, "id" | "beds"> & { id?: string; beds?: ConfiguredBed[] }): ConfiguredWard {
  const all = read();
  if (input.id) {
    const i = all.findIndex((w) => w.id === input.id);
    if (i < 0) throw new Error("Ward not found");
    all[i] = { ...all[i], ...input, id: all[i].id, beds: input.beds ?? all[i].beds };
    write(all);
    return all[i];
  }
  const ward: ConfiguredWard = { ...input, id: uid(), beds: input.beds ?? [] };
  all.push(ward);
  write(all);
  return ward;
}

export function mockAddBeds(wardId: string, add: { prefix: string; from: number; count: number; kind: ConfiguredBed["kind"] }): ConfiguredWard {
  const all = read();
  const w = all.find((x) => x.id === wardId);
  if (!w) throw new Error("Ward not found");
  const taken = new Set(w.beds.map((b) => b.label.toLowerCase()));
  for (let i = 0; i < add.count; i++) {
    const label = add.prefix ? `${add.prefix}-${String(add.from + i).padStart(2, "0")}` : String(add.from + i);
    if (taken.has(label.toLowerCase())) continue;
    w.beds.push({ id: uid(), label, kind: add.kind, notes: "", active: true });
  }
  write(all);
  return w;
}

export function mockSaveBed(wardId: string, bed: ConfiguredBed): ConfiguredWard {
  const all = read();
  const w = all.find((x) => x.id === wardId);
  if (!w) throw new Error("Ward not found");
  if (w.beds.some((b) => b.id !== bed.id && b.label.trim().toLowerCase() === bed.label.trim().toLowerCase())) throw new Error("DUPLICATE_BED");
  w.beds = w.beds.map((b) => (b.id === bed.id ? { ...bed, label: bed.label.trim() } : b));
  write(all);
  return w;
}
