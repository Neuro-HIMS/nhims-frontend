"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { endOfToday } from "date-fns";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineNotice } from "@/components/common/inline-notice";
import { SaveIndicator } from "@/components/common/save-indicator";
import { StepIndicator, type Step } from "@/components/common/step-indicator";
import { SuccessPanel } from "@/components/common/success-panel";
import { BLOOD_GROUP_OPTIONS, GHANA_REGIONS, OCCUPATION_OPTIONS } from "@/components/records/lib/records-data";
import type { Patient } from "@/components/records/lib/records-types";
import { calculateAgeFromDob } from "@/components/records/lib/records-utils";
import { NhisCheck } from "@/components/records/nhis-check";
import { StartVisitDialog } from "@/components/records/start-visit-dialog";
import { HospitalPatientCard } from "@/components/records/views/hospital-patient-card";
import { PatientResultCard } from "@/components/records/views/patient-result-card";
import { getFriendlyError } from "@/lib/api-errors";
import { patientDtoToLegacyPatient, patientSummaryToLegacyPatient } from "@/lib/patient-mapper";
import { queryKeys } from "@/lib/query-keys";
import { patientsService } from "@/services/patients.service";
import { useUIStore } from "@/store/ui.store";
import {
  patientRegistrationSchema,
  REGISTRATION_STEP_FIELDS,
  type PatientRegistrationInput,
} from "@/schemas/patient.schema";
import type { PatientDto, PatientSummaryDto, RegisterPatientPayload } from "@/types/patients.types";

const STEPS: Step[] = [
  { label: "Personal details" },
  { label: "Contact and next of kin" },
  { label: "NHIS" },
  { label: "Health details" },
  { label: "Check and save" },
];

const DRAFT_KEY = "nhims-registration-draft";

const DEFAULT_VALUES: PatientRegistrationInput = {
  firstName: "",
  middleName: "",
  lastName: "",
  sex: "",
  dob: "",
  dobUnknown: false,
  age: "",
  ageUnit: "years",
  occupation: "",
  phone: "",
  altPhone: "",
  address: "",
  town: "",
  region: "",
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhone: "",
  hasNhis: "no",
  nhisNumber: "",
  nhisStatus: "no",
  nhisExpiry: "",
  allergyChips: [],
  noKnownAllergies: false,
  bloodGroup: "",
  registrationConsentAcknowledged: false,
};

function toPayload(v: PatientRegistrationInput): RegisterPatientPayload {
  return {
    clientStatus: "new",
    firstName: v.firstName.trim(),
    middleName: v.middleName.trim(),
    lastName: v.lastName.trim(),
    dob: v.dobUnknown ? "" : v.dob,
    dobUnknown: v.dobUnknown,
    age: v.age,
    ageUnit: v.ageUnit,
    sex: v.sex,
    phone: v.phone.trim(),
    altPhone: v.altPhone.trim(),
    region: v.region,
    address: [v.address.trim(), v.town.trim()].filter(Boolean).join(", "),
    maritalStatus: "",
    occupation: v.occupation.trim(),
    nhisNumber: v.hasNhis === "yes" ? v.nhisNumber.trim() : "",
    nhisStatus: v.hasNhis === "yes" ? v.nhisStatus : "no",
    nhisExpiry: v.hasNhis === "yes" ? v.nhisExpiry : "",
    emergencyName: v.emergencyName.trim(),
    emergencyRelation: v.emergencyRelation.trim(),
    emergencyPhone: v.emergencyPhone.trim(),
    bloodGroup: v.bloodGroup,
    knownAllergies: v.noKnownAllergies ? "None known" : v.allergyChips.join(", "),
    registrationConsentAcknowledged: v.registrationConsentAcknowledged,
  };
}

