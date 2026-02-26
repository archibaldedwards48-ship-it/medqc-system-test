/**
 * 质控检查器 - 一致性检查
 * 检查诊断、检查结果、用药之间的逻辑一致性
 */

import { IQcChecker, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';

/**
 * 一致性检查器
 */
export class ConsistencyChecker implements IQcChecker {
  name = 'consistency';
  
  /**
   * 执行一致性检查
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
    
    // 1. 检查诊断与症状的一致性
    const diagnosisIssues = this.checkDiagnosisSymptomConsistency(nlpResult);
    issues.push(...diagnosisIssues);
    
    // 2. 检查用药与诊断的一致性
    const medicationIssues = this.checkMedicationDiagnosisConsistency(nlpResult);
    issues.push(...medicationIssues);
    
    // 3. 检查检查结果与诊断的一致性
    const labIssues = this.checkLabDiagnosisConsistency(nlpResult);
    issues.push(...labIssues);
    
    // 4. 检查生命体征与诊断的一致性
    const vitalSignIssues = this.checkVitalSignConsistency(nlpResult);
    issues.push(...vitalSignIssues);
    
    // 5. 应用规则检查
    for (const rule of rules) {
      if (rule.category === 'consistency') {
        const ruleIssue = await this.applyRule(rule, record, nlpResult);
        if (ruleIssue) {
          issues.push(ruleIssue);
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 检查诊断与症状的一致性
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkDiagnosisSymptomConsistency(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 获取诊断实体
    const diagnoses = nlpResult.entities.filter(e => e.type === 'diagnosis');
    // 获取症状实体
    const symptoms = nlpResult.entities.filter(e => e.type === 'symptom');
    
    // 如果有诊断但没有症状，可能不一致
    if (diagnoses.length > 0 && symptoms.length === 0) {
      issues.push({
        type: 'consistency',
        severity: 'major',
        message: `诊断信息存在，但缺少相应的症状描述`,
        suggestion: `补充症状描述以支持诊断`,
      });
    }
    
    return issues;
  }
  
  /**
   * 检查用药与诊断的一致性
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkMedicationDiagnosisConsistency(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 获取用药实体
    const medications = nlpResult.entities.filter(e => e.type === 'medication');
    // 获取诊断实体
    const diagnoses = nlpResult.entities.filter(e => e.type === 'diagnosis');
    
    // 如果有用药但没有诊断，可能不一致
    if (medications.length > 0 && diagnoses.length === 0) {
      issues.push({
        type: 'consistency',
        severity: 'major',
        message: `存在用药信息，但缺少相应的诊断`,
        suggestion: `补充诊断信息以说明用药原因`,
      });
    }
    
    return issues;
  }
  
  /**
   * 检查检查结果与诊断的一致性
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkLabDiagnosisConsistency(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 获取异常指标
    const abnormalIndicators = nlpResult.indicators.filter(ind => ind.isAbnormal);
    
    // 如果有异常指标但缺少相应的诊断
    if (abnormalIndicators.length > 0) {
      const diagnoses = nlpResult.entities.filter(e => e.type === 'diagnosis');
      if (diagnoses.length === 0) {
        issues.push({
          type: 'consistency',
          severity: 'major',
          message: `存在异常检查结果（${abnormalIndicators.map(i => i.name).join('、')}），但缺少相应的诊断`,
          suggestion: `根据异常结果补充相应的诊断`,
        });
      }
    }
    
    return issues;
  }
  
  /**
   * 检查生命体征与诊断的一致性
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkVitalSignConsistency(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 获取异常生命体征
    const vitalSigns = nlpResult.indicators.filter(ind => 
      ['血压', '心率', '体温', '呼吸频率', '血氧饱和度'].includes(ind.name)
    );
    
    const abnormalVitalSigns = vitalSigns.filter(vs => vs.isAbnormal && vs.severity === 'critical');
    
    // 如果有危急值但缺少相应的处理计划
    if (abnormalVitalSigns.length > 0) {
      const plan = nlpResult.sectionMap.get('plan');
      if (!plan || plan.content.length < 50) {
        issues.push({
          type: 'consistency',
          severity: 'critical',
          message: `存在危急生命体征值（${abnormalVitalSigns.map(v => v.name).join('、')}），但缺少相应的处理计划`,
          suggestion: `立即补充危急值的处理措施`,
        });
      }
    }
    
    return issues;
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
    // 规则评估逻辑
    return null;
  }
  
  /**
   * 获取一致性评分
   * @param nlpResult NLP 处理结果
   * @returns 评分（0-100）
   */
  getConsistencyScore(nlpResult: NlpResult): number {
    let score = 100;
    
    // 基于检查到的不一致问题扣分
    const diagnosisIssues = this.checkDiagnosisSymptomConsistency(nlpResult);
    const medicationIssues = this.checkMedicationDiagnosisConsistency(nlpResult);
    const labIssues = this.checkLabDiagnosisConsistency(nlpResult);
    const vitalSignIssues = this.checkVitalSignConsistency(nlpResult);
    
    score -= (diagnosisIssues.length + medicationIssues.length + labIssues.length + vitalSignIssues.length) * 10;
    
    return Math.max(score, 0);
  }
}

// 导出单例
export const consistencyChecker = new ConsistencyChecker();
