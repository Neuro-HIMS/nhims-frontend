"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { endOfToday } from "date-fns";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingForm } from "@/components/booking/booking-form";
import { HospitalPatientCard } from "@/components/records/views/hospital-patient-card";
import { BLOOD_GROUP_OPTIONS, GHANA_REGIONS, OCCUPATION_OPTIONS } from "@/components/records/lib/records-data";
import { RecordsField } from "@/components/records/shared/records-field";
import { EMPTY_REGISTRATION_FORM, type RegistrationForm } from "@/components/records/lib/records-types";
import { calculateAgeFromDob, verifyNhisMembership } from "@/components/records/lib/records-utils";
import { patientDtoToLegacyPatient } from "@/lib/patient-mapper";
import { queryKeys } from "@/lib/query-keys";
import { patientsService } from "@/services/patients.service";
import type { PatientDto } from "@/types/patients.types";
import type { ApiError } from "@/types/api.types";

function registrationFormToPayload(form: RegistrationForm) {
  return {
    clientStatus: form.clientStatus,
    firstName: form.firstName,
    middleName: form.middleName,
    lastName: form.lastName,
    dob: form.dob,
    dobUnknown: form.dobUnknown,
    age: form.age,
    ageUnit: form.ageUnit,
    sex: form.sex,
    phone: form.phone,
    altPhone: form.altPhone,
    region: form.region,
    address: form.address,
    maritalStatus: form.maritalStatus,
    occupation: form.occupation,
    nhisNumber: form.nhisNumber,
    nhisStatus: form.nhisStatus,
    nhisExpiry: form.nhisExpiry,
    emergencyName: form.emergencyName,
    emergencyRelation: form.emergencyRelation,
    emergencyPhone: form.emergencyPhone,
    bloodGroup: form.bloodGroup,
    knownAllergies: form.knownAllergies,
    registrationConsentAcknowledged: form.registrationConsentAcknowledged,
  };
}

