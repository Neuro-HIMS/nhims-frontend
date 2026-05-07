/** IPD ward board — mirrors {@link com.nero.hims.ipd.api.dto.IpdBoardDto}. */

export interface NursingTaskStubDto {
  id: string;
  label: string;
  status: string;
  admissionId: string;
  patientName: string;
  detail: string;
}

export interface IpdNursingOverviewDto {
  marTasks: NursingTaskStubDto[];
  tprTasks: NursingTaskStubDto[];
  notice: string;
}

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
