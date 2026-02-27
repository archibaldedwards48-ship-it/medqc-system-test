/**
 * 统计分析路由
 * 处理质控统计、趋势分析等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  getAllQcResults,
  getAllMedicalRecords,
  getRecentStatistics,
  getIssueTypeDistribution,
} from '../db';

export const statisticsRouter = router({
  /**
   * 获取质控统计
   */
  getQcStatistics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const results = await getAllQcResults(10000, 0);

      // 过滤日期范围
      let filtered = results;
      if (input.startDate && input.endDate) {
        filtered = results.filter(r => {
          const date = r.createdAt;
          return date >= input.startDate! && date <= input.endDate!;
        });
      }

      // 计算统计信息
      const passCount = filtered.filter(r => r.isQualified).length;
      const failCount = filtered.length - passCount;
      const avgScore = filtered.length > 0
        ? Math.round(
            filtered.reduce((sum, r) => sum + parseFloat(r.totalScore ?? '0'), 0) / filtered.length
          )
        : 0;

      return {
        total: filtered.length,
        pass: passCount,
        fail: failCount,
        passRate: filtered.length > 0 ? Math.round((passCount / filtered.length) * 100) : 0,
        averageScore: avgScore,
        period: {
          startDate: input.startDate,
          endDate: input.endDate,
        },
      };
    }),

  /**
   * 获取趋势分析
   */
  getTrendAnalysis: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(['day', 'week', 'month']).default('day'),
      })
    )
    .query(async ({ input }) => {
      const results = await getAllQcResults(10000, 0);

      // 过滤日期范围
      const filtered = results.filter(r => {
        const date = r.createdAt;
        return date >= input.startDate && date <= input.endDate;
      });

      // 按时间分组
      const grouped: Record<string, { total: number; pass: number; fail: number; avgScore: number; scores: number[] }> = {};

      filtered.forEach(r => {
        const date = r.createdAt;
        let key: string;

        if (input.groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (input.groupBy === 'week') {
          const week = Math.floor((date.getTime() - input.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          key = `Week ${week + 1}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!grouped[key]) {
          grouped[key] = { total: 0, pass: 0, fail: 0, avgScore: 0, scores: [] };
        }

        grouped[key].total++;
        grouped[key].scores.push(parseFloat(r.totalScore ?? '0'));

        if (r.isQualified) grouped[key].pass++;
        else grouped[key].fail++;
      });

      // 计算平均分
      Object.keys(grouped).forEach(key => {
        const scores = grouped[key].scores;
        grouped[key].avgScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
        delete (grouped[key] as any).scores;
      });

      return {
        trend: grouped,
        period: {
          startDate: input.startDate,
          endDate: input.endDate,
          groupBy: input.groupBy,
        },
      };
    }),

  /**
   * 获取部门统计
   */
  getDepartmentStatistics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const records = await getAllMedicalRecords(10000, 0);

      // 过滤日期范围
      let filtered = records;
      if (input.startDate && input.endDate) {
        filtered = records.filter(r => {
          const date = r.createdAt;
          return date >= input.startDate! && date <= input.endDate!;
        });
      }

      // 按部门分组
      const byDepartment: Record<string, { recordCount: number }> = {};

      filtered.forEach(r => {
        const department = r.departmentId ? String(r.departmentId) : 'Unknown';
        if (!byDepartment[department]) {
          byDepartment[department] = { recordCount: 0 };
        }
        byDepartment[department].recordCount++;
      });

      return byDepartment;
    }),

  /**
   * 获取近期统计数据
   */
  getRecentStats: protectedProcedure
    .input(
      z.object({
        days: z.number().int().positive().max(365).default(30),
      })
    )
    .query(async ({ input }) => {
      const stats = await getRecentStatistics(input.days);
      return stats;
    }),

  /**
   * 获取问题类型分布统计
   * B3: 按 issue type 分组统计数量
   */
  getIssueTypeDistribution: protectedProcedure
    .query(async () => {
      const distribution = await getIssueTypeDistribution();
      return distribution;
    }),
});
