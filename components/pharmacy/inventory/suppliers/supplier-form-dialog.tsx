"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreatePharmacySupplierPayload,
  PharmacySupplierDto,
} from "@/types/pharmacy-inventory.types";

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: PharmacySupplierDto | null;
  pending?: boolean;
  onSubmitCreate: (payload: CreatePharmacySupplierPayload) => Promise<void>;
  onSubmitEdit: (
    id: string,
    payload: Partial<CreatePharmacySupplierPayload> & { active?: boolean },
  ) => Promise<void>;
  onDeactivate?: (id: string) => Promise<void>;
}

const emptyForm = {
  name: "",
  country: "",
  city: "",
  street: "",
  streetNumber: "",
  postcode: "",
  addressLineExtra: "",
  contactPerson: "",
  contactEmail: "",
  phone: "",
  notes: "",
};

export function SupplierFormDialog(props: SupplierFormDialogProps) {
  // Mounted only while open, so each open starts from the right values (no reset effect).
  if (!props.open) return null;
  return <Body {...props} />;
}

function Body({
  open,
  onOpenChange,
  mode,
  initial,
  pending,
  onSubmitCreate,
  onSubmitEdit,
  onDeactivate,
}: SupplierFormDialogProps) {
  const [form, setForm] = useState(() =>
    mode === "edit" && initial
      ? {
        name: initial.name ?? "",
        country: initial.country ?? "",
        city: initial.city ?? "",
        street: initial.street ?? "",
        streetNumber: initial.streetNumber ?? "",
        postcode: initial.postcode ?? "",
        addressLineExtra: initial.addressLineExtra ?? "",
        contactPerson: initial.contactPerson ?? "",
        contactEmail: initial.contactEmail ?? "",
        phone: initial.phone ?? "",
        notes: initial.notes ?? "",
        }
      : emptyForm,
  );
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  async function handleSave() {
    const payload: CreatePharmacySupplierPayload = {
      name: form.name.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      street: form.street.trim(),
      streetNumber: form.streetNumber.trim(),
      postcode: form.postcode.trim(),
      addressLineExtra: form.addressLineExtra.trim(),
      contactPerson: form.contactPerson.trim(),
      contactEmail: form.contactEmail.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
    };
    if (!payload.name) return;
    if (!payload.postcode) return;
    if (!payload.country) return;
    if (mode === "create") {
      await onSubmitCreate(payload);
    } else if (initial) {
      await onSubmitEdit(initial.id, payload);
    }
    onOpenChange(false);
  }

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title={mode === "create" ? "Add supplier" : "Edit supplier"}
        description={
          mode === "create"
            ? "A company the pharmacy buys stock from."
            : "Update this supplier's details. They are shown on stock deliveries."
        }
        footer={
          <>
            {mode === "edit" && initial && onDeactivate ? (
              <Button
                type="button"
                variant="secondary"
                className="mr-auto"
                disabled={pending}
                onClick={() => setConfirmDeactivate(true)}
              >
                Deactivate supplier
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                pending ||
                !form.name.trim() ||
                !form.postcode.trim() ||
                !form.country.trim()
              }
              onClick={() => void handleSave()}
            >
              {pending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              {mode === "create" ? "Add supplier" : "Save changes"}
            </Button>
          </>
        }
      >
        <FormDialogSection title="Company">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-name">Supplier name</Label>
            <Input
              id="sup-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ernest Chemists Ltd"
            />
          </div>
        </FormDialogSection>

        <FormDialogSection title="Address">
          <div className="space-y-1.5">
            <Label htmlFor="sup-street">Street (optional)</Label>
            <Input
              id="sup-street"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-street-no">
              House or building number (optional)
            </Label>
            <Input
              id="sup-street-no"
              value={form.streetNumber}
              onChange={(e) =>
                setForm({ ...form, streetNumber: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-extra">More address details (optional)</Label>
            <Input
              id="sup-extra"
              value={form.addressLineExtra}
              onChange={(e) =>
                setForm({ ...form, addressLineExtra: e.target.value })
              }
              placeholder="e.g. Near the Total filling station"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-city">City (optional)</Label>
            <Input
              id="sup-city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="e.g. Kumasi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-post">Postcode or digital address</Label>
            <Input
              id="sup-post"
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              placeholder="e.g. GA-123-4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-country">Country</Label>
            <Input
              id="sup-country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="e.g. Ghana"
            />
          </div>
        </FormDialogSection>

        <FormDialogSection title="Contact">
          <div className="space-y-1.5">
            <Label htmlFor="sup-contact">Contact person (optional)</Label>
            <Input
              id="sup-contact"
              value={form.contactPerson}
              onChange={(e) =>
                setForm({ ...form, contactPerson: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-phone">Phone (optional)</Label>
            <Input
              id="sup-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 024 123 4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-mail">Email (optional)</Label>
            <Input
              id="sup-mail"
              type="email"
              value={form.contactEmail}
              onChange={(e) =>
                setForm({ ...form, contactEmail: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-notes">Notes (optional)</Label>
            <Textarea
              id="sup-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </FormDialogSection>
      </FormDialog>
      {mode === "edit" && initial && onDeactivate && (
        <ConfirmDialog
          open={confirmDeactivate}
          onOpenChange={setConfirmDeactivate}
          title={`Deactivate ${initial.name}?`}
          description="They won't be offered when receiving stock. Past deliveries keep their details. You can reactivate them later."
          confirmLabel="Deactivate supplier"
          destructive
          pending={pending}
          onConfirm={async () => {
            await onDeactivate(initial.id);
            setConfirmDeactivate(false);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
