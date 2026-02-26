/**
 * 质控引擎服务
 * 编排所有 7 个检查器，执行完整的质控流程
 */

import { MedicalRecord, QcResult, QcIssue, QcRule } from '../../types/qc.types';
import { NlpResult } from '../../types/nlp.types';
import { completenessChecker } from './checkers/completeness';
import { timelinessChecker } from './checkers/timeliness';
import { consistencyChecker } from './checkers/consistency';
import { formattingChecker } from './checkers/formatting';
import { logicChecker } from './checkers/logic';
import { diagnosisChecker } from './checkers/diagnosis';
import { medicationSafetyChecker } from './checkers/medicationSafety';

/**
 * 质控引擎
 */
export class QcEngineService {
  private checkers = [
    completenessChecker,
    timelinessChecker,
    consistencyChecker,
    formattingChecker,
    logicChecker,
    diagnosisChecker,
    medicationSafetyChecker,
  ];
  
  /**
   * 执行完整的质控流程
   * @param record 医疗记录
   * @param nlpResult NLP 处理结果
   * @param rules 质控规则
   * @param options 执行选项
   * @returns 质控结果
   */
  async runQc(
    record: MedicalRecord,
    nlpResult: NlpResult,
    rules: QcRule[],
    options?: {
      checkers?: string[];
      stopOnCritical?: boolean;
    }
  ): Promise<QcResult> {
    const issues: QcIssue[] = [];
    const scores: Record<string, number> = {};
    
    // 确定要执行的检查器
    const checkersToRun = options?.checkers
      ? this.checkers.filter(c => options.checkers!.includes(c.name))
      : this.checkers;
    
    // 执行每个检查器
    for (const checker of checkersToRun) {
      try {
        const checkerIssues = await checker.check(record, nlpResult, rules);
        issues.push(...checkerIssues);
        
        // 计算该检查器的评分
        scores[checker.name] = this.calculateCheckerScore(checkerIssues);
        
        // 如果遇到严重问题且配置了停止，则停止
        if (options?.stopOnCritical && checkerIssues.some(i => i.severity === 'critical')) {
          break;
        }
      } catch (error) {
        // 记录检查器执行错误，但继续执行其他检查器
        console.error(`Checker ${checker.name} failed:`, error);
      }
    }
    
    // 计算总体评分
    const overallScore = this.calculateOverallScore(scores);
    
    // 确定质控状态
    const status = this.determineStatus(issues, overallScore);
    
    return {
      recordId: record.id,
      totalScore: overallScore,
      issues,
      scores,
      overallScore,
      status,
      timestamp: new Date(),
    };
  }
  
  /**
   * 计算单个检查器的评分
   * @param issues 该检查器发现的问题
   * @returns 评分（0-100）
   */
  private calculateCheckerScore(issues: QcIssue[]): number {
    if (issues.length === 0) {
      return 100;
    }
    
    let score = 100;
    
    for (const issue of issues) {
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
  
  /**
   * 计算总体评分
   * @param scores 各检查器的评分
   * @returns 总体评分（0-100）
   */
  private calculateOverallScore(scores: Record<string, number>): number {
    const scoreValues = Object.values(scores);
    
    if (scoreValues.length === 0) {
      return 0;
    }
    
    // 计算平均分
    const average = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
    
    // 加权平均（可以根据需要调整权重）
    return Math.round(average);
  }
  
  /**
   * 确定质控状态
   * @param issues 所有问题
   * @param overallScore 总体评分
   * @returns 质控状态
   */
  private determineStatus(issues: QcIssue[], overallScore: number): 'pass' | 'pass_with_warning' | 'fail' {
    // 如果有严重问题，标记为失败
    if (issues.some(i => i.severity === 'critical')) {
      return 'fail';
    }
    
    // 如果有主要问题或评分低于 70，标记为警告
    if (issues.some(i => i.severity === 'major') || overallScore < 70) {
      return 'pass_with_warning';
    }
    
    // 否则标记为通过
    return 'pass';
  }
  
  /**
   * 获取质控报告
   * @param result 质控结果
   * @returns 质控报告
   */
  generateReport(result: QcResult): {
    summary: string;
    issuesByType: Record<string, QcIssue[]>;
    issuesBySeverity: Record<string, QcIssue[]>;
    scoreBreakdown: Record<string, number>;
    recommendations: string[];
  } {
    // 按类型分组问题
    const issuesByType: Record<string, QcIssue[]> = {};
    for (const issue of result.issues) {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    }
    
    // 按严重程度分组问题
    const issuesBySeverity: Record<string, QcIssue[]> = {
      critical: [],
      major: [],
      minor: [],
    };
    for (const issue of result.issues) {
      issuesBySeverity[issue.severity].push(issue);
    }
    
    // 生成建议
    const recommendations: string[] = [];
    if (issuesBySeverity.critical.length > 0) {
      recommendations.push('立即处理严重问题');
    }
    if (issuesBySeverity.major.length > 0) {
      recommendations.push('尽快处理主要问题');
    }
    if ((result.overallScore ?? 0) < 60) {
      recommendations.push('建议全面审查病历');
    }
    
    return {
      summary: `质控完成：${result.issues.length} 个问题，总体评分 ${result.overallScore}，状态 ${result.status}`,
      issuesByType,
      issuesBySeverity,
      scoreBreakdown: result.scores ?? {},
      recommendations,
    };
  }
  
  /**
   * 获取质控统计信息
   * @param result 质控结果
   * @returns 统计信息
   */
  getStatistics(result: QcResult): {
    totalIssues: number;
    criticalIssues: number;
    majorIssues: number;
    minorIssues: number;
    averageScore: number;
    passRate: number;
  } {
    const issues = result.issues;
    
    return {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      majorIssues: issues.filter(i => i.severity === 'major').length,
      minorIssues: issues.filter(i => i.severity === 'minor').length,
      averageScore: result.overallScore ?? result.totalScore,
      passRate: result.status === 'pass' ? 100 : result.status === 'pass_with_warning' ? 50 : 0,
    };
  }
}

// 导出单例
export const qcEngine = new QcEngineService();
