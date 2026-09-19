"use client";

import { Trash2 } from "lucide-react";

import { UploadDropzone } from "@/components/common/upload-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { FacilityProfile } from "@/types/facility.types";

interface FacilityProfileViewProps {
  profile: FacilityProfile;
  logoDisplayUrl: string | null;
  onProfileChange: (next: FacilityProfile) => void;
  onLogoFile: (file: File) => void;
  onClearLogo: () => void;
}

export function FacilityProfileView({
  profile,
  logoDisplayUrl,
  onProfileChange,
  onLogoFile,
  onClearLogo,
}: FacilityProfileViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
          <CardDescription>Your facility&apos;s official name, code and level.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput
              label="Facility name"
              value={profile.facilityName}
              onChange={(value) => onProfileChange({ ...profile, facilityName: value })}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Facility code</p>
              <Input
                value={profile.facilityCode}
                maxLength={20}
                className="font-clinical uppercase"
                onChange={(event) =>
                  onProfileChange({
                    ...profile,
                    facilityCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  })
                }
                spellCheck={false}
                autoCapitalize="characters"
              />
              <p className="text-xs text-muted-foreground">
                Shows on patient hospital numbers and reports. Changing it only affects new numbers from now on.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledSelect
              label="Facility level"
              value={profile.facilityLevel}
              onValueChange={(value) => onProfileChange({ ...profile, facilityLevel: value as FacilityProfile["facilityLevel"] })}
              options={[
                { label: "Primary", value: "PRIMARY" },
                { label: "Secondary", value: "SECONDARY" },
                { label: "Tertiary", value: "TERTIARY" },
              ]}
            />
            <LabeledSelect
              label="Ownership"
              value={profile.ownershipType}
              onValueChange={(value) => onProfileChange({ ...profile, ownershipType: value as FacilityProfile["ownershipType"] })}
              options={[
                { label: "Public", value: "PUBLIC" },
                { label: "Private", value: "PRIVATE" },
                { label: "Mission", value: "MISSION" },
              ]}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput label="Region" value={profile.region} onChange={(value) => onProfileChange({ ...profile, region: value })} />
            <LabeledInput label="District" value={profile.district} onChange={(value) => onProfileChange({ ...profile, district: value })} />
          </div>

          <div className="rounded-xl border border-border bg-surface-muted p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">About this facility</p>
            <div className="space-y-3">
              <FlagCheckbox
                label="Teaching hospital"
                description="Trains medical students and junior staff here."
                checked={profile.isTeachingHospital}
                onCheckedChange={(checked) => onProfileChange({ ...profile, isTeachingHospital: checked })}
              />
              <Separator />
              <FlagCheckbox
                label="Referral center"
                description="Accepts patients referred from other facilities."
                checked={profile.isReferralCenter}
                onCheckedChange={(checked) => onProfileChange({ ...profile, isReferralCenter: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
          <CardDescription>Shown next to your facility name in the header, once saved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logoDisplayUrl && (
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element -- preview data URLs and API logos */}
                <img src={logoDisplayUrl} alt="Facility logo preview" className="h-full w-full object-cover" />
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={onClearLogo}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remove logo
              </Button>
            </div>
          )}
          <UploadDropzone accept="image/*" maxSizeMb={0.2} onFile={onLogoFile} helperText="PNG or JPEG, up to 200 KB" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
          <CardDescription>How patients and NHIS reach your facility.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Address</p>
            <Textarea
              value={profile.address}
              onChange={(event) => onProfileChange({ ...profile, address: event.target.value })}
              className="min-h-24"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput
              label="Phone"
              value={profile.phone}
              placeholder="e.g. 024 123 4567"
              onChange={(value) => onProfileChange({ ...profile, phone: value })}
            />
            <LabeledInput
              label="Email"
              type="email"
              value={profile.email}
              placeholder="e.g. info@facility.gov.gh"
              onChange={(value) => onProfileChange({ ...profile, email: value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FlagCheckbox({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-transparent px-1 py-1 hover:bg-muted/50">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function LabeledInput({
  label,
  value,
  type = "text",
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
