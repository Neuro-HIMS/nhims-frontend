import { requireModuleAccess } from "@/lib/auth-guards";
import { AppointmentsWorkspace } from "@/components/appointments/appointments-workspace";

export default async function AppointmentsPage() {
  await requireModuleAccess("appointments");
  return <AppointmentsWorkspace />;
}
