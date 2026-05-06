"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { AppointmentBookingForm } from "@/components/appointments/appointment-booking-form";
import { PatientResultCard } from "@/components/records/views/patient-result-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { patientSummaryToLegacyPatient } from "@/lib/patient-mapper";
import { patientsService } from "@/services/patients.service";
import type { PatientSummaryDto } from "@/types/patients.types";

export function BookView() {
  const searchParams = useSearchParams();
  const initialPublicId = (searchParams.get("patientPublicId") ?? "").trim();

  const [query, setQuery] = useState(initialPublicId);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PatientSummaryDto[]>([]);
  const [selected, setSelected] = useState<PatientSummaryDto | null>(null);

  const selectedLegacy = useMemo(
    () => (selected ? patientSummaryToLegacyPatient(selected) : null),
    [selected],
  );

  useEffect(() => {
    if (!initialPublicId) return;
    void doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearch() {
    const q = query.trim();
    if (!q) {
      toast.error("Enter a patient ID");
      return;
    }
    setIsSearching(true);
    try {
      const data = await patientsService.search({ mode: "id", q });
      setResults(data);
      if (data.length === 1) {
        setSelected(data[0]);
      }
      if (data.length === 0) {
        setSelected(null);
        toast.error("No patient found with that ID");
      }
    } catch {
      toast.error("Patient lookup failed");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Book appointment</CardTitle>
          <CardDescription>
            Search the patient, then book from the finance service catalog so downstream billing uses the same canonical service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Patient Public ID (e.g. FAC-00001234-26)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-md font-clinical"
            />
            <Button type="button" onClick={doSearch} disabled={isSearching}>
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
                  selected={selected?.id === r.id}
                  onSelect={() => setSelected(r)}
                  showBookButton={false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && selectedLegacy && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking details</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentBookingForm patient={selectedLegacy} patientId={selected.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
