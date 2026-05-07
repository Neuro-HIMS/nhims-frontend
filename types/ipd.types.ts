/** IPD ward board — mirrors {@link com.nero.hims.ipd.api.dto.IpdBoardDto}. */

export interface IpdBoardDto {
  wards: WardBoardDto[];
}

export interface WardBoardDto {
  id: string;
  name: string;
  code: string;
  beds: BedBoardDto[];
}

export interface BedBoardDto {
  id: string;
  label: string;
  occupied: boolean;
  activeAdmissionId: string | null;
  patientName: string;
  patientPublicId: string;
}
