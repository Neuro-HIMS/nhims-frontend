import { z } from "zod";

/**
 * Registration is one form validated in steps (StepIndicator), not five
 * separate schemas — each step just triggers a subset of these fields.
 * No zod `.default()` here: react-hook-form's `defaultValues` already covers
 * every field, and mixing the two makes the resolver's input/output types
 * diverge and stop lining up with `useForm`.
 */
export const patientRegistrationSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter a first name"),
    middleName: z.string().trim(),
    lastName: z.string().trim().min(1, "Enter a last name"),
    // Starts unselected ("") so the officer must actively pick one — never default to a sex.
    sex: z.enum(["", "M", "F"]),
    dob: z.string().trim(),
    dobUnknown: z.boolean(),
    age: z.string().trim(),
    ageUnit: z.enum(["months", "years"]),
    occupation: z.string().trim(),

    // Not required to save (REC-02's done-when list is sex, name, DOB/age, allergy answer,
    // consent only) — common for children or elderly patients with no phone of their own.
    phone: z.string().trim().regex(/^[0-9+\s-]*$/, "Use numbers only for the phone number"),
    altPhone: z.string().trim(),
    address: z.string().trim(),
    town: z.string().trim(),
    region: z.string().trim(),
    emergencyName: z.string().trim(),
    emergencyRelation: z.string().trim(),
    emergencyPhone: z.string().trim(),

    hasNhis: z.enum(["yes", "no"]),
    nhisNumber: z.string().trim(),
    nhisStatus: z.enum(["yes", "no"]),
    nhisExpiry: z.string().trim(),

    allergyChips: z.array(z.string()),
    noKnownAllergies: z.boolean(),
    bloodGroup: z.string().trim(),

    registrationConsentAcknowledged: z.boolean(),
  })
  .refine((data) => data.sex === "M" || data.sex === "F", {
    message: "Choose the patient's sex",
    path: ["sex"],
  })
  .refine((data) => (data.dobUnknown ? data.age.trim().length > 0 : data.dob.trim().length > 0), {
    message: "Enter a date of birth, or say you don't know it and give an age",
    path: ["dob"],
  })
  .refine((data) => data.noKnownAllergies || data.allergyChips.length > 0, {
    message: "Add at least one allergy, or confirm there are none known",
    path: ["allergyChips"],
  })
  .refine((data) => data.registrationConsentAcknowledged, {
    message: "The patient (or guardian) must consent before you can save",
    path: ["registrationConsentAcknowledged"],
  });

export type PatientRegistrationInput = z.infer<typeof patientRegistrationSchema>;

/** Fields each StepIndicator step must pass before "Continue" is enabled. */
export const REGISTRATION_STEP_FIELDS = [
  ["firstName", "lastName", "sex", "dob", "occupation"],
  ["phone", "address", "town", "region", "emergencyName", "emergencyRelation", "emergencyPhone"],
  ["hasNhis", "nhisNumber"],
  ["allergyChips", "bloodGroup"],
  ["registrationConsentAcknowledged"],
] as const satisfies readonly (keyof PatientRegistrationInput)[][];
