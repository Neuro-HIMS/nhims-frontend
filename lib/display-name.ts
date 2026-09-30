/**
 * A person's name for display, with graceful fallbacks — never render a bare
 * "Hello, !" or a blank table cell just because a name hasn't been set yet.
 */
export function displayName(user: { firstName?: string | null; lastName?: string | null; username?: string | null }): string {
  const first = user.firstName?.trim() ?? "";
  const last = user.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  if (full) return full;
  if (user.username?.trim()) return user.username.trim();
  return "";
}

/** True when neither a first/last name nor a username could be found — caller should show a neutral placeholder. */
export function hasNoName(user: { firstName?: string | null; lastName?: string | null; username?: string | null }): boolean {
  return !displayName(user);
}

/**
 * A name string that came back from the server as text (e.g. "recordedByName").
 * Drops the literal "null"/"undefined" words some records carry when no name was set.
 */
export function cleanPersonName(name: string | null | undefined): string {
  return (name ?? "")
    .split(/\s+/)
    .filter((part) => part && part !== "null" && part !== "undefined")
    .join(" ");
}

/** Visits store the patient as "Surname, First names" — turn that into "First names Surname" for sentences. */
export function naturalName(listName: string | null | undefined): string {
  const name = cleanPersonName(listName);
  const i = name.indexOf(", ");
  return i > 0 ? `${name.slice(i + 2)} ${name.slice(0, i)}` : name;
}
