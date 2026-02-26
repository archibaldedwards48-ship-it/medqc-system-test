/**
 * 质控检查器 - 逻辑检查
 * 检查病历中的逻辑是否合理
 */

import { IQcChecker, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';

/**
 * 逻辑检查器
 */
export class LogicChecker implements IQcChecker {
  name = 'logic';
  
  /**
   * 执行逻辑检查
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
    
    // 1. 检查时间逻辑
    const timeLogicIssues = this.checkTimeLogic(record);
    issues.push(...timeLogicIssues);
    
    // 2. 检查诊断逻辑
    const diagnosisLogicIssues = this.checkDiagnosisLogic(nlpResult);
    issues.push(...diagnosisLogicIssues);
    
    // 3. 检查治疗逻辑
    const treatmentLogicIssues = this.checkTreatmentLogic(nlpResult);
    issues.push(...treatmentLogicIssues);
    
    // 4. 检查数值逻辑
    const valueLogicIssues = this.checkValueLogic(nlpResult);
    issues.push(...valueLogicIssues);
    
    // 5. 应用规则检查
    for (const rule of rules) {
      if (rule.category === 'logic') {
        const ruleIssue = await this.applyRule(rule, record, nlpResult);
        if (ruleIssue) {
          issues.push(ruleIssue);
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 检查时间逻辑
   * @param record 医疗记录
   * @returns 质控问题列表
   */
  private checkTimeLogic(record: MedicalRecord): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 检查入院日期是否晚于出院日期
    if (record.admissionDate && record.dischargeDate) {
      if (record.admissionDate > record.dischargeDate) {
        issues.push({
          type: 'logic',
          severity: 'critical',
          message: `入院日期晚于出院日期，时间逻辑错误`,
          suggestion: `检查并修正入院和出院日期`,
        });
      }
    }
    
    // 检查创建日期是否晚于入院日期
    if (record.createdAt && record.admissionDate) {
      if (record.createdAt < record.admissionDate) {
        issues.push({
          type: 'logic',
          severity: 'major',
          message: `病历创建日期早于入院日期，可能是时间设置错误`,
          suggestion: `检查病历创建日期`,
        });
      }
    }
    
    return issues;
  }
  
  /**
   * 检查诊断逻辑
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkDiagnosisLogic(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 获取诊断实体
    const diagnoses = nlpResult.entities.filter(e => e.type === 'diagnosis');
    
    // 检查是否有重复诊断
    const diagnosisNames = diagnoses.map(d => d.text);
    const uniqueDiagnoses = new Set(diagnosisNames);
    
    if (uniqueDiagnoses.size < diagnosisNames.length) {
      issues.push({
        type: 'logic',
        severity: 'minor',
        message: `存在重复的诊断`,
        suggestion: `删除重复的诊断`,
      });
    }
    
    // 检查是否有矛盾的诊断
    const contradictoryPairs = [
      ['高血压', '低血压'],
      ['高血糖', '低血糖'],
      ['发热', '体温过低'],
    ];
    
    for (const [diag1, diag2] of contradictoryPairs) {
      if (diagnosisNames.includes(diag1) && diagnosisNames.includes(diag2)) {
        issues.push({
          type: 'logic',
          severity: 'major',
          message: `存在矛盾的诊断：${diag1} 和 ${diag2}`,
          suggestion: `检查并修正矛盾的诊断`,
        });
      }
    }
    
    return issues;
  }
  
  /**
   * 检查治疗逻辑
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkTreatmentLogic(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 获取用药实体
    const medications = nlpResult.entities.filter(e => e.type === 'medication');
    
    // 如果有多个相同类型的药物，可能需要检查
    const medicationNames = medications.map(m => m.text);
    const uniqueMedications = new Set(medicationNames);
    
    if (uniqueMedications.size < medicationNames.length) {
      issues.push({
        type: 'logic',
        severity: 'minor',
        message: `存在重复的用药`,
        suggestion: `检查是否需要删除重复的用药`,
      });
    }
    
    return issues;
  }
  
  /**
   * 检查数值逻辑
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkValueLogic(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 检查血压的逻辑
    const bpIndicators = nlpResult.indicators.filter(ind => ind.name === '血压');
    for (const bp of bpIndicators) {
      const parts = bp.value.split('/');
      if (parts.length === 2) {
        const systolic = parseFloat(parts[0]);
        const diastolic = parseFloat(parts[1]);
        
        if (systolic < diastolic) {
          issues.push({
            type: 'logic',
            severity: 'critical',
            message: `血压值异常：收缩压 ${systolic} 小于舒张压 ${diastolic}`,
            suggestion: `检查并修正血压值`,
          });
        }
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
   * 获取逻辑评分
   * @param record 医疗记录
   * @param nlpResult NLP 处理结果
   * @returns 评分（0-100）
   */
  getLogicScore(record: MedicalRecord, nlpResult: NlpResult): number {
    let score = 100;
    
    // 基于检查到的逻辑问题扣分
    const timeLogicIssues = this.checkTimeLogic(record);
    const diagnosisLogicIssues = this.checkDiagnosisLogic(nlpResult);
    const treatmentLogicIssues = this.checkTreatmentLogic(nlpResult);
    const valueLogicIssues = this.checkValueLogic(nlpResult);
    
    score -= (timeLogicIssues.length + diagnosisLogicIssues.length + treatmentLogicIssues.length + valueLogicIssues.length) * 10;
    
    return Math.max(score, 0);
  }
}

// 导出单例
export const logicChecker = new LogicChecker();
