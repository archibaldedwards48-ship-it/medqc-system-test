/**
 * Unified type exports for MedQC system.
 * Import shared types from this single entry point.
 */

// Re-export Drizzle schema types (platform convention)
export type * from "../drizzle/schema";
export * from "./_core/errors";

// ============ Record Types ============

export type RecordType = "outpatient" | "inpatient" | "admission" | "discharge" | "consultation" | "operation";

// ============ QC Types ============

export type QcMode = "fast" | "standard" | "comprehensive" | "ai";
export type IssueSeverity = "minor" | "major" | "critical";
export type IssueType =
  | "completeness"
  | "timeliness"
  | "consistency"
  | "formatting"
  | "logic"
  | "diagnosis"
  | "medication_safety";

// ============ Input Types ============

export type CreateMedicalRecordInput = {
  patientName: string;
  recordType: RecordType;
  content: string;
  parsedContent?: string;
  fileName?: string;
  doctorId?: number;
  departmentId?: number;
  admissionDate?: Date;
  dischargeDate?: Date;
};

export type UpdateMedicalRecordInput = Partial<CreateMedicalRecordInput>;

export type CreateQcResultInput = {
  medicalRecordId: number;
  qcStaffId: number;
  qcMode: QcMode;
  totalScore: string;
  isQualified: boolean;
};

export type CreateQcIssueInput = {
  qcResultId: number;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  suggestion?: string;
  ruleId?: string;
};

export type CreateSpotCheckInput = {
  medicalRecordId: number;
  qcStaffId: number;
  qcMode: QcMode;
  totalScore: string;
  isQualified: boolean;
  issues?: CreateQcIssueInput[];
};

export type CreateQcRuleInput = {
  ruleId: string;
  name: string;
  description?: string;
  category: string;
  severity: IssueSeverity;
  condition: string;
  status?: "active" | "inactive" | "archived";
};

export type UpdateQcRuleInput = Partial<CreateQcRuleInput>;

export type CreateTerminologyMappingInput = {
  abbreviation: string;
  fullName: string;
  category: string;
};

export type CreateQcConfigInput = {
  configType: string;
  configKey: string;
  configValue: string;
  description?: string;
  status?: "active" | "inactive";
};

export type UpdateQcConfigInput = Partial<Omit<CreateQcConfigInput, "configType" | "configKey">>;

export type CreateMedicalTerminologyInput = {
  term: string;
  standardName: string;
  category: string;
  description?: string;
  synonyms?: string[];
};

export type CreateDrugInput = {
  drugName: string;
  genericName?: string;
  category?: string;
  maxDailyDose?: string;
  unit?: string;
  contraindications?: string[];
  interactions?: string[];
  sideEffects?: string[];
};

export type CreateAuditLogInput = {
  userId: number;
  action: string;
  entityType: string;
  entityId?: number;
  changes?: any;
};

export type CreateStatisticsInput = {
  date: Date;
  totalRecords: number;
  qualifiedRecords: number;
  averageScore: number;
  departmentId?: number;
};

// ============ API Response Types ============

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  total: number;
  limit: number;
  offset: number;
};

// ============ Pagination & Filter ============

export type PaginationParams = {
  limit?: number;
  offset?: number;
};

export type MedicalRecordFilter = {
  recordType?: RecordType;
  doctorId?: number;
  departmentId?: number;
  patientName?: string;
  dateFrom?: Date;
  dateTo?: Date;
} & PaginationParams;

export type QcResultFilter = {
  qcMode?: QcMode;
  qcStaffId?: number;
  medicalRecordId?: number;
  isQualified?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
} & PaginationParams;

export type QcRuleFilter = {
  category?: string;
  status?: "active" | "inactive" | "archived";
  severity?: IssueSeverity;
} & PaginationParams;