export function RegistrationView() {
  const currentYear = new Date().getFullYear();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RegistrationForm>(EMPTY_REGISTRATION_FORM);
  const [registeredDto, setRegisteredDto] = useState<PatientDto | null>(null);
  const [nhisMessage, setNhisMessage] = useState("");
  const [isValidatingNhis, setIsValidatingNhis] = useState(false);

  const nextRefQuery = useQuery({
    queryKey: queryKeys.patients.nextReference,
    queryFn: () => patientsService.peekNextReference(),
    staleTime: 60_000,
  });

  useEffect(() => {
    const id = nextRefQuery.data?.patientPublicId;
    if (id) {
      setForm((previous) => ({ ...previous, patientId: id }));
    }
  }, [nextRefQuery.data?.patientPublicId]);

  const registerMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof registrationFormToPayload>) => patientsService.register(payload),
    onSuccess: (data) => {
      setRegisteredDto(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.nextReference });
      toast.success("Patient registered", {
        description: `${data.firstName} ${data.lastName} · ${data.patientPublicId}`,
      });
    },
    onError: (error: unknown) => {
      const ax = error as { response?: { data?: ApiError } };
      const msg = ax.response?.data?.message ?? "Registration failed";
      toast.error(msg);
    },
  });

  const hasDobOrAge = form.dobUnknown ? form.age.trim().length > 0 : Boolean(form.dob?.trim());

  const canSubmit =
    Boolean(form.firstName.trim()) &&
    Boolean(form.lastName.trim()) &&
    Boolean(form.sex) &&
    hasDobOrAge &&
    Boolean(form.phone.trim()) &&
    form.registrationConsentAcknowledged &&
    !registerMutation.isPending;

  function updateForm<K extends keyof RegistrationForm>(key: K, value: RegistrationForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  useEffect(() => {
    if (!form.dob || form.dobUnknown) return;
    const ageResult = calculateAgeFromDob(form.dob);
    updateForm("age", String(ageResult.age));
    updateForm("ageUnit", ageResult.unit);
  }, [form.dob, form.dobUnknown]);

  function refreshPreviewId() {
    nextRefQuery.refetch();
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
    if (!form.nhisNumber.trim()) {
      toast.error("Enter an NHIS membership number first.");
      return;
    }
    setIsValidatingNhis(true);
    setNhisMessage("");
    try {
      const result = await verifyNhisMembership(form.nhisNumber.trim());
      switch (result.status) {
        case "VERIFIED":
          updateForm("nhisStatus", "yes");
          updateForm("nhisExpiry", result.validUntil ?? "");
          setNhisMessage(result.memberName ? `NHIS validated for ${result.memberName}.` : "NHIS validated.");
          break;
        case "NOT_FOUND":
          updateForm("nhisStatus", "no");
          updateForm("nhisExpiry", "");
          setNhisMessage(result.message ?? "NHIS record not found.");
          break;
        case "INVALID_FORMAT":
          updateForm("nhisStatus", "no");
          updateForm("nhisExpiry", "");
          setNhisMessage(result.message ?? "Invalid membership number format.");
          break;
        case "PENDING_GATEWAY":
          updateForm("nhisStatus", "no");
          updateForm("nhisExpiry", "");
          setNhisMessage(
            result.message ??
              "NHIA verification is not connected. Confirm eligibility before billing as NHIS."
          );
          break;
        default:
          updateForm("nhisStatus", "no");
          setNhisMessage("Could not verify NHIS.");
      }
    } catch (error: unknown) {
      const ax = error as { response?: { data?: ApiError } };
      updateForm("nhisStatus", "no");
      updateForm("nhisExpiry", "");
      setNhisMessage(ax.response?.data?.message ?? "NHIS verification request failed.");
    } finally {
      setIsValidatingNhis(false);
    }
  }

  function handleRegister() {
    if (!canSubmit) return;
    registerMutation.mutate(registrationFormToPayload(form));
  }

  function resetForm() {
    setForm({ ...EMPTY_REGISTRATION_FORM });
    setRegisteredDto(null);
    refreshPreviewId();
  }

  const previewError = nextRefQuery.isError;
  const peekAx = nextRefQuery.error as { response?: { status?: number; data?: ApiError } } | undefined;
  const peekErrDetail = peekAx?.response?.data?.message;

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
                <Input
                  value={form.patientId}
                  readOnly
                  placeholder={nextRefQuery.isLoading ? "Loading…" : "—"}
                  className="font-clinical"
                />
                <Button type="button" variant="outline" onClick={refreshPreviewId} disabled={nextRefQuery.isFetching}>
                  {nextRefQuery.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Refresh</span>
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pattern: <span className="font-mono">FACILITYCODE-12345678-YY</span> — server-assigned. Tap Refresh to
                regenerate the preview if allocation conflicts (409).
              </p>
              {previewError && (
                <p className="mt-1 text-xs text-destructive">
                  {peekAx?.response?.status === 409
                    ? (peekErrDetail ?? "Could not reserve a unique preview ID — tap Refresh.")
                    : (peekErrDetail ??
                      "Could not load the next ID preview. You can still register — the server will assign an ID.")}
                </p>
              )}
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
              <DatePickerField
                value={form.dob}
                disabled={form.dobUnknown}
                placeholder="Select date of birth"
                fromYear={1900}
                toYear={currentYear}
                disableAfter={endOfToday()}
                className="font-clinical"
                onChange={(iso) => updateForm("dob", iso)}
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
              <DatePickerField
                value={form.nhisExpiry}
                placeholder="Select expiry date"
                fromYear={2000}
                toYear={currentYear + 20}
                className="font-clinical"
                onChange={(iso) => updateForm("nhisExpiry", iso)}
              />
            </RecordsField>
          </div>
          {nhisMessage && <p className="mt-3 text-sm text-muted-foreground">{nhisMessage}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Clinical & consent</CardTitle>
          <CardDescription>Blood group and allergies support clinical safety; consent is required for registration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <RecordsField label="Blood group">
              <Select
                value={form.bloodGroup ? form.bloodGroup.toUpperCase() : "__none__"}
                onValueChange={(value) => updateForm("bloodGroup", value === "__none__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || "none"} value={opt.value || "__none__"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </RecordsField>
            <RecordsField label="Known allergies" className="sm:col-span-2">
              <Textarea
                value={form.knownAllergies}
                onChange={(event) => updateForm("knownAllergies", event.target.value)}
                placeholder="e.g. Penicillin — anaphylaxis; or None known"
                rows={3}
                className="resize-y font-clinical"
              />
            </RecordsField>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-muted/30 p-3 text-sm">
            <Checkbox
              checked={form.registrationConsentAcknowledged}
              onCheckedChange={(checked) => updateForm("registrationConsentAcknowledged", checked === true)}
              className="mt-0.5"
            />
            <span>
              I confirm that the client (or legal guardian) has been informed that demographic and clinical identifiers
              will be stored for care and NHIS reporting, and that they consent to registration at this facility.
            </span>
          </label>
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
            Required: First name, last name, sex, DOB or age, phone, and registration consent. Blood group and allergies
            are optional but recommended.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={resetForm}>
              Reset Form
            </Button>
            <Button type="button" onClick={handleRegister} disabled={!canSubmit}>
              {registerMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 h-4 w-4" />
              )}
              Register Client
            </Button>
          </div>
        </CardContent>
      </Card>

      {registeredDto && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40">
          <CardContent className="flex items-start gap-3 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-700 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Client registered successfully</p>
              <p className="mt-0.5 text-sm text-green-800 dark:text-green-200">
                {registeredDto.firstName} {registeredDto.lastName} — {registeredDto.patientPublicId}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {registeredDto && (
        <div className="space-y-2">
          <p className="text-center text-sm font-medium text-muted-foreground">Hospital card</p>
          <HospitalPatientCard patient={registeredDto} />
        </div>
      )}

      {registeredDto && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Book Appointment for Newly Registered Client</CardTitle>
            <CardDescription>
              Use this immediately to complete the registration workflow. The service comes from the Finance catalog so the
              same canonical name reaches the cashier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookingForm
              patient={patientDtoToLegacyPatient(registeredDto)}
              patientId={registeredDto.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
