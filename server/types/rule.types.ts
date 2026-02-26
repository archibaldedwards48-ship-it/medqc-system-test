/**
 * 规则库相关类型定义
 */

// ============ 规则类型 ============

export type RuleCategory = 
  | 'completeness'
  | 'timeliness'
  | 'consistency'
  | 'formatting'
  | 'logic'
  | 'diagnosis'
  | 'medication_safety'
  | 'critical_value'
  | 'drug_interaction'
  | 'diagnosis_rule'
  | 'other';

export type RuleSeverity = 'minor' | 'major' | 'critical';

export type RuleStatus = 'active' | 'inactive' | 'archived' | 'draft' | 'pending_review';

// ============ 规则定义 ============

export type QcRule = {
  id?: number;
  ruleId: string; // 唯一标识，如 'rule_001'
  name: string;
  description?: string;
  category: RuleCategory;
  severity: RuleSeverity;
  condition: string; // 规则条件（可以是表达式或自然语言）
  status: RuleStatus;
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: number; // 用户 ID
  updatedBy?: number;
};

// ============ 规则条件 ============

export type RuleCondition = {
  type: 'field_missing' | 'field_invalid' | 'field_inconsistent' | 'value_out_of_range' | 'custom_expression';
  field?: string;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains' | 'matches' | 'custom';
  value?: any;
  expression?: string; // 自定义表达式
};

// ============ 规则执行结果 ============

export type RuleExecutionResult = {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: RuleSeverity;
  message: string;
  details?: any;
  timestamp: Date;
};

// ============ 规则库版本 ============

export type RuleLibraryVersion = {
  id?: number;
  version: string; // 版本号，如 'v1.0.0'
  releaseDate: Date;
  description?: string;
  ruleCount: number;
  status: 'draft' | 'released' | 'archived';
  createdBy?: number;
  createdAt?: Date;
};

// ============ 规则库快照 ============

export type RuleLibrarySnapshot = {
  id?: number;
  version: string;
  rules: QcRule[];
  metadata?: {
    totalRules: number;
    categoryCounts: Record<RuleCategory, number>;
    severityCounts: Record<RuleSeverity, number>;
  };
  createdAt?: Date;
};

// ============ 规则变更历史 ============

export type RuleChangeHistory = {
  id?: number;
  ruleId: string;
  changeType: 'created' | 'updated' | 'deleted' | 'status_changed';
  oldValue?: any;
  newValue?: any;
  changedBy?: number;
  changedAt?: Date;
  reason?: string;
};

// ============ 规则分析 ============

export type RuleAnalytics = {
  ruleId: string;
  ruleName: string;
  totalExecutions: number;
  passCount: number;
  failCount: number;
  passRate: number;
  averageExecutionTime: number; // 毫秒
  lastExecutedAt?: Date;
  mostCommonFailureMessage?: string;
};

// ============ 规则导入/导出 ============

export type RuleImportData = {
  version: string;
  rules: Array<{
    ruleId: string;
    name: string;
    description?: string;
    category: RuleCategory;
    severity: RuleSeverity;
    condition: string;
    status?: RuleStatus;
  }>;
};

export type RuleExportData = {
  exportDate: Date;
  exportedBy?: number;
  version: string;
  totalRules: number;
  rules: QcRule[];
};

// ============ 规则验证 ============

export type RuleValidationResult = {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
  }>;
};

// ============ 规则建议 ============

export type RuleSuggestion = {
  id?: number;
  ruleId?: string;
  suggestion: string;
  category: 'improvement' | 'bug_fix' | 'optimization' | 'new_rule';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'under_review' | 'accepted' | 'rejected';
  submittedBy?: number;
  submittedAt?: Date;
  reviewedBy?: number;
  reviewedAt?: Date;
  reviewComments?: string;
};

// ============ 规则冲突检测 ============

export type RuleConflict = {
  rule1Id: string;
  rule2Id: string;
  conflictType: 'contradictory' | 'overlapping' | 'redundant';
  description: string;
  severity: 'warning' | 'error';
};

// ============ 规则性能指标 ============

export type RulePerformanceMetrics = {
  totalRules: number;
  activeRules: number;
  averageExecutionTime: number; // 毫秒
  slowestRule?: {
    ruleId: string;
    executionTime: number;
  };
  fastestRule?: {
    ruleId: string;
    executionTime: number;
  };
  mostTriggeredRule?: {
    ruleId: string;
    triggerCount: number;
  };
  leastTriggeredRule?: {
    ruleId: string;
    triggerCount: number;
  };
};

// ============ 规则库配置 ============

export type RuleLibraryConfig = {
  enableAutoUpdate: boolean;
  updateCheckInterval: number; // 小时
  maxRuleCount: number;
  maxVersionHistory: number;
  enableRuleConflictDetection: boolean;
  enableRulePerformanceMonitoring: boolean;
  defaultSeverityMapping: Record<RuleCategory, RuleSeverity>;
};
