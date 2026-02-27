/**
 * 质控执行路由
 * 处理质控的执行、结果查询等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  getMedicalRecordById,
  createQcResult,
  getQcResultById,
  getAllQcResults,
  getQcResultByMedicalRecordId,
  updateQcResult,
  getAllQcRules,
  getQcRulesByCategory,
  createQcIssues,
} from '../db';
import { nlpPipeline } from '../services/nlp/pipeline';
import { qcEngine } from '../services/qc/qcEngine';

export const qcRouter = router({
  /**
   * 执行质控
   */
  execute: protectedProcedure
    .input(
      z.object({
        recordId: z.number().int(),
        mode: z.enum(['auto', 'manual', 'ai']).default('auto'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'qc_staff' && ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅质控人员或管理员可执行质控');
      }

      // 获取医疗记录
      const record = await getMedicalRecordById(input.recordId);
      if (!record) {
        throw new Error('病历不存在');
      }

      // 执行 NLP Pipeline
      const nlpResult = await nlpPipeline.process(record.content);

      // 获取质控规则
      const rules = await getAllQcRules();

      // 将数据库规则转换为 QcRule 类型
      const qcRules = rules.map(r => ({
        id: r.id,
        ruleId: r.ruleId,
        name: r.name,
        description: r.description ?? '',
        category: r.category as import('../types/rule.types').RuleCategory,
        severity: r.severity as 'critical' | 'major' | 'minor',
        condition: r.condition,
        version: '1',
        status: (r.status ?? 'active') as import('../types/rule.types').RuleStatus,
      }));

      // 将数据库记录转换为 MedicalRecord 类型
      const medRecord = {
        id: record.id,
        content: record.content,
        patientName: record.patientName,
        recordType: record.recordType,
        admissionDate: record.admissionDate ?? undefined,
        dischargeDate: record.dischargeDate ?? undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };

      // 执行质控引擎
      const qcResult = await qcEngine.runQc(medRecord, nlpResult, qcRules, {
        stopOnCritical: false,
      });

      // 保存质控结果
      const insertId = await createQcResult({
        medicalRecordId: input.recordId,
        qcStaffId: (ctx.user as any).id,
        qcMode: input.mode,
        totalScore: String(qcResult.totalScore),
        isQualified: (qcResult.status ?? 'fail') === 'pass',
      });

      // 保存质控问题
      if (qcResult.issues.length > 0) {
        await createQcIssues(
          insertId,
          qcResult.issues.map(issue => ({
            type: issue.type,
            severity: issue.severity,
            message: issue.message,
            suggestion: issue.suggestion,
            ruleId: issue.ruleId,
          }))
        );
      }

      return {
        id: insertId,
        recordId: input.recordId,
        totalScore: qcResult.totalScore,
        overallScore: qcResult.overallScore ?? qcResult.totalScore,
        status: qcResult.status ?? 'fail',
        issues: qcResult.issues,
        scores: qcResult.scores ?? {},
        mode: input.mode,
      };
    }),

  /**
   * 获取质控结果
   */
  getResult: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const result = await getQcResultById(input.id);

      if (!result) {
        throw new Error('质控结果不存在');
      }

      return result;
    }),

  /**
   * 获取病历的最新质控结果
   */
  getByRecord: protectedProcedure
    .input(z.object({ recordId: z.number().int() }))
    .query(async ({ input }) => {
      const result = await getQcResultByMedicalRecordId(input.recordId);
      return result ?? null;
    }),

  /**
   * 获取所有质控结果（分页）
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const results = await getAllQcResults(input.pageSize, offset);

      return {
        results,
        page: input.page,
        pageSize: input.pageSize,
        total: results.length,
      };
    }),

  /**
   * 更新质控结果
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        isQualified: z.boolean().optional(),
        totalScore: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'qc_staff' && ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅质控人员或管理员可更新质控结果');
      }

      const { id, ...data } = input;
      await updateQcResult(id, data);

      return { success: true };
    }),

  /**
   * 获取质控规则（按分类）
   */
  getRules: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const rules = input.category
        ? await getQcRulesByCategory(input.category)
        : await getAllQcRules();

      const paginated = rules.slice(offset, offset + input.pageSize);

      return {
        rules: paginated,
        page: input.page,
        pageSize: input.pageSize,
        total: rules.length,
      };
    }),

  /**
   * 获取质控统计
   */
  getStatistics: protectedProcedure
    .query(async () => {
      const results = await getAllQcResults(10000, 0);

      const passCount = results.filter(r => r.isQualified).length;
      const failCount = results.length - passCount;
      const avgScore = results.length > 0
        ? Math.round(
            results.reduce((sum, r) => sum + parseFloat(r.totalScore ?? '0'), 0) / results.length
          )
        : 0;

      return {
        total: results.length,
        pass: passCount,
        fail: failCount,
        passRate: results.length > 0 ? Math.round((passCount / results.length) * 100) : 0,
        averageScore: avgScore,
      };
    }),
});
