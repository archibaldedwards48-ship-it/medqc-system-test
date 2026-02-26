/**
 * Server-side type exports barrel file.
 * These types are for server-internal use (NLP pipeline, QC engine, rule library).
 * Shared types (used by both client and server) are in shared/types.ts.
 * 
 * Note: Some types (QcMode, IssueSeverity, IssueType) exist in both qc.types.ts
 * and shared/types.ts. The server-side versions are used within the engine;
 * the shared versions are used in API contracts.
 */
export * from "./nlp.types";
export {
  // Re-export qc.types excluding names that conflict with rule.types
  type QcMode as QcEngineMode,
  type IssueSeverity as QcIssueSeverity,
  type IssueType as QcIssueType,
  type MedicalRecord as QcMedicalRecord,
  type QcIssue as QcEngineIssue,
  type QcResult as QcEngineResult,
  type IQcChecker,
  type QcEngineConfig,
  type CompletenessCheckResult,
  type TimelinessCheckResult,
  type ConsistencyCheckResult,
  type FormattingCheckResult,
  type LogicCheckResult,
  type DiagnosisCheckResult,
  type MedicationSafetyCheckResult,
  type FastQcConfig,
  type StandardQcConfig,
  type ComprehensiveQcConfig,
  type AiQcConfig,
  type QcStatistics,
  type QcReport,
  type QcError,
} from "./qc.types";
export * from "./rule.types";
