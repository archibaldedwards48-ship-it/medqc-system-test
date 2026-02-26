/**
 * 质控检查器 - 时限性检查
 * 检查病历是否在规定时限内完成
 */

import { IQcChecker, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';

// 不同记录类型的完成时限（小时）
const COMPLETION_DEADLINES: Record<string, number> = {
  outpatient: 24,
  inpatient: 24,
  admission: 24,
  discharge: 48,
  consultation: 24,
  operation: 48,
};

/**
 * 时限性检查器
 */
export class TimelinessChecker implements IQcChecker {
  name = 'timeliness';
  
  /**
   * 执行时限性检查
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
    
    // 1. 检查完成时限
    if (record.admissionDate) {
      const overdueDays = this.calculateOverdueDays(record);
      if (overdueDays > 0) {
        issues.push({
          type: 'timeliness',
          severity: overdueDays > 7 ? 'critical' : 'major',
          message: `病历超期 ${overdueDays} 天未完成`,
          suggestion: `立即完成病历书写`,
        });
      }
    }
    
    // 2. 检查各段落的完成顺序
    const orderIssues = this.checkSectionOrder(nlpResult);
    if (orderIssues) {
      issues.push(orderIssues);
    }
    
    // 3. 检查记录的时间戳
    if (record.createdAt && record.updatedAt) {
      const timeDiff = record.updatedAt.getTime() - record.createdAt.getTime();
      if (timeDiff < 60000) { // 少于 1 分钟
        issues.push({
          type: 'timeliness',
          severity: 'minor',
          message: `病历创建和更新时间间隔过短，可能未充分审查`,
          suggestion: `确保充分审查病历内容`,
        });
      }
    }
    
    // 4. 应用规则检查
    for (const rule of rules) {
      if (rule.category === 'timeliness') {
        const ruleIssue = await this.applyRule(rule, record, nlpResult);
        if (ruleIssue) {
          issues.push(ruleIssue);
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 计算超期天数
   * @param record 医疗记录
   * @returns 超期天数，如果未超期则返回 0
   */
  private calculateOverdueDays(record: MedicalRecord): number {
    if (!record.admissionDate) {
      return 0;
    }
    
    const recordType = record.type || 'outpatient';
    const deadlineHours = COMPLETION_DEADLINES[recordType] || 24;
    const deadline = new Date(record.admissionDate.getTime() + deadlineHours * 60 * 60 * 1000);
    const now = new Date();
    
    if (now > deadline) {
      const diffMs = now.getTime() - deadline.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      return diffDays;
    }
    
    return 0;
  }
  
  /**
   * 检查段落完成顺序
   * @param nlpResult NLP 处理结果
   * @returns 质控问题，如果没有则返回 null
   */
  private checkSectionOrder(nlpResult: NlpResult): QcIssue | null {
    // 预期的段落顺序
    const expectedOrder = [
      'chief_complaint',
      'present_illness',
      'past_history',
      'physical_exam',
      'diagnosis',
      'plan',
    ];
    
    const sections = Array.from(nlpResult.sectionMap.keys());
    let lastIndex = -1;
    
    for (const section of sections) {
      const index = expectedOrder.indexOf(section);
      if (index > -1 && index < lastIndex) {
        return {
          type: 'timeliness',
          severity: 'minor',
          message: `段落顺序不规范：${section} 出现在 ${expectedOrder[lastIndex]} 之后`,
          suggestion: `按照规范顺序重新组织病历内容`,
        };
      }
      if (index > -1) {
        lastIndex = index;
      }
    }
    
    return null;
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
   * 获取时限性评分
   * @param record 医疗记录
   * @returns 评分（0-100）
   */
  getTimelinessScore(record: MedicalRecord): number {
    let score = 100;
    
    // 基于超期天数扣分
    const overdueDays = this.calculateOverdueDays(record);
    if (overdueDays > 0) {
      score -= Math.min(overdueDays * 10, 50);
    }
    
    return Math.max(score, 0);
  }
}

// 导出单例
export const timelinessChecker = new TimelinessChecker();
