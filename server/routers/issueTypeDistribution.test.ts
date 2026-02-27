/**
 * B3: getIssueTypeDistribution 路由测试
 * 验证 statistics.getIssueTypeDistribution 路由返回结构正确
 */
import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';

// ---- helpers (与 routers.test.ts 保持一致) ----

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: 'test-user-openid',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext['res'],
  };
}

// ---- tests ----

describe('statistics.getIssueTypeDistribution', () => {
  it('should be a callable procedure on the router', () => {
    // 验证路由已注册
    expect(appRouter.statistics.getIssueTypeDistribution).toBeDefined();
  });

  it('should return an array with { type, count } items when DB is available', async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    try {
      const result = await caller.statistics.getIssueTypeDistribution();
      // 返回值应为数组
      expect(Array.isArray(result)).toBe(true);
      // 每个元素应包含 type (string) 和 count (number)
      for (const item of result) {
        expect(typeof item.type).toBe('string');
        expect(typeof item.count).toBe('number');
      }
    } catch (err: any) {
      // 如果数据库不可用，应抛出 Database Not Available 错误（与其他 DB 路由行为一致）
      expect(err.message).toContain('Database');
    }
  });

  it('should reject unauthenticated calls', async () => {
    const unauthCtx: TrpcContext = {
      user: null,
      req: { protocol: 'https', headers: {} } as TrpcContext['req'],
      res: {} as TrpcContext['res'],
    };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(caller.statistics.getIssueTypeDistribution()).rejects.toThrow();
  });
});
