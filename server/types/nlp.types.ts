/**
 * NLP Pipeline 相关类型定义
 */

// ============ 基础类型 ============

export type SectionInfo = {
  content: string;
  startIndex: number;
  endIndex: number;
};

export type Entity = {
  text: string;
  type: 'medication' | 'diagnosis' | 'lab_result' | 'procedure' | 'symptom' | 'vital_sign' | 'other';
  startIndex: number;
  endIndex: number;
  confidence: number;
};

export type Relationship = {
  type: 'medication_dosage' | 'diagnosis_symptom' | 'lab_result_reference' | 'procedure_indication' | 'other';
  entity1: Entity;
  entity2: Entity;
  confidence: number;
};

export type Indicator = {
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  severity?: 'minor' | 'major' | 'critical';
};

// ============ NLP 处理结果 ============

export type NlpResult = {
  sectionMap: Map<string, SectionInfo>;
  indicators: Indicator[];
  entities: Entity[];
  relationships: Relationship[];
  confidence: number;
};

// ============ NLP Pipeline 阶段 ============

/**
 * Stage 1: 段落索引
 * 识别病历中的主要段落（主诉、现病史、既往史等）
 */
export type ParagraphIndexingResult = {
  sections: Map<string, SectionInfo>;
  confidence: number;
};

/**
 * Stage 2: 语义断路器
 * 识别段落之间的逻辑关系和断路点
 */
export type SemanticCircuitBreakerResult = {
  sections: Map<string, SectionInfo>;
  breakpoints: Array<{
    position: number;
    type: 'section_boundary' | 'logical_break' | 'emphasis_mark';
  }>;
  confidence: number;
};

/**
 * Stage 3: 指标提取
 * 从文本中提取医学指标（血压、血糖等）
 */
export type MetricExtractionResult = {
  indicators: Indicator[];
  entities: Entity[];
  confidence: number;
};

/**
 * Stage 4: 零锚点处理
 * 处理没有明确参考值的指标
 */
export type ZeroAnchorProcessingResult = {
  indicators: Indicator[];
  normalizedIndicators: Indicator[];
  confidence: number;
};

/**
 * Stage 5: 医学校验
 * 验证提取的信息是否符合医学常识
 */
export type MedicalValidationResult = {
  indicators: Indicator[];
  totalIndicators: number;
  validationErrors: Array<{
    indicator: Indicator;
    error: string;
    severity: 'warning' | 'error';
  }>;
  confidence: number;
};

// ============ 医学指标类型 ============

export type VitalSign = {
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'respiratory_rate' | 'oxygen_saturation' | 'blood_glucose';
  value: number | string;
  unit: string;
  timestamp?: Date;
  isAbnormal: boolean;
};

export type LabResult = {
  testName: string;
  value: number | string;
  unit: string;
  referenceRange?: string;
  isAbnormal: boolean;
  timestamp?: Date;
};

export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration?: string;
  indication?: string;
};

export type Diagnosis = {
  code?: string;
  name: string;
  icd10?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  onset?: Date;
};

export type Procedure = {
  name: string;
  date?: Date;
  indication?: string;
  result?: string;
};

// ============ 段落类型 ============

export type MedicalRecordSection = 
  | 'chief_complaint'
  | 'present_illness'
  | 'past_history'
  | 'family_history'
  | 'social_history'
  | 'review_of_systems'
  | 'physical_exam'
  | 'vital_signs'
  | 'lab_results'
  | 'imaging'
  | 'diagnosis'
  | 'assessment'
  | 'plan'
  | 'treatment'
  | 'medication'
  | 'procedures'
  | 'follow_up'
  | 'other';

// ============ NLP 配置 ============

export type NlpConfig = {
  enableSectionDetection: boolean;
  enableEntityExtraction: boolean;
  enableRelationshipExtraction: boolean;
  enableIndicatorExtraction: boolean;
  enableValidation: boolean;
  confidenceThreshold: number;
};

// ============ NLP 错误 ============

export type NlpError = {
  stage: string;
  message: string;
  severity: 'warning' | 'error';
  context?: any;
};

// ============ NLP 处理选项 ============

export type NlpProcessingOptions = {
  stages?: Array<'indexing' | 'semantic_circuit_breaker' | 'metric_extraction' | 'zero_anchor' | 'validation'>;
  config?: Partial<NlpConfig>;
  returnIntermediateResults?: boolean;
};
