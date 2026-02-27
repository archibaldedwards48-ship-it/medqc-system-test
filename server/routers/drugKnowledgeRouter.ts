/**
 * 药品知识库管理路由
 * 处理药品信息的查询、搜索等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  getDrugByName,
  getDrugsByCategory,
  getAllDrugs,
  createDrug,
  searchDrugs,
} from '../db';

export const drugKnowledgeRouter = router({
  /**
   * 获取所有药品（分页）
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const drugs = input.category
        ? await getDrugsByCategory(input.category)
        : await getAllDrugs(input.pageSize, offset);

      return {
        drugs,
        page: input.page,
        pageSize: input.pageSize,
        total: drugs.length,
      };
    }),

  /**
   * 按名称获取药品
   */
  getByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const drug = await getDrugByName(input.name);

      if (!drug) {
        throw new Error('药品不存在');
      }

      return drug;
    }),

  /**
   * 搜索药品
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const results = await searchDrugs(input.query);

      const offset = (input.page - 1) * input.pageSize;
      const paginated = results.slice(offset, offset + input.pageSize);

      return {
        results: paginated,
        page: input.page,
        pageSize: input.pageSize,
        total: results.length,
      };
    }),

  /**
   * 创建药品
   */
  create: protectedProcedure
    .input(
      z.object({
        drugName: z.string().min(1),
        genericName: z.string().optional(),
        category: z.string().optional(),
        maxDailyDose: z.string().optional(),
        unit: z.string().optional(),
        contraindications: z.any().optional(),
        interactions: z.any().optional(),
        sideEffects: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可添加药品');
      }

      const insertId = await createDrug({
        drugName: input.drugName,
        genericName: input.genericName,
        category: input.category,
        maxDailyDose: input.maxDailyDose,
        unit: input.unit,
        contraindications: input.contraindications,
        interactions: input.interactions,
        sideEffects: input.sideEffects,
      });

      return { id: insertId, success: true };
    }),

  /**
   * 获取药品统计
   */
  getStatistics: protectedProcedure
    .query(async () => {
      const allDrugs = await getAllDrugs(100000, 0);

      const categories = new Set(allDrugs.map(d => d.category).filter(Boolean));

      return {
        total: allDrugs.length,
        categories: Array.from(categories),
        categoryCounts: Array.from(categories).reduce((acc, cat) => {
          acc[cat!] = allDrugs.filter(d => d.category === cat).length;
          return acc;
        }, {} as Record<string, number>),
      };
    }),
});