export function RegistrationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setSaveStatus = useUIStore((s) => s.setSaveStatus);

  const [step, setStep] = useState(0);
  const [registeredDto, setRegisteredDto] = useState<PatientDto | null>(null);
  const [duplicates, setDuplicates] = useState<PatientSummaryDto[] | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [visitPatient, setVisitPatient] = useState<Patient | null>(null);
  const [newChip, setNewChip] = useState("");

  const form = useForm<PatientRegistrationInput>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      firstName: searchParams.get("firstName") ?? "",
      lastName: searchParams.get("lastName") ?? "",
    },
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) form.reset(JSON.parse(raw));
    } catch {
      // Corrupt or missing draft — start from a blank form.
    }
    // Only ever load the draft once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const subscription = form.watch((value) => {
      setSaveStatus("saving");
      clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify(value));
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      }, 600);
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(draftTimer.current);
    };
  }, [form, setSaveStatus]);

  useEffect(() => () => setSaveStatus("idle"), [setSaveStatus]);

  const nextRefQuery = useQuery({
    queryKey: queryKeys.patients.nextReference,
    queryFn: () => patientsService.peekNextReference(),
    staleTime: 60_000,
    enabled: !registeredDto,
  });

  const dob = form.watch("dob");
  const dobUnknown = form.watch("dobUnknown");
  useEffect(() => {
    if (!dob || dobUnknown) return;
    const result = calculateAgeFromDob(dob);
    form.setValue("age", String(result.age));
    form.setValue("ageUnit", result.unit);
  }, [dob, dobUnknown, form]);

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPatientPayload) => patientsService.register(payload),
    onSuccess: (data) => {
      setRegisteredDto(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* best-effort draft cleanup */
      }
      setSaveStatus("idle");
    },
    onError: (error) => {
      const friendly = getFriendlyError(error, "the patient's details");
      toast.error(friendly.title, { description: friendly.message });
    },
  });

  function addChip() {
    const value = newChip.trim();
    if (!value) return;
    form.setValue("allergyChips", [...form.getValues("allergyChips"), value], { shouldValidate: true });
    setNewChip("");
  }

  function removeChip(index: number) {
    const chips = form.getValues("allergyChips").filter((_, i) => i !== index);
    form.setValue("allergyChips", chips, { shouldValidate: true });
  }

  async function handleContinue() {
    if (step === 0) {
      const valid = await form.trigger(REGISTRATION_STEP_FIELDS[0]);
      if (!valid) return;
      const { firstName, lastName } = form.getValues();
      if (!firstName.trim() && !lastName.trim()) {
        setStep(1);
        return;
      }
      setCheckingDuplicates(true);
      try {
        const matches = await patientsService.search({
          mode: "name",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        if (matches.length > 0) {
          setDuplicates(matches);
        } else {
          setStep(1);
        }
      } catch {
        setStep(1);
      } finally {
        setCheckingDuplicates(false);
      }
      return;
    }

    const valid = await form.trigger(REGISTRATION_STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleSave() {
    const valid = await form.trigger();
    if (!valid) return;
    registerMutation.mutate(toPayload(form.getValues()));
  }

  function resetAll() {
    form.reset({
      ...DEFAULT_VALUES,
    });
    setRegisteredDto(null);
    setDuplicates(null);
    setStep(0);
    nextRefQuery.refetch();
  }

  if (registeredDto) {
    return (
      <div className="space-y-4">
        <SuccessPanel
          title={`${registeredDto.firstName} ${registeredDto.lastName} is registered.`}
          description={`Hospital number ${registeredDto.patientPublicId}.`}
          actions={[
            {
              label: "Start today's visit",
              variant: "default",
              onClick: () => setVisitPatient(patientDtoToLegacyPatient(registeredDto)),
            },
            { label: "Print patient card", variant: "outline", onClick: () => window.print() },
            {
              label: "Book an appointment",
              variant: "outline",
              onClick: () =>
                router.push(`/appointments?view=book&patientPublicId=${encodeURIComponent(registeredDto.patientPublicId)}`),
            },
            { label: "Register another patient", variant: "outline", onClick: resetAll },
          ]}
        />
        <div className="space-y-2">
          <p className="text-center text-sm font-medium text-muted-foreground">Hospital card</p>
          <HospitalPatientCard patient={registeredDto} />
        </div>
        {visitPatient && (
          <StartVisitDialog patient={visitPatient} onOpenChange={(next) => !next && setVisitPatient(null)} />
        )}
      </div>
    );
  }

  if (duplicates) {
    return (
      <div className="space-y-4">
        <InlineNotice tone="warning" title="This patient may already be registered">
          Check the matches below before creating a new record.
        </InlineNotice>
        <div className="space-y-2">
          {duplicates.map((d) => (
            <PatientResultCard
              key={d.id}
              patient={patientSummaryToLegacyPatient(d)}
              showBookButton={false}
              rightSlot={
                <Button size="sm" onClick={() => setVisitPatient(patientSummaryToLegacyPatient(d))}>
                  Use this patient
                </Button>
              }
            />
          ))}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setDuplicates(null);
            setStep(1);
          }}
        >
          No, this is a new patient
        </Button>
        {visitPatient && (
          <StartVisitDialog patient={visitPatient} onOpenChange={(next) => !next && setVisitPatient(null)} />
        )}
      </div>
    );
  }

  const v = form.watch();
  const currentYear = new Date().getFullYear();

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <StepIndicator steps={STEPS} current={step} onStepClick={setStep} />
          <SaveIndicator />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other names (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-3 pt-1.5">
                      <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm has-data-checked:border-primary">
                        <RadioGroupItem value="M" /> Male
                      </label>
                      <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm has-data-checked:border-primary">
                        <RadioGroupItem value="F" /> Female
                      </label>
                    </RadioGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <DatePickerField
                        value={field.value}
                        disabled={dobUnknown}
                        placeholder="Select date of birth"
                        fromYear={1900}
                        toYear={currentYear}
                        disableAfter={endOfToday()}
                        className="font-clinical"
                        onChange={(iso) => field.onChange(iso)}
                      />
                    </FormControl>
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={dobUnknown}
                        onCheckedChange={(checked) => {
                          const isUnknown = checked === true;
                          form.setValue("dobUnknown", isUnknown, { shouldValidate: true });
                          if (isUnknown) field.onChange("");
                        }}
                      />
                      Don&apos;t know exact date
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {dobUnknown && (
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="font-clinical"
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ageUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="years">Years</SelectItem>
                            <SelectItem value="months">Months</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occupation (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} list="occupation-options" placeholder="Search occupation" />
                    </FormControl>
                    <datalist id="occupation-options">
                      {OCCUPATION_OPTIONS.map((o) => (
                        <option key={o} value={o} />
                      ))}
                    </datalist>
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="e.g. 024 123 4567" className="font-clinical" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="altPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternative phone (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="e.g. 024 123 4567" className="font-clinical" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GPS / digital address (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. GA-123-4567" className="font-clinical" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="town"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Town (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region (optional)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GHANA_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="sm:col-span-2 mt-2 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">Next of kin (optional)</p>
              </div>
              <FormField
                control={form.control}
                name="emergencyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyRelation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="e.g. 024 123 4567" className="font-clinical" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 2 && (
            <div className="max-w-md space-y-4">
              <FormField
                control={form.control}
                name="hasNhis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Does the patient have NHIS?</FormLabel>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm has-data-checked:border-primary">
                        <RadioGroupItem value="yes" /> Yes
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm has-data-checked:border-primary">
                        <RadioGroupItem value="no" /> No
                      </label>
                    </RadioGroup>
                  </FormItem>
                )}
              />

              {v.hasNhis === "yes" && (
                <NhisCheck
                  memberNumber={v.nhisNumber}
                  onMemberNumberChange={(value) => form.setValue("nhisNumber", value)}
                  onVerified={(result) => {
                    form.setValue("nhisStatus", result.status === "VERIFIED" ? "yes" : "no");
                    form.setValue("nhisExpiry", result.validUntil ?? "");
                  }}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="max-w-lg space-y-5">
              <div className="space-y-2">
                <Label>Known allergies</Label>
                <div className="flex gap-2">
                  <Input
                    value={newChip}
                    onChange={(e) => setNewChip(e.target.value)}
                    disabled={v.noKnownAllergies}
                    placeholder="e.g. Penicillin"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChip();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" disabled={!newChip.trim() || v.noKnownAllergies} onClick={addChip}>
                    Add
                  </Button>
                </div>
                {v.allergyChips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {v.allergyChips.map((chip, i) => (
                      <span key={`${chip}-${i}`} className="status-pill status-pill-error">
                        {chip}
                        <button type="button" onClick={() => removeChip(i)} aria-label={`Remove ${chip}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={v.noKnownAllergies}
                    onCheckedChange={(checked) => {
                      const value = checked === true;
                      form.setValue("noKnownAllergies", value, { shouldValidate: true });
                      if (value) form.setValue("allergyChips", [], { shouldValidate: true });
                    }}
                  />
                  No known allergies
                </label>
                {form.formState.errors.allergyChips && (
                  <p className="text-xs text-destructive">{form.formState.errors.allergyChips.message}</p>
                )}
              </div>

              <FormField
                control={form.control}
                name="bloodGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood group (optional)</FormLabel>
                    <Select
                      value={field.value || "__none__"}
                      onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BLOOD_GROUP_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value || "none"} value={opt.value || "__none__"}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <SummarySection title="Personal details" onEdit={() => setStep(0)}>
                <SummaryRow label="Name" value={[v.firstName, v.middleName, v.lastName].filter(Boolean).join(" ")} />
                <SummaryRow label="Sex" value={v.sex === "F" ? "Female" : "Male"} />
                <SummaryRow
                  label="Date of birth"
                  value={v.dobUnknown ? `${v.age || "—"} ${v.ageUnit} (approximate)` : v.dob || "—"}
                />
                <SummaryRow label="Occupation" value={v.occupation || "—"} />
              </SummarySection>

              <SummarySection title="Contact and next of kin" onEdit={() => setStep(1)}>
                <SummaryRow label="Phone" value={v.phone || "—"} />
                <SummaryRow label="Address" value={[v.address, v.town, v.region].filter(Boolean).join(", ") || "—"} />
                <SummaryRow label="Next of kin" value={v.emergencyName ? `${v.emergencyName} (${v.emergencyRelation || "—"})` : "—"} />
              </SummarySection>

              <SummarySection title="NHIS" onEdit={() => setStep(2)}>
                <SummaryRow label="Has NHIS" value={v.hasNhis === "yes" ? "Yes" : "No"} />
                {v.hasNhis === "yes" && <SummaryRow label="Member number" value={v.nhisNumber || "—"} />}
              </SummarySection>

              <SummarySection title="Health details" onEdit={() => setStep(3)}>
                <SummaryRow label="Allergies" value={v.noKnownAllergies ? "No known allergies" : v.allergyChips.join(", ")} />
                <SummaryRow label="Blood group" value={v.bloodGroup || "Not recorded"} />
              </SummarySection>

              {nextRefQuery.data?.patientPublicId && (
                <p className="text-sm text-muted-foreground">
                  Hospital number will be{" "}
                  <span className="font-clinical font-medium text-foreground">{nextRefQuery.data.patientPublicId}</span>.
                </p>
              )}

              <FormField
                control={form.control}
                name="registrationConsentAcknowledged"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-muted/30 p-3 text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5"
                      />
                      <span>The patient agreed to have their details recorded.</span>
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={handleContinue} disabled={checkingDuplicates}>
              {checkingDuplicates ? "Checking…" : "Continue"}
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Saving…" : "Save patient"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

function SummarySection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <button type="button" onClick={onEdit} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}
