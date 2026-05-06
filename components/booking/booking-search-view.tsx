"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { BookingFormDialog } from "@/components/booking/booking-form-dialog";
import { PatientResultCard } from "@/components/records/views/patient-result-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { patientSummaryToLegacyPatient } from "@/lib/patient-mapper";
import { patientsService } from "@/services/patients.service";
import type { PatientSummaryDto } from "@/types/patients.types";

/**
 * The Book tab landing view. Search renders the results list only —
 * the booking detail UI is no longer drawn inline. Clicking a patient
 * opens the booking form in a modal pop-up so the workspace stays at
 * "search results" until the operator commits to a patient.
 */
export function BookingSearchView() {
  const searchParams = useSearchParams();
  const initialPublicId = (searchParams.get("patientPublicId") ?? "").trim();

  const [query, setQuery] = useState(initialPublicId);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PatientSummaryDto[]>([]);
  const [selected, setSelected] = useState<PatientSummaryDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!initialPublicId) return;
    void doSearch(initialPublicId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearch(forced?: string) {
    const q = (forced ?? query).trim();
    if (!q) {
      toast.error("Enter a patient ID");
      return;
    }
    setIsSearching(true);
    try {
      const data = await patientsService.search({ mode: "id", q });
      setResults(data);
      if (data.length === 0) {
        toast.error("No patient found with that ID");
      }
    } catch {
      toast.error("Patient lookup failed");
    } finally {
      setIsSearching(false);
    }
  }

  function openBookingFor(p: PatientSummaryDto) {
    setSelected(p);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Book appointment</CardTitle>
          <CardDescription>
            Search the patient and select a result to open the booking form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Patient Public ID (e.g. FAC-00001234-26)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              className="max-w-md font-clinical"
            />
            <Button type="button" onClick={() => doSearch()} disabled={isSearching}>
              <Search className="mr-1.5 h-4 w-4" />
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => (
                <PatientResultCard
                  key={r.id}
                  patient={patientSummaryToLegacyPatient(r)}
                  onSelect={() => openBookingFor(r)}
                  showBookButton={false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BookingFormDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setSelected(null);
        }}
        patient={selected ? patientSummaryToLegacyPatient(selected) : null}
        patientId={selected?.id ?? null}
      />
    </div>
  );
}
