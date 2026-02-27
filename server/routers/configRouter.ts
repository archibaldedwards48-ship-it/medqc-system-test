/**
 * 系统配置管理路由
 * 处理质控配置、参数管理等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  getQcConfigsByType,
  getQcConfigById,
  getAllQcConfigs,
  createQcConfig,
  updateQcConfig,
} from '../db';

export const configRouter = router({
  /**
   * 获取所有配置
   */
  list: protectedProcedure
    .input(
      z.object({
        type: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const configs = input.type
        ? await getQcConfigsByType(input.type)
        : await getAllQcConfigs();

      return configs;
    }),

  /**
   * 按 ID 获取配置
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const config = await getQcConfigById(input.id);

      if (!config) {
        throw new Error('配置不存在');
      }

      return config;
    }),

  /**
   * 按类型获取配置
   */
  getByType: protectedProcedure
    .input(z.object({ type: z.string() }))
    .query(async ({ input }) => {
      const configs = await getQcConfigsByType(input.type);
      return configs;
    }),

  /**
   * 创建配置
   */
  create: protectedProcedure
    .input(
      z.object({
        configType: z.string(),
        configKey: z.string(),
        configValue: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可创建配置');
      }

      const insertId = await createQcConfig({
        configType: input.configType,
        configKey: input.configKey,
        configValue: input.configValue,
        description: input.description,
      });

      return { id: insertId, success: true };
    }),

  /**
   * 更新配置
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        configValue: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可更新配置');
      }

      const { id, ...data } = input;
      await updateQcConfig(id, data);

      return { success: true };
    }),

  /**
   * 获取质控配置（键值对形式）
   */
  getQcConfig: protectedProcedure
    .query(async () => {
      const configs = await getQcConfigsByType('qc');

      return configs.reduce((acc, config) => {
        acc[config.configKey] = config.configValue;
        return acc;
      }, {} as Record<string, string>);
    }),

  /**
   * 更新质控配置（upsert）
   */
  updateQcConfig: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可更新质控配置');
      }

      const configs = await getQcConfigsByType('qc');
      const existingConfig = configs.find(c => c.configKey === input.key);

      if (existingConfig) {
        await updateQcConfig(existingConfig.id, { configValue: input.value });
        return { success: true, action: 'updated' };
      } else {
        const insertId = await createQcConfig({
          configType: 'qc',
          configKey: input.key,
          configValue: input.value,
        });
        return { id: insertId, success: true, action: 'created' };
      }
    }),

  /**
   * 获取系统信息
   */
  getSystemInfo: protectedProcedure
    .query(async () => {
      const configs = await getAllQcConfigs();

      return {
        configCount: configs.length,
        types: Array.from(new Set(configs.map(c => c.configType))),
        lastUpdated: new Date(),
      };
    }),
});
