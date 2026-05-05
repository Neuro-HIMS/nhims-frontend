import { FacilitySettingsWorkspace } from "@/components/facility/facility-settings-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function Page() {
  const session = await requireModuleAccess("facility");

  return (
    <FacilitySettingsWorkspace
      facilityId={session.user.facilityId}
      facilityName={session.user.facilityName}
      facilityCode={session.user.facilityCode}
    />
  );
}
