/**
 * 报告生成路由
 * 处理质控报告的生成、导出等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  getQcResultById,
  getAllQcResults,
  getMedicalRecordById,
  getQcIssuesByResultId,
} from '../db';
import { qcEngine } from '../services/qc/qcEngine';
import type { QcResult } from '../types/qc.types';

/**
 * 将数据库 QcResult 行转换为 QcEngine 所需的 QcResult 类型
 */
async function buildQcResultForEngine(resultId: number): Promise<QcResult | null> {
  const result = await getQcResultById(resultId);
  if (!result) return null;

  const issues = await getQcIssuesByResultId(resultId);

  return {
    recordId: result.medicalRecordId ?? undefined,
    totalScore: parseFloat(result.totalScore ?? '0'),
    overallScore: parseFloat(result.totalScore ?? '0'),
    status: result.isQualified ? 'pass' : 'fail',
    issues: issues.map(i => ({
      type: i.type as any,
      severity: i.severity as any,
      message: i.message,
      suggestion: i.suggestion ?? undefined,
      ruleId: i.ruleId ?? undefined,
    })),
    scores: {},
    timestamp: result.createdAt,
  };
}

export const reportRouter = router({
  /**
   * 生成质控报告
   */
  generate: protectedProcedure
    .input(z.object({ resultId: z.number().int() }))
    .query(async ({ input }) => {
      const qcResult = await buildQcResultForEngine(input.resultId);

      if (!qcResult) {
        throw new Error('质控结果不存在');
      }

      const record = qcResult.recordId
        ? await getMedicalRecordById(qcResult.recordId)
        : null;

      const report = qcEngine.generateReport(qcResult);

      return {
        ...report,
        recordInfo: record
          ? {
              id: record.id,
              patientName: record.patientName,
              recordType: record.recordType,
              admissionDate: record.admissionDate,
            }
          : null,
      };
    }),

  /**
   * 生成批量报告
   */
  generateBatch: protectedProcedure
    .input(z.object({ resultIds: z.array(z.number().int()) }))
    .query(async ({ input }) => {
      const reports = [];

      for (const resultId of input.resultIds) {
        const qcResult = await buildQcResultForEngine(resultId);
        if (qcResult) {
          const report = qcEngine.generateReport(qcResult);
          reports.push(report);
        }
      }

      return {
        reports,
        count: reports.length,
      };
    }),

  /**
   * 导出报告为 CSV
   */
  exportCsv: protectedProcedure
    .input(z.object({ resultIds: z.array(z.number().int()) }))
    .query(async ({ input }) => {
      const rows = [];

      for (const resultId of input.resultIds) {
        const result = await getQcResultById(resultId);
        if (result) {
          const issues = await getQcIssuesByResultId(resultId);
          rows.push({
            resultId: result.id,
            recordId: result.medicalRecordId,
            isQualified: result.isQualified,
            totalScore: result.totalScore,
            issueCount: issues.length,
            createdAt: result.createdAt,
          });
        }
      }

      const headers = ['Result ID', 'Record ID', 'Is Qualified', 'Total Score', 'Issue Count', 'Created At'];
      const csvRows = rows.map(r => [
        r.resultId,
        r.recordId,
        r.isQualified ? 'Yes' : 'No',
        r.totalScore,
        r.issueCount,
        r.createdAt.toISOString(),
      ]);

      const csv = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      return {
        success: true,
        csv,
        count: rows.length,
      };
    }),

  /**
   * 获取报告统计
   */
  getStatistics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const results = await getAllQcResults(10000, 0);

      let filtered = results;
      if (input.startDate && input.endDate) {
        filtered = results.filter(r => {
          const date = r.createdAt;
          return date >= input.startDate! && date <= input.endDate!;
        });
      }

      const passCount = filtered.filter(r => r.isQualified).length;
      const failCount = filtered.length - passCount;
      const avgScore = filtered.length > 0
        ? Math.round(
            filtered.reduce((sum, r) => sum + parseFloat(r.totalScore ?? '0'), 0) / filtered.length
          )
        : 0;

      return {
        totalReports: filtered.length,
        passReports: passCount,
        failReports: failCount,
        passRate: filtered.length > 0 ? Math.round((passCount / filtered.length) * 100) : 0,
        averageScore: avgScore,
      };
    }),

  /**
   * 获取报告详情（含统计）
   */
  getDetail: protectedProcedure
    .input(z.object({ resultId: z.number().int() }))
    .query(async ({ input }) => {
      const qcResult = await buildQcResultForEngine(input.resultId);

      if (!qcResult) {
        throw new Error('质控结果不存在');
      }

      const stats = qcEngine.getStatistics(qcResult);

      return {
        result: qcResult,
        statistics: stats,
      };
    }),
});
