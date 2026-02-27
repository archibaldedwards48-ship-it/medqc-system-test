/**
 * 规则库管理路由
 * 处理质控规则的 CRUD 等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  createQcRule,
  getQcRuleById,
  getAllQcRules,
  updateQcRule,
  deleteQcRule,
  getQcRulesByCategory,
  countQcRules,
} from '../db';

export const rulesRouter = router({
  /**
   * 获取所有规则（分页）
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
        category: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const rules = input.category
        ? await getQcRulesByCategory(input.category)
        : await getAllQcRules();

      // Filter by status if provided
      const filtered = input.status
        ? rules.filter(r => r.status === input.status)
        : rules;

      const paginated = filtered.slice(offset, offset + input.pageSize);

      return {
        rules: paginated,
        page: input.page,
        pageSize: input.pageSize,
        total: filtered.length,
      };
    }),

  /**
   * 获取单个规则详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const rule = await getQcRuleById(input.id);

      if (!rule) {
        throw new Error('规则不存在');
      }

      return rule;
    }),

  /**
   * 创建新规则
   */
  create: protectedProcedure
    .input(
      z.object({
        ruleId: z.string().min(1),
        name: z.string().min(1),
        category: z.string(),
        description: z.string().optional(),
        condition: z.string(),
        severity: z.enum(['critical', 'major', 'minor']),
        status: z.enum(['active', 'inactive', 'draft']).default('draft'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可创建规则');
      }

      const insertId = await createQcRule({
        ruleId: input.ruleId,
        name: input.name,
        category: input.category,
        description: input.description,
        condition: input.condition,
        severity: input.severity,
        status: input.status,
      });

      return { id: insertId, success: true };
    }),

  /**
   * 更新规则
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().optional(),
        description: z.string().optional(),
        condition: z.string().optional(),
        severity: z.enum(['critical', 'major', 'minor']).optional(),
        status: z.enum(['active', 'inactive', 'draft']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可更新规则');
      }

      const { id, ...data } = input;
      await updateQcRule(id, data);

      return { success: true };
    }),

  /**
   * 删除规则
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可删除规则');
      }

      await deleteQcRule(input.id);

      return { success: true };
    }),

  /**
   * 发布规则（从草稿到活跃）
   */
  publish: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可发布规则');
      }

      await updateQcRule(input.id, { status: 'active' });

      return { success: true };
    }),

  /**
   * 禁用规则
   */
  disable: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可禁用规则');
      }

      await updateQcRule(input.id, { status: 'inactive' });

      return { success: true };
    }),

  /**
   * 启用规则
   */
  enable: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可启用规则');
      }

      await updateQcRule(input.id, { status: 'active' });

      return { success: true };
    }),

  /**
   * 获取规则统计
   */
  getStatistics: protectedProcedure
    .query(async () => {
      const allRules = await getAllQcRules();
      const total = await countQcRules();

      const categories = new Set(allRules.map(r => r.category));
      const activeCount = allRules.filter(r => r.status === 'active').length;
      const draftCount = allRules.filter(r => r.status === 'draft').length;
      const inactiveCount = allRules.filter(r => r.status === 'inactive').length;

      return {
        total,
        active: activeCount,
        draft: draftCount,
        inactive: inactiveCount,
        categories: Array.from(categories),
        categoryCounts: Array.from(categories).reduce((acc, cat) => {
          acc[cat] = allRules.filter(r => r.category === cat).length;
          return acc;
        }, {} as Record<string, number>),
      };
    }),
});
