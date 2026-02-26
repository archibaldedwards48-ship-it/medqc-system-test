/**
 * 质控检查器 - 诊断内涵检查
 * 检查诊断编码和描述的准确性
 */

import { IQcChecker, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';
import { getMedicalTerminologyByTerm } from '../../../db';

/**
 * 诊断检查器
 */
export class DiagnosisChecker implements IQcChecker {
  name = 'diagnosis';
  
  /**
   * 执行诊断检查
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
    
    // 1. 检查诊断是否规范
    const standardizationIssues = await this.checkDiagnosisStandardization(nlpResult);
    issues.push(...standardizationIssues);
    
    // 2. 检查诊断编码
    const codingIssues = await this.checkDiagnosisCoding(nlpResult);
    issues.push(...codingIssues);
    
    // 3. 检查诊断的医学合理性
    const medicalValidityIssues = await this.checkMedicalValidity(nlpResult);
    issues.push(...medicalValidityIssues);
    
    // 4. 应用规则检查
    for (const rule of rules) {
      if (rule.category === 'diagnosis') {
        const ruleIssue = await this.applyRule(rule, record, nlpResult);
        if (ruleIssue) {
          issues.push(ruleIssue);
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 检查诊断是否规范
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private async checkDiagnosisStandardization(nlpResult: NlpResult): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 获取诊断实体
    const diagnoses = nlpResult.entities.filter(e => e.type === 'diagnosis');
    
    for (const diagnosis of diagnoses) {
      try {
        // 尝试从医学术语库中获取标准名称
        const terminology = await getMedicalTerminologyByTerm(diagnosis.text);
        
        if (!terminology) {
          issues.push({
            type: 'diagnosis',
            severity: 'minor',
            message: `诊断 "${diagnosis.text}" 不在标准术语库中`,
            suggestion: `使用标准的医学术语描述诊断`,
          });
        }
      } catch (error) {
        // 忽略数据库错误
      }
    }
    
    return issues;
  }
  
  /**
   * 检查诊断编码
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private async checkDiagnosisCoding(nlpResult: NlpResult): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 获取诊断实体
    const diagnoses = nlpResult.entities.filter(e => e.type === 'diagnosis');
    
    // 检查是否有诊断编码
    for (const diagnosis of diagnoses) {
      // 简单的检查：如果诊断没有 ICD-10 编码
      if (!diagnosis.text.match(/[A-Z]\d{2}(\.\d)?/)) {
        issues.push({
          type: 'diagnosis',
          severity: 'minor',
          message: `诊断 "${diagnosis.text}" 缺少 ICD-10 编码`,
          suggestion: `补充诊断的 ICD-10 编码`,
        });
      }
    }
    
    return issues;
  }
  
  /**
   * 检查诊断的医学合理性
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private async checkMedicalValidity(nlpResult: NlpResult): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 获取诊断实体
    const diagnoses = nlpResult.entities.filter(e => e.type === 'diagnosis');
    
    // 检查诊断与症状的关联
    const symptoms = nlpResult.entities.filter(e => e.type === 'symptom');
    
    for (const diagnosis of diagnoses) {
      // 如果是严重诊断但没有相应的症状，可能需要验证
      if (this.isSeriousDiagnosis(diagnosis.text) && symptoms.length === 0) {
        issues.push({
          type: 'diagnosis',
          severity: 'major',
          message: `诊断 "${diagnosis.text}" 是严重疾病，但缺少相应的症状描述`,
          suggestion: `补充症状描述以支持诊断`,
        });
      }
    }
    
    return issues;
  }
  
  /**
   * 判断是否是严重诊断
   * @param diagnosis 诊断名称
   * @returns 是否是严重诊断
   */
  private isSeriousDiagnosis(diagnosis: string): boolean {
    const seriousDiagnoses = [
      '癌症', '肿瘤', '心梗', '脑梗', '脑出血', '肺栓塞', '败血症',
      '肝衰竭', '肾衰竭', '呼吸衰竭', '心力衰竭', '休克',
    ];
    
    return seriousDiagnoses.some(sd => diagnosis.includes(sd));
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
   * 获取诊断评分
   * @param nlpResult NLP 处理结果
   * @returns 评分（0-100）
   */
  async getDiagnosisScore(nlpResult: NlpResult): Promise<number> {
    let score = 100;
    
    // 基于检查到的诊断问题扣分
    const standardizationIssues = await this.checkDiagnosisStandardization(nlpResult);
    const codingIssues = await this.checkDiagnosisCoding(nlpResult);
    const validityIssues = await this.checkMedicalValidity(nlpResult);
    
    score -= (standardizationIssues.length + codingIssues.length + validityIssues.length) * 10;
    
    return Math.max(score, 0);
  }
}

// 导出单例
export const diagnosisChecker = new DiagnosisChecker();
