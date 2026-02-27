/**
 * QC 反馈路由
 * 处理质控问题的假阳性反馈、确认和建议
 */
import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createQcMessage,
  getQcMessagesByRecord,
  getQcMessages,
  countQcMessages,
} from '../db';

export const feedbackRouter = router({
  /**
   * 提交质控反馈
   * 医生、质控人员、管理员均可提交
   */
  submit: protectedProcedure
    .input(
      z.object({
        recordId: z.number().int().positive(),
        checkerType: z.string().min(1).max(64),
        issueId: z.string().min(1).max(128),
        feedbackType: z.enum(['false_positive', 'confirmed', 'suggestion']),
        note: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 所有已登录用户均可提交反馈
      const id = await createQcMessage({
        recordId: input.recordId,
        checkerType: input.checkerType,
        issueId: input.issueId,
        feedbackType: input.feedbackType,
        createdBy: ctx.user.id,
        note: input.note ?? null,
      });
      return { success: true, id };
    }),

  /**
   * 获取某条病历的所有反馈
   */
  listByRecord: protectedProcedure
    .input(
      z.object({
        recordId: z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {
      return getQcMessagesByRecord(input.recordId);
    }),

  /**
   * 管理员查看全部反馈（支持按 checkerType / feedbackType 筛选）
   */
  list: protectedProcedure
    .input(
      z.object({
        checkerType: z.string().optional(),
        feedbackType: z.enum(['false_positive', 'confirmed', 'suggestion']).optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'qc_staff') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '权限不足：仅管理员或质控人员可查看全部反馈' });
      }
      const offset = (input.page - 1) * input.pageSize;
      const [items, total] = await Promise.all([
        getQcMessages({
          checkerType: input.checkerType,
          feedbackType: input.feedbackType,
          limit: input.pageSize,
          offset,
        }),
        countQcMessages(input.checkerType),
      ]);
      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),
});
