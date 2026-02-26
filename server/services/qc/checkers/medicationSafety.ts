/**
 * 质控检查器 - 用药安全检查
 * 检查用药是否安全，包括剂量、禁忌、相互作用等
 */

import { IQcChecker, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';
import { getDrugByName, getQcConfigsByType } from '../../../db';

/**
 * 用药安全检查器
 */
export class MedicationSafetyChecker implements IQcChecker {
  name = 'medicationSafety';
  
  /**
   * 执行用药安全检查
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
    
    // 1. 检查用药剂量
    const dosageIssues = await this.checkDosage(nlpResult);
    issues.push(...dosageIssues);
    
    // 2. 检查药物禁忌
    const contraindicationIssues = await this.checkContraindications(nlpResult);
    issues.push(...contraindicationIssues);
    
    // 3. 检查药物相互作用
    const interactionIssues = await this.checkInteractions(nlpResult);
    issues.push(...interactionIssues);
    
    // 4. 检查用药频率
    const frequencyIssues = this.checkFrequency(nlpResult);
    issues.push(...frequencyIssues);
    
    // 5. 应用规则检查
    for (const rule of rules) {
      if (rule.category === 'medication_safety') {
        const ruleIssue = await this.applyRule(rule, record, nlpResult);
        if (ruleIssue) {
          issues.push(ruleIssue);
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 检查用药剂量
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private async checkDosage(nlpResult: NlpResult): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 获取用药实体
    const medications = nlpResult.entities.filter(e => e.type === 'medication');
    
    for (const medication of medications) {
      try {
        // 从药品知识库获取最大日剂量
        const drug = await getDrugByName(medication.text);
        
        if (drug && drug.maxDailyDose) {
          // 这里可以添加更复杂的剂量验证逻辑
          // 简单示例：检查是否提到了剂量
          const medicationText = nlpResult.sectionMap.get('medication')?.content || '';
          if (!medicationText.includes(medication.text)) {
            issues.push({
              type: 'medication_safety',
              severity: 'minor',
              message: `用药 "${medication.text}" 缺少剂量信息`,
              suggestion: `补充用药的具体剂量`,
            });
          }
        }
      } catch (error) {
        // 忽略数据库错误
      }
    }
    
    return issues;
  }
  
  /**
   * 检查药物禁忌
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private async checkContraindications(nlpResult: NlpResult): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 获取用药实体
    const medications = nlpResult.entities.filter(e => e.type === 'medication');
    // 获取诊断实体
    const diagnoses = nlpResult.entities.filter(e => e.type === 'diagnosis');
    
    for (const medication of medications) {
      try {
        // 从药品知识库获取禁忌信息
        const drug = await getDrugByName(medication.text);
        
        if (drug && drug.contraindications) {
          const contraindications = typeof drug.contraindications === 'string' ? JSON.parse(drug.contraindications) : (drug.contraindications as string[] ?? []);
          
          // 检查诊断是否在禁忌列表中
          for (const diagnosis of diagnoses) {
            if (contraindications.includes(diagnosis.text)) {
              issues.push({
                type: 'medication_safety',
                severity: 'critical',
                message: `用药 "${medication.text}" 与诊断 "${diagnosis.text}" 存在禁忌`,
                suggestion: `检查并修正用药方案，避免禁忌组合`,
              });
            }
          }
        }
      } catch (error) {
        // 忽略数据库错误
      }
    }
    
    return issues;
  }
  
  /**
   * 检查药物相互作用
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private async checkInteractions(nlpResult: NlpResult): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 获取用药实体
    const medications = nlpResult.entities.filter(e => e.type === 'medication');
    
    // 检查多种用药之间的相互作用
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];
        
        try {
          // 从药品知识库获取相互作用信息
          const drug1 = await getDrugByName(med1.text);
          
          if (drug1 && drug1.interactions) {
            const interactions = typeof drug1.interactions === 'string' ? JSON.parse(drug1.interactions) : (drug1.interactions as string[] ?? []);
            
            if (interactions.includes(med2.text)) {
              issues.push({
                type: 'medication_safety',
                severity: 'major',
                message: `用药 "${med1.text}" 和 "${med2.text}" 存在相互作用`,
                suggestion: `检查并调整用药方案，避免不良相互作用`,
              });
            }
          }
        } catch (error) {
          // 忽略数据库错误
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 检查用药频率
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkFrequency(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 获取用药实体
    const medications = nlpResult.entities.filter(e => e.type === 'medication');
    
    // 检查用药频率是否合理
    const frequencyKeywords = ['日一次', '日两次', '日三次', '日四次', '周一次'];
    
    for (const medication of medications) {
      // 简单检查：如果用药没有指定频率
      let hasFrequency = false;
      for (const keyword of frequencyKeywords) {
        if (medication.text.includes(keyword)) {
          hasFrequency = true;
          break;
        }
      }
      
      if (!hasFrequency) {
        // 这是一个简化的检查，实际应该更复杂
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
   * 获取用药安全评分
   * @param nlpResult NLP 处理结果
   * @returns 评分（0-100）
   */
  async getMedicationSafetyScore(nlpResult: NlpResult): Promise<number> {
    let score = 100;
    
    // 基于检查到的用药安全问题扣分
    const dosageIssues = await this.checkDosage(nlpResult);
    const contraindicationIssues = await this.checkContraindications(nlpResult);
    const interactionIssues = await this.checkInteractions(nlpResult);
    const frequencyIssues = this.checkFrequency(nlpResult);
    
    // 不同严重程度的问题扣分不同
    for (const issue of [...dosageIssues, ...contraindicationIssues, ...interactionIssues, ...frequencyIssues]) {
      if (issue.severity === 'critical') {
        score -= 20;
      } else if (issue.severity === 'major') {
        score -= 10;
      } else {
        score -= 5;
      }
    }
    
    return Math.max(score, 0);
  }
}

// 导出单例
export const medicationSafetyChecker = new MedicationSafetyChecker();
