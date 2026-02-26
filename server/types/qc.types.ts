/**
 * 质控引擎相关类型定义
 */

import { NlpResult } from './nlp.types';
import type { QcRule } from './rule.types';
export type { QcRule };

// ============ 基础类型 ============

export type QcMode = 'fast' | 'standard' | 'comprehensive' | 'ai';

export type IssueSeverity = 'minor' | 'major' | 'critical';

export type IssueType = 
  | 'completeness'
  | 'timeliness'
  | 'consistency'
  | 'formatting'
  | 'logic'
  | 'diagnosis'
  | 'medication_safety';

// ============ 医疗记录 ============

export type MedicalRecord = {
  id: number;
  content: string;
  patientName: string;
  recordType?: string;
  admissionDate?: Date;
  dischargeDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  type?: 'outpatient' | 'inpatient' | 'admission' | 'discharge' | 'consultation' | 'operation';
};

// QcRule is imported from rule.types.ts to avoid duplicate exports

// ============ 质控问题 ============

export type QcIssue = {
  id?: string;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  suggestion?: string;
  timestamp?: Date;
  ruleId?: string;
  ruleName?: string;
};

// ============ 质控结果 ============

export type QcResult = {
  recordId?: number;
  totalScore: number;
  overallScore?: number;
  status?: 'pass' | 'pass_with_warning' | 'fail';
  scores?: Record<string, number>;
  issues: QcIssue[];
  mode?: QcMode;
  timestamp: Date;
  details?: {
    completenessScore?: number;
    timelinessScore?: number;
    consistencyScore?: number;
    formattingScore?: number;
    logicScore?: number;
    diagnosisScore?: number;
    medicationSafetyScore?: number;
  };
  nlpResult?: NlpResult;
};

// ============ QC Checker 接口 ============

export interface IQcChecker {
  name: string;
  check(
    record: MedicalRecord,
    nlpResult: NlpResult,
    rules: QcRule[]
  ): Promise<QcIssue[]>;
}

// ============ QC Engine 配置 ============

export type QcEngineConfig = {
  mode: QcMode;
  rules?: QcRule[];
  checkers?: string[]; // checker 名称列表
  weights?: {
    completeness?: number;
    timeliness?: number;
    consistency?: number;
    formatting?: number;
    logic?: number;
    diagnosis?: number;
    medicationSafety?: number;
  };
  thresholds?: {
    passScore?: number;
    warningScore?: number;
  };
};

// ============ 检查器类型 ============

/**
 * 完整性检查器
 * 检查病历是否包含所有必需的段落和信息
 */
export type CompletenessCheckResult = {
  missingFields: string[];
  missingValues: string[];
  score: number;
};

/**
 * 时限性检查器
 * 检查病历是否在规定时限内完成
 */
export type TimelinessCheckResult = {
  overdueDays: number;
  deadline: Date;
  isOverdue: boolean;
  score: number;
};

/**
 * 一致性检查器
 * 检查诊断、检查结果、用药之间的逻辑一致性
 */
export type ConsistencyCheckResult = {
  inconsistencies: Array<{
    field1: string;
    field2: string;
    issue: string;
  }>;
  score: number;
};

/**
 * 格式检查器
 * 检查病历的格式是否规范
 */
export type FormattingCheckResult = {
  formatErrors: Array<{
    field: string;
    expectedFormat: string;
    actualValue: string;
  }>;
  score: number;
};

/**
 * 逻辑检查器
 * 检查病历中的逻辑是否合理
 */
export type LogicCheckResult = {
  logicErrors: Array<{
    issue: string;
    severity: IssueSeverity;
  }>;
  score: number;
};

/**
 * 诊断内涵检查器
 * 检查诊断编码和描述的准确性
 */
export type DiagnosisCheckResult = {
  diagnosisErrors: Array<{
    diagnosis: string;
    error: string;
    severity: IssueSeverity;
  }>;
  score: number;
};

/**
 * 用药安全检查器
 * 检查用药是否安全，包括剂量、禁忌、相互作用等
 */
export type MedicationSafetyCheckResult = {
  safetyIssues: Array<{
    medication: string;
    issue: string;
    severity: IssueSeverity;
  }>;
  score: number;
};

// ============ 质控模式定义 ============

export type FastQcConfig = {
  mode: 'fast';
  enabledCheckers: ['completeness', 'formatting'];
};

export type StandardQcConfig = {
  mode: 'standard';
  enabledCheckers: ['completeness', 'timeliness', 'consistency', 'formatting', 'logic'];
};

export type ComprehensiveQcConfig = {
  mode: 'comprehensive';
  enabledCheckers: ['completeness', 'timeliness', 'consistency', 'formatting', 'logic', 'diagnosis', 'medication_safety'];
};

export type AiQcConfig = {
  mode: 'ai';
  enabledCheckers: ['completeness', 'timeliness', 'consistency', 'formatting', 'logic', 'diagnosis', 'medication_safety'];
  useAiValidation: boolean;
};

// ============ 质控统计 ============

export type QcStatistics = {
  totalRecords: number;
  qualifiedRecords: number;
  qualificationRate: number;
  averageScore: number;
  issueDistribution: Record<IssueType, number>;
  severityDistribution: Record<IssueSeverity, number>;
  departmentComparison?: Record<string, {
    totalRecords: number;
    qualifiedRecords: number;
    qualificationRate: number;
  }>;
};

// ============ 质控报告 ============

export type QcReport = {
  recordId: number;
  qcResult: QcResult;
  statistics: QcStatistics;
  recommendations: string[];
  generatedAt: Date;
};

// ============ 质控错误 ============

export type QcError = {
  checker: string;
  message: string;
  severity: 'warning' | 'error';
  context?: any;
};
