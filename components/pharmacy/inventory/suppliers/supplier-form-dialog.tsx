"use client";

import { useEffect, useState } from "react";
import { Loader2, PlusSquare } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreatePharmacySupplierPayload, PharmacySupplierDto } from "@/types/pharmacy-inventory.types";

function Req({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <span className="text-destructive">*</span>
    </>
  );
}

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: PharmacySupplierDto | null;
  pending?: boolean;
  onSubmitCreate: (payload: CreatePharmacySupplierPayload) => Promise<void>;
  onSubmitEdit: (id: string, payload: Partial<CreatePharmacySupplierPayload> & { active?: boolean }) => Promise<void>;
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

export function SupplierFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  pending,
  onSubmitCreate,
  onSubmitEdit,
  onDeactivate,
}: SupplierFormDialogProps) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
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
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, mode, initial]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
              <PlusSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {mode === "create" ? "Add Supplier" : "Edit Supplier"}
              </DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? "Add a new supplier to your facility pharmacy inventory."
                  : "Update supplier details used for stock receipts and audit."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sup-name">
              <Req>Supplier Name</Req>
            </Label>
            <Input
              id="sup-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter Supplier Name"
              className="font-clinical"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-post">
              <Req>Post Code</Req>
            </Label>
            <Input
              id="sup-post"
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              placeholder="Enter Post Code"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-country">
              <Req>Country</Req>
            </Label>
            <Input
              id="sup-country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Country"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-city">City</Label>
            <Input
              id="sup-city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Enter City"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-street">Street</Label>
            <Input
              id="sup-street"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder="Enter Street"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-street-no">Street Number</Label>
            <Input
              id="sup-street-no"
              value={form.streetNumber}
              onChange={(e) => setForm({ ...form, streetNumber: e.target.value })}
              placeholder="Enter Street Number"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sup-extra">Additional Address Line</Label>
            <Input
              id="sup-extra"
              value={form.addressLineExtra}
              onChange={(e) => setForm({ ...form, addressLineExtra: e.target.value })}
              placeholder="Enter Additional Address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-contact">Contact Person Name</Label>
            <Input
              id="sup-contact"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="Enter Contact Person Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-mail">Contact Person Mail</Label>
            <Input
              id="sup-mail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              placeholder="Enter Contact Person Mail"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-phone">Phone</Label>
            <Input
              id="sup-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Enter Phone"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sup-notes">Notes</Label>
            <Textarea
              id="sup-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Internal notes…"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          {mode === "edit" && initial && onDeactivate ? (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto w-full sm:w-auto"
              disabled={pending}
              onClick={async () => {
                await onDeactivate(initial.id);
                onOpenChange(false);
              }}
            >
              Deactivate supplier
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Add Supplier" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
