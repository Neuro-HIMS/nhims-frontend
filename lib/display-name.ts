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
