export interface AuditEventDto {
  id: string;
  /** @deprecated NHIMS runs one facility per server — don't read or display this. */
  facilityId?: string | null;
  actorUserId: string | null;
  actorUsername: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string;
  details: string;
  createdAt: string | null;
}
