/**
 * NLP Pipeline 路由
 * 处理 NLP 处理、结果查询等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getMedicalRecordById } from '../db';
import { nlpPipeline } from '../services/nlp/pipeline';

export const nlpRouter = router({
  /**
   * 执行 NLP 处理
   */
  process: protectedProcedure
    .input(
      z.object({
        recordId: z.number().int().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let content: string;

      if (input.recordId) {
        const record = await getMedicalRecordById(input.recordId);
        if (!record) {
          throw new Error('病历不存在');
        }
        content = record.content;
      } else if (input.content) {
        content = input.content;
      } else {
        throw new Error('必须提供 recordId 或 content');
      }

      const result = await nlpPipeline.process(content);

      return result;
    }),

  /**
   * 获取段落信息
   */
  getSections: protectedProcedure
    .input(z.object({ recordId: z.number().int() }))
    .query(async ({ input }) => {
      const record = await getMedicalRecordById(input.recordId);
      if (!record) {
        throw new Error('病历不存在');
      }

      const result = await nlpPipeline.process(record.content);

      return {
        sections: Array.from(result.sectionMap.entries()).map(([name, section]) => ({
          name,
          content: section.content,
          startIndex: section.startIndex,
          endIndex: section.endIndex,
        })),
      };
    }),

  /**
   * 获取实体信息
   */
  getEntities: protectedProcedure
    .input(z.object({ recordId: z.number().int() }))
    .query(async ({ input }) => {
      const record = await getMedicalRecordById(input.recordId);
      if (!record) {
        throw new Error('病历不存在');
      }

      const result = await nlpPipeline.process(record.content);

      return {
        entities: result.entities,
        entityCount: result.entities.length,
        entityTypes: Array.from(new Set(result.entities.map(e => e.type))),
      };
    }),

  /**
   * 获取指标信息
   */
  getIndicators: protectedProcedure
    .input(z.object({ recordId: z.number().int() }))
    .query(async ({ input }) => {
      const record = await getMedicalRecordById(input.recordId);
      if (!record) {
        throw new Error('病历不存在');
      }

      const result = await nlpPipeline.process(record.content);

      return {
        indicators: result.indicators,
        indicatorCount: result.indicators.length,
        abnormalCount: result.indicators.filter(i => i.isAbnormal).length,
      };
    }),

  /**
   * 获取完整的 NLP 结果
   */
  getFullResult: protectedProcedure
    .input(z.object({ recordId: z.number().int() }))
    .query(async ({ input }) => {
      const record = await getMedicalRecordById(input.recordId);
      if (!record) {
        throw new Error('病历不存在');
      }

      const result = await nlpPipeline.process(record.content);

      return {
        sections: Array.from(result.sectionMap.entries()).map(([name, section]) => ({
          name,
          content: section.content,
        })),
        entities: result.entities,
        indicators: result.indicators,
        relationships: result.relationships,
        processedAt: new Date(),
      };
    }),

  /**
   * 验证 NLP 结果
   */
  validate: protectedProcedure
    .input(z.object({ recordId: z.number().int() }))
    .mutation(async ({ input }) => {
      const record = await getMedicalRecordById(input.recordId);
      if (!record) {
        throw new Error('病历不存在');
      }

      const result = await nlpPipeline.process(record.content);

      return {
        hasSections: result.sectionMap.size > 0,
        hasEntities: result.entities.length > 0,
        hasIndicators: result.indicators.length > 0,
        completeness: {
          sections: result.sectionMap.size,
          entities: result.entities.length,
          indicators: result.indicators.length,
        },
      };
    }),
});
