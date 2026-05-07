export interface AuditEventDto {
  id: string;
  facilityId: string | null;
  actorUserId: string | null;
  actorUsername: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string;
  details: string;
  createdAt: string | null;
}
