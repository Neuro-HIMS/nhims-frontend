"use client";

import { useQuery } from "@tanstack/react-query";
import { FileImage } from "lucide-react";

import { cleanPersonName } from "@/lib/display-name";
import { formatClinicalDateTime } from "@/lib/dates";
import { parseReport } from "@/lib/imaging";
import { imagingService } from "@/services/imaging.service";
import type { RadiologyOrderDto } from "@/types/clinical.types";

/** Read-only imaging report — the same for the doctor (DOC-08) and imaging (RAD-04). */
export function ImagingReport({ order }: { order: RadiologyOrderDto }) {
  const sections = parseReport(order.reportText);
  const filesQuery = useQuery({
    queryKey: ["imaging", "attachments", order.id],
    queryFn: () => imagingService.attachments(order.id),
    staleTime: 60_000,
  });
  const files = filesQuery.data ?? [];

  return (
    <div className="space-y-3">
      <Section title="Findings" text={sections.findings} />
      <Section title="Impression" text={sections.impression} />
      <Section title="Recommendations" text={sections.recommendations} />
      {files.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Images and files</p>
          <ul className="flex flex-wrap gap-2">
            {files.map((f) => (
              <li key={f.id}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-accent hover:underline"
                >
                  <FileImage className="h-3.5 w-3.5" aria-hidden="true" /> {f.fileName}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Reported by {cleanPersonName(order.reportedByName) || "imaging staff"}
        {order.completedAt ? ` · ${formatClinicalDateTime(order.completedAt)}` : ""}
      </p>
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <p className="mt-0.5 text-sm whitespace-pre-line text-foreground">{text}</p>
    </div>
  );
}
