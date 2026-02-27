/**
 * D2: SOAP 模板路由
 * 提供 SOAP 模板的查询、列表和模糊匹配功能
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

export interface SoapTemplate {
  disease: string;
  icdCode: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// 加载模板数据
const loadTemplates = (): SoapTemplate[] => {
  try {
    const dataPath = path.resolve(process.cwd(), 'data/d2_soap_templates.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(rawData);
    }
  } catch (error) {
    console.error('Failed to load SOAP templates:', error);
  }
  return [];
};

const templates = loadTemplates();

export const templatesRouter = router({
  /**
   * 按疾病名查询 SOAP 模板
   */
  getByDisease: protectedProcedure
    .input(z.object({ disease: z.string() }))
    .query(async ({ input }) => {
      const template = templates.find(t => t.disease === input.disease);
      return template ?? null;
    }),

  /**
   * 返回所有模板列表
   */
  list: protectedProcedure.query(async () => {
    return templates;
  }),

  /**
   * 模糊匹配最相关的 SOAP 模板
   * D2: 接收诊断名称，模糊匹配最相关的 SOAP 模板
   */
  match: protectedProcedure
    .input(z.object({ diagnosis: z.string() }))
    .query(async ({ input }) => {
      if (!input.diagnosis) return null;

      // 简单模糊匹配：包含关系或相似度
      // 优先匹配完全包含的情况
      let matched = templates.find(t => 
        input.diagnosis.includes(t.disease) || t.disease.includes(input.diagnosis)
      );

      // 如果没匹配到，尝试按字符重合度简单匹配（可选，这里先实现包含关系）
      return matched ?? null;
    }),
});
