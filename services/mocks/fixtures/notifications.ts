import type { Notification } from "@/store/notification.store";

/** Sample data for the header bell — used only when NEXT_PUBLIC_MOCK_AREAS includes "notifications". */
export const NOTIFICATIONS_FIXTURE: Omit<Notification, "read">[] = [
  {
    id: "n1",
    type: "critical_lab",
    title: "Critical result — Ama Mensah",
    message: "Potassium 6.8 mmol/L (critical high). Tell the doctor now.",
    patientId: "p-ama-mensah",
    patientName: "Ama Mensah",
    href: "/laboratory?view=results",
    createdAt: new Date(Date.now() - 6 * 60_000).toISOString(),
  },
  {
    id: "n2",
    type: "referral",
    title: "Referral received — Kofi Boateng",
    message: "Referred from Nurse station for a doctor's review.",
    patientId: "p-kofi-boateng",
    patientName: "Kofi Boateng",
    href: "/opd?view=queue",
    createdAt: new Date(Date.now() - 40 * 60_000).toISOString(),
  },
  {
    id: "n3",
    type: "low_stock",
    title: "Low stock — Amoxicillin 500mg",
    message: "12 units left. Reorder soon.",
    href: "/pharmacy?view=inventory",
    createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
  },
];
