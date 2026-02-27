/**
 * 抽查管理路由
 * 处理抽查的创建、查询、结果等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  createSpotCheckRecord,
  getSpotCheckRecords,
  getSpotCheckResultById,
  getMedicalRecordById,
  countSpotCheckRecords,
} from '../db';
import { nlpPipeline } from '../services/nlp/pipeline';
import { qcEngine } from '../services/qc/qcEngine';

export const spotCheckRouter = router({
  /**
   * 创建抽查
   */
  create: protectedProcedure
    .input(
      z.object({
        recordId: z.number().int(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'qc_staff' && ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅质控人员或管理员可创建抽查');
      }

      const insertId = await createSpotCheckRecord({
        medicalRecordId: input.recordId,
        qcStaffId: (ctx.user as any).id,
        qcMode: 'spot_check',
        totalScore: null,
        isQualified: false,
      });

      return { id: insertId, success: true };
    }),

  /**
   * 获取所有抽查（分页）
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

      const spotChecks = await getSpotCheckRecords(input.pageSize, offset);
      const total = await countSpotCheckRecords();

      return {
        spotChecks,
        page: input.page,
        pageSize: input.pageSize,
        total,
      };
    }),

  /**
   * 获取抽查详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const spotCheck = await getSpotCheckResultById(input.id);

      if (!spotCheck) {
        throw new Error('抽查记录不存在');
      }

      return spotCheck;
    }),

  /**
   * 执行抽查质控
   */
  execute: protectedProcedure
    .input(
      z.object({
        spotCheckId: z.number().int(),
        recordId: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'qc_staff' && ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅质控人员或管理员可执行抽查');
      }

      // 获取医疗记录
      const record = await getMedicalRecordById(input.recordId);
      if (!record) {
        throw new Error('病历不存在');
      }

      // 执行 NLP Pipeline
      const nlpResult = await nlpPipeline.process(record.content);

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
      const qcResult = await qcEngine.runQc(medRecord, nlpResult, [], {
        stopOnCritical: false,
      });

      return {
        spotCheckId: input.spotCheckId,
        recordId: input.recordId,
        totalScore: qcResult.totalScore,
        isQualified: (qcResult.status ?? 'fail') === 'pass',
        issues: qcResult.issues,
        executedAt: new Date(),
      };
    }),

  /**
   * 获取抽查统计
   */
  getStatistics: protectedProcedure
    .query(async () => {
      const total = await countSpotCheckRecords();
      const spotChecks = await getSpotCheckRecords(100, 0);

      const qualified = spotChecks.filter(s => s.isQualified).length;

      return {
        total,
        qualified,
        unqualified: spotChecks.length - qualified,
        qualifiedRate: spotChecks.length > 0
          ? Math.round((qualified / spotChecks.length) * 100)
          : 0,
      };
    }),
});
