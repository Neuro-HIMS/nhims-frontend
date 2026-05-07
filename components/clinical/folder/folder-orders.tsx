"use client";

import { FolderOrdersLab } from "@/components/clinical/folder/folder-orders-lab";
import { FolderOrdersRadiology } from "@/components/clinical/folder/folder-orders-radiology";
import { FolderOrdersRx } from "@/components/clinical/folder/folder-orders-rx";
import type { Visit } from "@/lib/clinical-types";

interface FolderOrdersProps {
  patientId: string;
  visit: Visit | null;
  user: string;
  canOrder: boolean;
}

export function FolderOrders({ patientId: _patientId, visit, user: _user, canOrder }: FolderOrdersProps) {
  return (
    <div className="space-y-4">
      <FolderOrdersLab visit={visit} canOrder={canOrder} />
      <FolderOrdersRx visit={visit} canOrder={canOrder} />
      <FolderOrdersRadiology visit={visit} canOrder={canOrder} />
    </div>
  );
}
