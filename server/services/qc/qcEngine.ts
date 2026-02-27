/**
 * 质控引擎服务
 * 编排所有 10 个检查器，执行完整的质控流程
 * 
 * B1: critical 问题直接判定不合格（总分封顶 59）
 * B2: 质控模式生效（fast/standard/comprehensive 控制启用哪些 checker）
 */

import { MedicalRecord, QcResult, QcIssue, QcRule, QcMode, IQcChecker } from '../../types/qc.types';
import { NlpResult } from '../../types/nlp.types';
import { completenessChecker } from './checkers/completeness';
import { timelinessChecker } from './checkers/timeliness';
import { consistencyChecker } from './checkers/consistency';
import { formattingChecker } from './checkers/formatting';
import { logicChecker } from './checkers/logic';
import { diagnosisChecker } from './checkers/diagnosis';
import { medicationSafetyChecker } from './checkers/medicationSafety';
import { contentRuleChecker } from './checkers/contentRule';
import { crossDocumentChecker } from './checkers/crossDocument';
import { duplicateChecker } from './checkers/duplicate';

/**
 * 质控模式对应的 checker 名称列表
 */
const MODE_CHECKERS: Record<string, string[]> = {
  fast: ['completeness', 'formatting'],
  standard: ['completeness', 'timeliness', 'consistency', 'formatting', 'logic'],
  comprehensive: [
    'completeness', 'timeliness', 'consistency', 'formatting', 'logic',
    'diagnosis', 'medication_safety', 'content_rule', 'cross_document', 'duplicate',
  ],
  ai: [
    'completeness', 'timeliness', 'consistency', 'formatting', 'logic',
    'diagnosis', 'medication_safety', 'content_rule', 'cross_document', 'duplicate',
  ],
};

/** critical 问题存在时的总分上限 */
const CRITICAL_SCORE_CAP = 59;

/**
 * 质控引擎
 */
export class QcEngineService {
  private checkers: IQcChecker[] = [
    completenessChecker,
    timelinessChecker,
    consistencyChecker,
    formattingChecker,
    logicChecker,
    diagnosisChecker,
    medicationSafetyChecker,
    contentRuleChecker,
    crossDocumentChecker,
    duplicateChecker,
  ];

  /**
   * 根据质控模式获取对应的 checker 列表
   * B2: 质控模式生效
   */
  private getCheckersForMode(mode: string): IQcChecker[] {
    const enabledNames = MODE_CHECKERS[mode] ?? MODE_CHECKERS.comprehensive;
    return this.checkers.filter(c => enabledNames.includes(c.name));
  }

  /**
   * 执行完整的质控流程
   * @param record 医疗记录
   * @param nlpResult NLP 处理结果
   * @param rules 质控规则
   * @param options 执行选项（mode 控制模式，checkers 手动指定覆盖模式）
   * @returns 质控结果
   */
  async runQc(
    record: MedicalRecord,
    nlpResult: NlpResult,
    rules: QcRule[],
    options?: {
      mode?: QcMode;
      checkers?: string[];
      stopOnCritical?: boolean;
    }
  ): Promise<QcResult> {
    const issues: QcIssue[] = [];
    const scores: Record<string, number> = {};

    // B2: 确定要执行的检查器（手动指定 > 模式 > 默认 comprehensive）
    let checkersToRun: IQcChecker[];
    if (options?.checkers && options.checkers.length > 0) {
      checkersToRun = this.checkers.filter(c => options.checkers!.includes(c.name));
    } else {
      const mode = options?.mode ?? 'comprehensive';
      checkersToRun = this.getCheckersForMode(mode);
    }

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
    const hasCritical = issues.some(i => i.severity === 'critical');
    const rawScore = this.calculateOverallScore(scores);

    // B1: critical 问题直接封顶 59 分（不合格）
    const overallScore = hasCritical ? Math.min(rawScore, CRITICAL_SCORE_CAP) : rawScore;

    // 确定质控状态
    const status = this.determineStatus(issues, overallScore);

    return {
      recordId: record.id,
      totalScore: overallScore,
      issues,
      scores,
      overallScore,
      status,
      mode: options?.mode ?? 'comprehensive',
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
   * 计算总体评分（各 checker 等权平均）
   * @param scores 各检查器的评分
   * @returns 总体评分（0-100）
   */
  private calculateOverallScore(scores: Record<string, number>): number {
    const scoreValues = Object.values(scores);

    if (scoreValues.length === 0) {
      return 0;
    }

    const average = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
    return Math.round(average);
  }

  /**
   * 确定质控状态
   * B1: critical 直接 fail
   */
  private determineStatus(issues: QcIssue[], overallScore: number): 'pass' | 'pass_with_warning' | 'fail' {
    // 有 critical 问题 → 直接不合格
    if (issues.some(i => i.severity === 'critical')) {
      return 'fail';
    }

    // 评分低于 60 → 不合格
    if (overallScore < 60) {
      return 'fail';
    }

    // 有 major 问题或评分低于 70 → 警告
    if (issues.some(i => i.severity === 'major') || overallScore < 70) {
      return 'pass_with_warning';
    }

    // 否则通过
    return 'pass';
  }

  /**
   * 获取质控报告
   */
  generateReport(result: QcResult): {
    summary: string;
    issuesByType: Record<string, QcIssue[]>;
    issuesBySeverity: Record<string, QcIssue[]>;
    scoreBreakdown: Record<string, number>;
    recommendations: string[];
  } {
    const issuesByType: Record<string, QcIssue[]> = {};
    for (const issue of result.issues) {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    }

    const issuesBySeverity: Record<string, QcIssue[]> = {
      critical: [],
      major: [],
      minor: [],
    };
    for (const issue of result.issues) {
      issuesBySeverity[issue.severity].push(issue);
    }

    const recommendations: string[] = [];
    if (issuesBySeverity.critical.length > 0) {
      recommendations.push('存在致命问题，病历直接判定不合格，必须立即修正');
    }
    if (issuesBySeverity.major.length > 0) {
      recommendations.push('尽快处理主要问题，避免影响诊疗质量');
    }
    if ((result.overallScore ?? 0) < 60) {
      recommendations.push('建议全面审查病历，当前评分不合格');
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
