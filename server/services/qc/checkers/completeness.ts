/**
 * 质控检查器 - 完整性检查
 * 检查病历是否包含所有必需的段落和信息
 */

import { IQcChecker, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';

// 必需的段落
const REQUIRED_SECTIONS = [
  'chief_complaint',
  'present_illness',
  'physical_exam',
  'diagnosis',
  'plan',
];

// 必需的字段
const REQUIRED_FIELDS = {
  outpatient: ['chief_complaint', 'present_illness', 'physical_exam', 'diagnosis'],
  inpatient: ['chief_complaint', 'present_illness', 'physical_exam', 'diagnosis', 'plan', 'medication'],
  admission: ['chief_complaint', 'present_illness', 'physical_exam', 'vital_signs', 'diagnosis'],
  discharge: ['diagnosis', 'treatment', 'medication', 'follow_up'],
  consultation: ['chief_complaint', 'present_illness', 'diagnosis', 'plan'],
  operation: ['diagnosis', 'procedures', 'treatment'],
};

/**
 * 完整性检查器
 */
export class CompletenessChecker implements IQcChecker {
  name = 'completeness';
  
  /**
   * 执行完整性检查
   * @param record 医疗记录
   * @param nlpResult NLP 处理结果
   * @param rules 质控规则
   * @returns 质控问题列表
   */
  async check(
    record: MedicalRecord,
    nlpResult: NlpResult,
    rules: QcRule[]
  ): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 1. 检查必需段落
    const missingRequired = this.checkRequiredSections(nlpResult);
    if (missingRequired.length > 0) {
      issues.push({
        type: 'completeness',
        severity: 'major',
        message: `缺少必需段落：${missingRequired.join('、')}`,
        suggestion: `请补充缺失的段落内容`,
      });
    }
    
    // 2. 检查记录类型特定的字段
    const recordType = record.type || 'outpatient';
    const missingFields = this.checkTypeSpecificFields(recordType, nlpResult);
    if (missingFields.length > 0) {
      issues.push({
        type: 'completeness',
        severity: 'major',
        message: `${recordType} 类型缺少必需字段：${missingFields.join('、')}`,
        suggestion: `根据 ${recordType} 类型补充缺失的字段`,
      });
    }
    
    // 3. 检查内容完整性（字数）
    if (record.content.length < 100) {
      issues.push({
        type: 'completeness',
        severity: 'minor',
        message: `病历内容过短（${record.content.length} 字），可能信息不完整`,
        suggestion: `补充更详细的病历内容`,
      });
    }
    
    // 4. 检查指标完整性
    const missingIndicators = this.checkIndicatorCompleteness(nlpResult);
    if (missingIndicators.length > 0) {
      issues.push({
        type: 'completeness',
        severity: 'minor',
        message: `缺少关键指标：${missingIndicators.join('、')}`,
        suggestion: `补充缺失的医学指标数据`,
      });
    }
    
    // 5. 应用规则检查
    for (const rule of rules) {
      if (rule.category === 'completeness') {
        const ruleIssue = await this.applyRule(rule, record, nlpResult);
        if (ruleIssue) {
          issues.push(ruleIssue);
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 检查必需段落
   * @param nlpResult NLP 处理结果
   * @returns 缺失的段落列表
   */
  private checkRequiredSections(nlpResult: NlpResult): string[] {
    const missing: string[] = [];
    
    for (const section of REQUIRED_SECTIONS) {
      if (!nlpResult.sectionMap.has(section)) {
        missing.push(section);
      }
    }
    
    return missing;
  }
  
  /**
   * 检查记录类型特定的字段
   * @param recordType 记录类型
   * @param nlpResult NLP 处理结果
   * @returns 缺失的字段列表
   */
  private checkTypeSpecificFields(
    recordType: string,
    nlpResult: NlpResult
  ): string[] {
    const missing: string[] = [];
    const requiredFields = REQUIRED_FIELDS[recordType as keyof typeof REQUIRED_FIELDS] || REQUIRED_FIELDS.outpatient;
    
    for (const field of requiredFields) {
      if (!nlpResult.sectionMap.has(field)) {
        missing.push(field);
      }
    }
    
    return missing;
  }
  
  /**
   * 检查指标完整性
   * @param nlpResult NLP 处理结果
   * @returns 缺失的指标列表
   */
  private checkIndicatorCompleteness(nlpResult: NlpResult): string[] {
    const missing: string[] = [];
    const requiredIndicators = ['血压', '心率', '体温', '呼吸频率'];
    const extractedIndicators = nlpResult.indicators.map(ind => ind.name);
    
    for (const indicator of requiredIndicators) {
      if (!extractedIndicators.includes(indicator)) {
        missing.push(indicator);
      }
    }
    
    return missing;
  }
  
  /**
   * 应用规则进行检查
   * @param rule 质控规则
   * @param record 医疗记录
   * @param nlpResult NLP 处理结果
   * @returns 质控问题，如果没有则返回 null
   */
  private async applyRule(
    rule: QcRule,
    record: MedicalRecord,
    nlpResult: NlpResult
  ): Promise<QcIssue | null> {
    // 简单的规则评估逻辑
    // 在实际应用中，可以使用更复杂的规则引擎
    
    try {
      // 这里可以添加更复杂的规则评估逻辑
      // 例如：eval(rule.condition) 或使用规则引擎
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * 获取完整性评分
   * @param record 医疗记录
   * @param nlpResult NLP 处理结果
   * @returns 评分（0-100）
   */
  getCompletenessScore(record: MedicalRecord, nlpResult: NlpResult): number {
    let score = 100;
    
    // 基于缺失段落扣分
    const missingRequired = this.checkRequiredSections(nlpResult);
    score -= missingRequired.length * 10;
    
    // 基于缺失字段扣分
    const recordType = record.type || 'outpatient';
    const missingFields = this.checkTypeSpecificFields(recordType, nlpResult);
    score -= missingFields.length * 5;
    
    // 基于内容长度扣分
    if (record.content.length < 100) {
      score -= 10;
    }
    
    // 基于缺失指标扣分
    const missingIndicators = this.checkIndicatorCompleteness(nlpResult);
    score -= missingIndicators.length * 3;
    
    return Math.max(score, 0);
  }
}

// 导出单例
export const completenessChecker = new CompletenessChecker();
