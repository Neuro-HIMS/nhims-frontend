import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

const SUB_NAV = [
  { label: "Inventory", view: "inventory", href: "/blood-bank?view=inventory" },
  { label: "Cross-match", view: "crossmatch", href: "/blood-bank?view=crossmatch" },
  { label: "Issues", view: "issues", href: "/blood-bank?view=issues" },
];

export default async function BloodBankPage() {
  await requireModuleAccess("blood-bank");
  return (
    <ClinicalServiceModuleWorkspace
      module="blood-bank"
      title="Blood Transfusion"
      subtitle="Stock management, compatibility testing, and controlled blood product issue."
      facilityServiceId="blood_bank"
      basePath="/blood-bank"
      subNav={SUB_NAV}
    />
  );
}
