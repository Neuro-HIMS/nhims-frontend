export interface ReportDefinitionDto {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  routePath: string;
}

export interface ReportIndicatorDto {
  code: string;
  label: string;
  value: number | null;
  category: string;
}

export interface ReportMetricDto {
  code: string;
  label: string;
  value: number | null;
  note: string | null;
}

export interface ReportRunDhims2Dto {
  month: string;
  periodLabel: string;
  indicators: ReportIndicatorDto[];
}

export interface ReportRunMonthlyDto {
  month: string;
  periodLabel: string;
  metrics: ReportMetricDto[];
}
