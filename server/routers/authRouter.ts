/**
 * 认证相关路由（扩展）
 * 提供用户信息、角色权限查询等操作
 * 注意：基础 auth.me 和 auth.logout 由平台 routers.ts 处理
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getAllUsers, getUsersByRole, updateUser } from '../db';

/**
 * 根据角色获取权限列表
 */
function getPermissionsByRole(role: string): string[] {
  const permissionMap: Record<string, string[]> = {
    admin: [
      'read:records',
      'write:records',
      'delete:records',
      'read:qc_results',
      'write:qc_results',
      'read:rules',
      'write:rules',
      'delete:rules',
      'read:drugs',
      'write:drugs',
      'read:terminology',
      'write:terminology',
      'read:config',
      'write:config',
      'read:statistics',
      'manage:users',
    ],
    doctor: [
      'read:records',
      'write:records',
      'read:qc_results',
      'read:drugs',
      'read:terminology',
    ],
    qc_staff: [
      'read:records',
      'read:qc_results',
      'write:qc_results',
      'read:rules',
      'read:drugs',
      'read:terminology',
      'read:statistics',
    ],
    user: ['read:records'],
  };

  return permissionMap[role] || [];
}

export const authExtRouter = router({
  /**
   * 获取当前用户角色和权限
   */
  getRole: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        role: ctx.user.role,
        permissions: getPermissionsByRole(ctx.user.role),
      };
    }),

  /**
   * 检查权限
   */
  checkPermission: protectedProcedure
    .input(z.object({ permission: z.string() }))
    .query(async ({ input, ctx }) => {
      const permissions = getPermissionsByRole(ctx.user.role);
      return {
        hasPermission: permissions.includes(input.permission),
      };
    }),

  /**
   * 获取所有用户（管理员）
   */
  listUsers: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可查看用户列表');
      }
      return getAllUsers();
    }),

  /**
   * 按角色获取用户
   */
  getUsersByRole: protectedProcedure
    .input(z.object({ role: z.enum(['user', 'admin', 'doctor', 'qc_staff']) }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可按角色查询用户');
      }
      return getUsersByRole(input.role);
    }),

  /**
   * 更新用户角色（管理员）
   */
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.number().int(),
        role: z.enum(['user', 'admin', 'doctor', 'qc_staff']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('权限不足：仅管理员可修改用户角色');
      }
      await updateUser(input.userId, { role: input.role });
      return { success: true };
    }),
});
