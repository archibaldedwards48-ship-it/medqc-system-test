/**
 * 医学术语库管理路由
 * 处理医学术语的查询、搜索等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  getMedicalTerminologyByTerm,
  getMedicalTerminologiesByCategory,
  getAllMedicalTerminologies,
  createMedicalTerminologyEntry,
  searchMedicalTerminology,
} from '../db';

export const medicalTerminologyRouter = router({
  /**
   * 获取所有术语（分页）
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

      const terminologies = input.category
        ? await getMedicalTerminologiesByCategory(input.category)
        : await getAllMedicalTerminologies();

      const paginated = terminologies.slice(offset, offset + input.pageSize);

      return {
        terminologies: paginated,
        page: input.page,
        pageSize: input.pageSize,
        total: terminologies.length,
      };
    }),

  /**
   * 按名称获取术语
   */
  getByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const terminology = await getMedicalTerminologyByTerm(input.name);

      if (!terminology) {
        throw new Error('术语不存在');
      }

      return terminology;
    }),

  /**
   * 搜索术语
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
      const results = await searchMedicalTerminology(input.query);

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
   * 创建术语
   */
  create: protectedProcedure
    .input(
      z.object({
        term: z.string().min(1),
        standardName: z.string(),
        category: z.string(),
        description: z.string().optional(),
        synonyms: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可添加术语');
      }

      const insertId = await createMedicalTerminologyEntry({
        term: input.term,
        standardName: input.standardName,
        category: input.category,
        description: input.description,
        synonyms: input.synonyms,
      });

      return { id: insertId, success: true };
    }),

  /**
   * 获取术语统计
   */
  getStatistics: protectedProcedure
    .query(async () => {
      const allTerminologies = await getAllMedicalTerminologies();

      const categories = new Set(allTerminologies.map(t => t.category));

      return {
        total: allTerminologies.length,
        categories: Array.from(categories),
        categoryCounts: Array.from(categories).reduce((acc, cat) => {
          acc[cat] = allTerminologies.filter(t => t.category === cat).length;
          return acc;
        }, {} as Record<string, number>),
      };
    }),
});
