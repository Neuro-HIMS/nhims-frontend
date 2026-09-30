import type { LabParameter } from "@/lib/lab-results";

/**
 * Suggested measurements and adult/child reference ranges for the tests the facility
 * already lists (by service code). Typical Ghanaian teaching-hospital values — every lab
 * must check them against its own analyser before relying on them (the Tests and
 * settings screen says so). Keyed by service code, falling back to a name match.
 */
export const LAB_PARAMETER_FIXTURES: Record<string, { sampleType: string; parameters: LabParameter[] }> = {
  "LAB-CBC": {
    sampleType: "Whole blood (EDTA)",
    parameters: [
      {
        name: "Haemoglobin",
        unit: "g/dL",
        kind: "number",
        ranges: [
          { fromAge: 0, toAge: 1 / 12, low: 14, high: 22 },
          { fromAge: 1 / 12, toAge: 1, low: 10, high: 14 },
          { fromAge: 1, toAge: 12, low: 11, high: 14.5 },
          { sex: "M", fromAge: 12, low: 13, high: 17 },
          { sex: "F", fromAge: 12, low: 12, high: 15 },
        ],
        criticalLow: 7,
        criticalHigh: 24,
      },
      {
        name: "White cell count",
        unit: "×10⁹/L",
        kind: "number",
        ranges: [{ fromAge: 0, toAge: 12, low: 5, high: 15 }, { fromAge: 12, low: 4, high: 11 }],
        criticalLow: 2,
        criticalHigh: 30,
      },
      { name: "Platelets", unit: "×10⁹/L", kind: "number", ranges: [{ low: 150, high: 400 }], criticalLow: 50, criticalHigh: 1000 },
      {
        name: "Haematocrit",
        unit: "%",
        kind: "number",
        ranges: [
          { fromAge: 0, toAge: 1 / 12, low: 42, high: 65 },
          { fromAge: 1 / 12, toAge: 12, low: 33, high: 45 },
          { sex: "M", fromAge: 12, low: 40, high: 52 },
          { sex: "F", fromAge: 12, low: 36, high: 46 },
        ],
      },
    ],
  },
  "LAB-FBS": {
    sampleType: "Whole blood (fluoride)",
    parameters: [{ name: "Fasting glucose", unit: "mmol/L", kind: "number", ranges: [{ low: 3.9, high: 5.5 }], criticalLow: 2.5, criticalHigh: 25 }],
  },
  "LAB-RBS": {
    sampleType: "Whole blood (fluoride)",
    parameters: [{ name: "Random glucose", unit: "mmol/L", kind: "number", ranges: [{ low: 3.9, high: 7.8 }], criticalLow: 2.5, criticalHigh: 25 }],
  },
  "LAB-MAL": {
    sampleType: "Whole blood (capillary)",
    parameters: [{ name: "Malaria RDT", unit: "", kind: "choice", choices: ["Negative", "Positive", "Invalid — repeat"], abnormalChoices: ["Positive"] }],
  },
  "LAB-HIV": {
    sampleType: "Whole blood",
    parameters: [{ name: "HIV screening", unit: "", kind: "choice", choices: ["Non-reactive", "Reactive", "Indeterminate"], abnormalChoices: ["Reactive", "Indeterminate"] }],
  },
  "LAB-HEPB": {
    sampleType: "Serum",
    parameters: [{ name: "Hepatitis B surface antigen", unit: "", kind: "choice", choices: ["Negative", "Positive"], abnormalChoices: ["Positive"] }],
  },
  "LAB-PT": {
    sampleType: "Urine",
    parameters: [{ name: "Pregnancy test", unit: "", kind: "choice", choices: ["Negative", "Positive"] }],
  },
  "LAB-URINE": {
    sampleType: "Urine (mid-stream)",
    parameters: [
      { name: "Protein", unit: "", kind: "choice", choices: ["Negative", "Trace", "+", "++", "+++"], abnormalChoices: ["+", "++", "+++"] },
      { name: "Glucose", unit: "", kind: "choice", choices: ["Negative", "Trace", "+", "++", "+++"], abnormalChoices: ["+", "++", "+++"] },
      { name: "Blood", unit: "", kind: "choice", choices: ["Negative", "Trace", "+", "++", "+++"], abnormalChoices: ["+", "++", "+++"] },
      { name: "pH", unit: "", kind: "number", ranges: [{ low: 4.5, high: 8 }] },
      { name: "Microscopy", unit: "", kind: "text" },
    ],
  },
  "LAB-STOOL": {
    sampleType: "Stool",
    parameters: [
      { name: "Appearance", unit: "", kind: "text" },
      { name: "Ova / cysts / parasites", unit: "", kind: "choice", choices: ["None seen", "Seen"], abnormalChoices: ["Seen"] },
      { name: "Microscopy notes", unit: "", kind: "text" },
    ],
  },
  "LAB-WIDAL": {
    sampleType: "Serum",
    parameters: [
      { name: "S. Typhi O", unit: "titre", kind: "choice", choices: ["< 1:80", "1:80", "1:160", "1:320"], abnormalChoices: ["1:160", "1:320"] },
      { name: "S. Typhi H", unit: "titre", kind: "choice", choices: ["< 1:80", "1:80", "1:160", "1:320"], abnormalChoices: ["1:160", "1:320"] },
    ],
  },
};
