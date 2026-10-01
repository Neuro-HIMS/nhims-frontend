/**
 * Discharge confirmation and bed cleaning (area `bed-cleaning`) — backend-gaps.md#NUR-10. Kept in this
 * browser's storage so it survives a reload; other computers don't see it.
 */
export interface GoingHome {
  admissionId: string;
  patientName: string;
  ward: string;
  bed: string;
  dischargedAt: string;
  outcome: string;
  left: boolean;
}

interface Store {
  goingHome: GoingHome[];
  cleaning: string[];
}

const KEY = "nhims.sample.bed-cleaning.v1";

function read(): Store {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // ignore
  }
  return { goingHome: [], cleaning: [] };
}

function write(s: Store): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked
  }
}

export function mockAddGoingHome(g: GoingHome): void {
  const s = read();
  s.goingHome = [...s.goingHome.filter((x) => x.admissionId !== g.admissionId), g];
  write(s);
}

export function mockGoingHome(): GoingHome[] {
  return read()
    .goingHome.filter((g) => !g.left)
    .sort((a, b) => a.dischargedAt.localeCompare(b.dischargedAt));
}

export function mockConfirmLeft(admissionId: string, bedKey: string): void {
  const s = read();
  s.goingHome = s.goingHome.map((g) => (g.admissionId === admissionId ? { ...g, left: true } : g));
  if (bedKey && !s.cleaning.includes(bedKey)) s.cleaning.push(bedKey);
  write(s);
}

export function mockCleaningBeds(): string[] {
  return read().cleaning;
}

export function mockBedReady(bedKey: string): void {
  const s = read();
  s.cleaning = s.cleaning.filter((k) => k !== bedKey);
  write(s);
}
