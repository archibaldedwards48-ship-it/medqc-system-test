/**
 * 病历管理路由
 * 处理病历的 CRUD、搜索等操作
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  createMedicalRecord,
  getMedicalRecordById,
  getAllMedicalRecords,
  updateMedicalRecord,
  deleteMedicalRecord,
  searchMedicalRecords,
  getMedicalRecordsByDoctor,
  getMedicalRecordsByType,
  countMedicalRecords,
} from '../db';

export const recordsRouter = router({
  /**
   * 获取所有病历（分页）
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
        recordType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const records = input.recordType
        ? await getMedicalRecordsByType(input.recordType, input.pageSize, offset)
        : await getAllMedicalRecords(input.pageSize, offset);

      const total = await countMedicalRecords();

      return {
        records,
        page: input.page,
        pageSize: input.pageSize,
        total,
      };
    }),

  /**
   * 获取单个病历详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const record = await getMedicalRecordById(input.id);

      if (!record) {
        throw new Error('病历不存在');
      }

      return record;
    }),

  /**
   * 创建新病历
   */
  create: protectedProcedure
    .input(
      z.object({
        patientName: z.string().min(1),
        recordType: z.string(),
        content: z.string().min(1),
        admissionDate: z.date().optional(),
        dischargeDate: z.date().optional(),
        doctorId: z.number().int().optional(),
        departmentId: z.number().int().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'doctor' && ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅医生或管理员可创建病历');
      }

      const insertId = await createMedicalRecord({
        patientName: input.patientName,
        recordType: input.recordType,
        content: input.content,
        admissionDate: input.admissionDate,
        dischargeDate: input.dischargeDate,
        doctorId: input.doctorId ?? (ctx.user as any).id,
        departmentId: input.departmentId,
      });

      return { id: insertId, success: true };
    }),

  /**
   * 更新病历
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        content: z.string().optional(),
        recordType: z.string().optional(),
        admissionDate: z.date().optional(),
        dischargeDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'doctor' && ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅医生或管理员可更新病历');
      }

      const { id, ...data } = input;
      await updateMedicalRecord(id, data);

      return { success: true };
    }),

  /**
   * 删除病历
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可删除病历');
      }

      await deleteMedicalRecord(input.id);

      return { success: true };
    }),

  /**
   * 搜索病历（按患者姓名）
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
      const offset = (input.page - 1) * input.pageSize;

      const results = await searchMedicalRecords(input.query, input.pageSize, offset);

      return {
        results,
        page: input.page,
        pageSize: input.pageSize,
        total: results.length,
      };
    }),

  /**
   * 获取医生的所有病历
   */
  getByDoctor: protectedProcedure
    .input(
      z.object({
        doctorId: z.number().int(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const records = await getMedicalRecordsByDoctor(input.doctorId, input.pageSize, offset);

      return {
        records,
        page: input.page,
        pageSize: input.pageSize,
        total: records.length,
      };
    }),

  /**
   * 获取病历总数
   */
  count: protectedProcedure
    .query(async () => {
      const total = await countMedicalRecords();
      return { total };
    }),
});
