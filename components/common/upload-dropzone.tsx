"use client";

import { useRef, useState } from "react";

import { Illustration } from "@/components/common/illustrations";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  /** e.g. "image/*" or ".csv,.xlsx" */
  accept: string;
  maxSizeMb: number;
  onFile: (file: File) => void;
  /** e.g. "PNG or JPEG, up to 5 MB" */
  helperText: string;
  errorText?: string;
  disabled?: boolean;
}

/** Light-grey upload box — click or drag a file (design brief §2.7/§2.9). */
export function UploadDropzone({ accept, maxSizeMb, onFile, helperText, errorText, disabled }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`This file is too large. Choose a file under ${maxSizeMb} MB.`);
      return;
    }
    setLocalError(null);
    onFile(file);
  }

  const error = errorText ?? localError;

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-surface-muted px-6 py-8 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
          error && "border-destructive bg-error-bg",
          !dragging && !error && "border-border hover:bg-muted",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Illustration name="upload" />
        <p className="text-sm text-foreground">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">{helperText}</p>
      </button>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
