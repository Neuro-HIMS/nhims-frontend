/**
 * Diseases that must be reported to the district (Ghana IDSR immediately/weekly
 * notifiable list, simplified). Stopgap: the diagnosis list has no "must be reported"
 * flag yet — see docs/agents/backend-gaps.md#DOC-04-notifiable. Matching is by name,
 * so it is a prompt for the doctor, not a guarantee.
 */
const NOTIFIABLE_NAME_PATTERNS: RegExp[] = [
  /\bcholera\b/i,
  /\bmeasles\b/i,
  /\byellow fever\b/i,
  /\bmening(itis|ococcal)\b/i,
  /\b(acute flaccid paralysis|poliomyelitis|polio)\b/i,
  /\banthrax\b/i,
  /\brabies\b/i,
  /\bebola\b/i,
  /\blassa\b/i,
  /\bmarburg\b/i,
  /\b(covid|sars-cov)/i,
  /\bmpox\b|\bmonkeypox\b/i,
  /\bneonatal tetanus\b/i,
  /\bguinea worm\b|\bdracuncul/i,
  /\bplague\b/i,
  /\b(avian|pandemic) influenza\b/i,
  /\btyphoid\b/i,
  /\bburuli ulcer\b/i,
  /\bdiphtheria\b/i,
  /\bpertussis\b|\bwhooping cough\b/i,
];

export function isNotifiableDisease(name: string | null | undefined): boolean {
  if (!name) return false;
  return NOTIFIABLE_NAME_PATTERNS.some((re) => re.test(name));
}
