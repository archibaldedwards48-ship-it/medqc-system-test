/**
 * 质控检查器 - 格式检查
 * 检查病历的格式是否规范
 */

import { IQcChecker, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';

/**
 * 格式检查器
 */
export class FormattingChecker implements IQcChecker {
  name = 'formatting';
  
  /**
   * 执行格式检查
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
    
    // 1. 检查文本格式
    const textFormatIssues = this.checkTextFormat(record.content);
    issues.push(...textFormatIssues);
    
    // 2. 检查段落标题格式
    const titleFormatIssues = this.checkTitleFormat(nlpResult);
    issues.push(...titleFormatIssues);
    
    // 3. 检查数据格式
    const dataFormatIssues = this.checkDataFormat(nlpResult);
    issues.push(...dataFormatIssues);
    
    // 4. 检查特殊字符
    const specialCharIssues = this.checkSpecialCharacters(record.content);
    issues.push(...specialCharIssues);
    
    // 5. 应用规则检查
    for (const rule of rules) {
      if (rule.category === 'formatting') {
        const ruleIssue = await this.applyRule(rule, record, nlpResult);
        if (ruleIssue) {
          issues.push(ruleIssue);
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 检查文本格式
   * @param content 文本内容
   * @returns 质控问题列表
   */
  private checkTextFormat(content: string): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 检查行首缩进
    const lines = content.split('\n');
    const unindentedLines = lines.filter(line => line.match(/^\S/) && line.trim().length > 0).length;
    
    if (unindentedLines > lines.length * 0.5) {
      issues.push({
        type: 'formatting',
        severity: 'minor',
        message: `大部分行未缩进，格式不规范`,
        suggestion: `按照规范格式进行缩进`,
      });
    }
    
    // 检查是否有过多空行
    const emptyLines = lines.filter(line => line.trim().length === 0).length;
    if (emptyLines > lines.length * 0.2) {
      issues.push({
        type: 'formatting',
        severity: 'minor',
        message: `空行过多，格式不紧凑`,
        suggestion: `删除多余的空行`,
      });
    }
    
    return issues;
  }
  
  /**
   * 检查段落标题格式
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkTitleFormat(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 检查段落标题是否统一使用标记
    let titleMarkCount = 0;
    for (const [_, section] of nlpResult.sectionMap) {
      if (section.content.match(/^#+\s/m)) {
        titleMarkCount++;
      }
    }
    
    if (titleMarkCount > 0 && titleMarkCount < nlpResult.sectionMap.size * 0.5) {
      issues.push({
        type: 'formatting',
        severity: 'minor',
        message: `段落标题标记不统一`,
        suggestion: `统一使用标题标记（如 # 或 ##）`,
      });
    }
    
    return issues;
  }
  
  /**
   * 检查数据格式
   * @param nlpResult NLP 处理结果
   * @returns 质控问题列表
   */
  private checkDataFormat(nlpResult: NlpResult): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 检查指标值格式
    for (const indicator of nlpResult.indicators) {
      if (!indicator.unit && indicator.name.match(/血压|心率|体温|血糖/)) {
        issues.push({
          type: 'formatting',
          severity: 'minor',
          message: `指标 ${indicator.name} 缺少单位`,
          suggestion: `补充指标的单位信息`,
        });
      }
    }
    
    return issues;
  }
  
  /**
   * 检查特殊字符
   * @param content 文本内容
   * @returns 质控问题列表
   */
  private checkSpecialCharacters(content: string): QcIssue[] {
    const issues: QcIssue[] = [];
    
    // 检查是否有非法字符
    if (content.match(/[^\u4e00-\u9fa5a-zA-Z0-9\s\-\.,:;()（）：；，。]/g)) {
      issues.push({
        type: 'formatting',
        severity: 'minor',
        message: `文本中存在非法字符`,
        suggestion: `清理文本中的非法字符`,
      });
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
   * 获取格式评分
   * @param record 医疗记录
   * @param nlpResult NLP 处理结果
   * @returns 评分（0-100）
   */
  getFormattingScore(record: MedicalRecord, nlpResult: NlpResult): number {
    let score = 100;
    
    // 基于检查到的格式问题扣分
    const textFormatIssues = this.checkTextFormat(record.content);
    const titleFormatIssues = this.checkTitleFormat(nlpResult);
    const dataFormatIssues = this.checkDataFormat(nlpResult);
    const specialCharIssues = this.checkSpecialCharacters(record.content);
    
    score -= (textFormatIssues.length + titleFormatIssues.length + dataFormatIssues.length + specialCharIssues.length) * 5;
    
    return Math.max(score, 0);
  }
}

// 导出单例
export const formattingChecker = new FormattingChecker();
