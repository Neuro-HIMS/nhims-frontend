"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppointmentBookingCard } from "@/components/records/views/appointment-booking-card";
import { GHANA_REGIONS, OCCUPATION_OPTIONS } from "@/components/records/lib/records-data";
import { RecordsField } from "@/components/records/shared/records-field";
import { EMPTY_REGISTRATION_FORM, type Patient, type RegistrationForm } from "@/components/records/lib/records-types";
import { calculateAgeFromDob, generatePatientId, mockValidateNhis } from "@/components/records/lib/records-utils";

export function RegistrationView() {
  const [form, setForm] = useState<RegistrationForm>(EMPTY_REGISTRATION_FORM);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [nhisMessage, setNhisMessage] = useState("");
  const [isValidatingNhis, setIsValidatingNhis] = useState(false);

  const canSubmit =
    form.patientId &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.sex &&
    (form.dob || form.age.trim()) &&
    form.phone.trim();

  function updateForm<K extends keyof RegistrationForm>(key: K, value: RegistrationForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  useEffect(() => {
    if (!form.patientId) {
      updateForm("patientId", generatePatientId());
    }
  }, [form.patientId]);

  useEffect(() => {
    if (!form.dob || form.dobUnknown) return;
    const ageResult = calculateAgeFromDob(form.dob);
    updateForm("age", String(ageResult.age));
    updateForm("ageUnit", ageResult.unit);
  }, [form.dob, form.dobUnknown]);

  function regeneratePatientId() {
    updateForm("patientId", generatePatientId());
  }

  function onDobUnknownChange(checked: boolean) {
    updateForm("dobUnknown", checked);
    if (checked) {
      updateForm("dob", "");
      updateForm("age", "");
      updateForm("ageUnit", "years");
      return;
    }

    if (form.dob) {
      const ageResult = calculateAgeFromDob(form.dob);
      updateForm("age", String(ageResult.age));
      updateForm("ageUnit", ageResult.unit);
    }
  }

  async function validateNhis() {
    setIsValidatingNhis(true);
    setNhisMessage("");
    const result = await mockValidateNhis(form.nhisNumber);
    if (result) {
      updateForm("nhisStatus", result.status);
      updateForm("nhisExpiry", result.expiryDate);
      setNhisMessage(`NHIS validated for ${result.fullName}.`);
    } else {
      updateForm("nhisStatus", "no");
      updateForm("nhisExpiry", "");
      setNhisMessage("NHIS record not found or invalid.");
    }
    setIsValidatingNhis(false);
  }

  function handleRegister() {
    if (!canSubmit) return;

    setCreatedPatient({
      patientId: form.patientId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dob: form.dob || "Unknown",
      sex: form.sex as "M" | "F",
      phone: form.phone.trim(),
      district: form.region || "Not provided",
      nhisCard: form.nhisNumber,
      nhisStatus: form.nhisStatus === "yes" ? "active" : "inactive",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">First-Time Client Registration</CardTitle>
          <CardDescription>
            Single-page registration for new clients only. Existing clients should use lookup and book.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identity and Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RecordsField label="PATIENT_ID *" className="lg:col-span-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input value={form.patientId} readOnly className="font-clinical" />
                <Button type="button" variant="outline" onClick={regeneratePatientId}>
                  Regenerate
                </Button>
              </div>
            </RecordsField>
            <RecordsField label="Client Status *">
              <div className="flex h-10 items-center gap-4 rounded-md border border-input px-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    checked={form.clientStatus === "new"}
                    onChange={() => updateForm("clientStatus", "new")}
                  />
                  New
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    checked={form.clientStatus === "old"}
                    onChange={() => updateForm("clientStatus", "old")}
                  />
                  Old
                </label>
              </div>
            </RecordsField>
            <RecordsField label="First Name *">
              <Input value={form.firstName} onChange={(event) => updateForm("firstName", event.target.value)} />
            </RecordsField>
            <RecordsField label="Middle Name">
              <Input value={form.middleName} onChange={(event) => updateForm("middleName", event.target.value)} />
            </RecordsField>
            <RecordsField label="Last Name *">
              <Input value={form.lastName} onChange={(event) => updateForm("lastName", event.target.value)} />
            </RecordsField>
            <RecordsField label="Date of Birth">
              <Input
                type="date"
                value={form.dob}
                disabled={form.dobUnknown}
                onChange={(event) => updateForm("dob", event.target.value)}
              />
            </RecordsField>
            <RecordsField label="Age">
              <Input
                value={form.age}
                disabled={!form.dobUnknown}
                onChange={(event) => updateForm("age", event.target.value.replace(/\D/g, ""))}
                placeholder={form.dobUnknown ? "Enter age" : "Auto from DOB"}
                className="font-clinical"
              />
            </RecordsField>
            <RecordsField label="Age Unit">
              <div className="flex h-10 items-center gap-4 rounded-md border border-input px-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    checked={form.ageUnit === "months"}
                    onChange={() => updateForm("ageUnit", "months")}
                  />
                  Months
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    checked={form.ageUnit === "years"}
                    onChange={() => updateForm("ageUnit", "years")}
                  />
                  Years
                </label>
              </div>
            </RecordsField>
            <RecordsField label="Sex *">
              <Select value={form.sex} onValueChange={(value: RegistrationForm["sex"]) => updateForm("sex", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </RecordsField>
            <RecordsField label="Marital Status">
              <Select value={form.maritalStatus} onValueChange={(value) => updateForm("maritalStatus", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </RecordsField>
            <RecordsField label="Occupation">
              <Input
                list="occupation-options"
                value={form.occupation}
                onChange={(event) => updateForm("occupation", event.target.value)}
                placeholder="Search occupation"
              />
              <datalist id="occupation-options">
                {OCCUPATION_OPTIONS.map((occupation) => (
                  <option key={occupation} value={occupation} />
                ))}
              </datalist>
            </RecordsField>
            <RecordsField label="DOB Unknown">
              <div className="flex h-10 items-center rounded-md border border-input px-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.dobUnknown}
                    onChange={(event) => onDobUnknownChange(event.target.checked)}
                  />
                  Enable manual age entry
                </label>
              </div>
            </RecordsField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RecordsField label="Phone Number *">
              <Input
                type="tel"
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                className="font-clinical"
              />
            </RecordsField>
            <RecordsField label="Alternate Phone">
              <Input
                type="tel"
                value={form.altPhone}
                onChange={(event) => updateForm("altPhone", event.target.value)}
                className="font-clinical"
              />
            </RecordsField>
            <RecordsField label="Region">
              <Select value={form.region} onValueChange={(value) => updateForm("region", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {GHANA_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </RecordsField>
            <RecordsField label="Address" className="sm:col-span-2">
              <Input value={form.address} onChange={(event) => updateForm("address", event.target.value)} />
            </RecordsField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">NHIS Validity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RecordsField label="NHIS Member Number">
              <Input
                value={form.nhisNumber}
                onChange={(event) => updateForm("nhisNumber", event.target.value)}
                className="font-clinical"
              />
            </RecordsField>
            <RecordsField label="Validate">
              <Button
                type="button"
                variant="outline"
                disabled={!form.nhisNumber.trim() || isValidatingNhis}
                onClick={validateNhis}
                className="w-full"
              >
                {isValidatingNhis ? "Validating..." : "Validate NHIS"}
              </Button>
            </RecordsField>
            <RecordsField label="NHIS Status">
              <div className="flex h-10 items-center gap-4 rounded-md border border-input px-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    checked={form.nhisStatus === "yes"}
                    onChange={() => updateForm("nhisStatus", "yes")}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    checked={form.nhisStatus === "no"}
                    onChange={() => updateForm("nhisStatus", "no")}
                  />
                  No
                </label>
              </div>
            </RecordsField>
            <RecordsField label="NHIS Expiry Date">
              <Input
                type="date"
                value={form.nhisExpiry}
                onChange={(event) => updateForm("nhisExpiry", event.target.value)}
              />
            </RecordsField>
          </div>
          {nhisMessage && <p className="mt-3 text-sm text-muted-foreground">{nhisMessage}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RecordsField label="Name">
              <Input
                value={form.emergencyName}
                onChange={(event) => updateForm("emergencyName", event.target.value)}
              />
            </RecordsField>
            <RecordsField label="Relationship">
              <Input
                value={form.emergencyRelation}
                onChange={(event) => updateForm("emergencyRelation", event.target.value)}
              />
            </RecordsField>
            <RecordsField label="Phone">
              <Input
                type="tel"
                value={form.emergencyPhone}
                onChange={(event) => updateForm("emergencyPhone", event.target.value)}
                className="font-clinical"
              />
            </RecordsField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-sm text-muted-foreground">
            Required fields: PATIENT_ID, First Name, Last Name, Sex, DOB or Age, and Phone Number.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setForm({ ...EMPTY_REGISTRATION_FORM, patientId: generatePatientId() })}>
              Reset Form
            </Button>
            <Button onClick={handleRegister} disabled={!canSubmit}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Register Client
            </Button>
          </div>
        </CardContent>
      </Card>

      {createdPatient && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-start gap-3 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-700" />
            <div>
              <p className="font-medium text-green-900">Client registered successfully</p>
              <p className="mt-0.5 text-sm text-green-800">
                {createdPatient.firstName} {createdPatient.lastName} - {createdPatient.patientId}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {createdPatient && (
        <AppointmentBookingCard
          patient={createdPatient}
          title="Book Appointment for Newly Registered Client"
          description="Use this immediately to complete the registration workflow."
        />
      )}
    </div>
  );
}


