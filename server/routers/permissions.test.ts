import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers"; // 修正路径：从 ../routers 导入
import type { TrpcContext } from "../_core/context";

// 复用 routers.test.ts 中的 Mock 逻辑
vi.mock("../db", async () => {
  const actual = await vi.importActual("../db") as any;
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue({}),
    getMedicalRecordById: vi.fn().mockImplementation(async (id) => ({ id, patientName: "Test", recordType: "inpatient" })),
    createMedicalRecord: vi.fn().mockResolvedValue(1),
    deleteMedicalRecord: vi.fn().mockResolvedValue({}),
    createQcRule: vi.fn().mockResolvedValue(1),
    getQcRuleById: vi.fn().mockResolvedValue({ id: 1 }),
    updateQcRule: vi.fn().mockResolvedValue({}),
    deleteQcRule: vi.fn().mockResolvedValue({}),
    getQcMessagesByRecord: vi.fn().mockResolvedValue([]),
    getQcIssuesByResultId: vi.fn().mockResolvedValue([]),
    getQcResultById: vi.fn().mockResolvedValue(null),
    getQcResultByMedicalRecordId: vi.fn().mockResolvedValue(null),
    getAllQcRules: vi.fn().mockResolvedValue([]),
    createQcResult: vi.fn().mockResolvedValue(1),
    createQcIssues: vi.fn().mockResolvedValue(undefined),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

const adminCtx = makeCtx(makeUser({ role: "admin" }));
const doctorCtx = makeCtx(makeUser({ role: "doctor" }));
const qcStaffCtx = makeCtx(makeUser({ role: "qc_staff" }));
const userCtx = makeCtx(makeUser({ role: "user" }));

describe("Permissions Matrix Verification", () => {
  describe("Sensitive Operation: 创建病历 (records.create)", () => {
    it("admin 应该允许", async () => {
      const caller = appRouter.createCaller(adminCtx);
      const result = await caller.records.create({ patientName: "T", recordType: "inpatient", content: "C" });
      expect(result.success).toBe(true);
    });
    it("doctor 应该允许", async () => {
      const caller = appRouter.createCaller(doctorCtx);
      const result = await caller.records.create({ patientName: "T", recordType: "inpatient", content: "C" });
      expect(result.success).toBe(true);
    });
    it("qc_staff 应该被拒绝", async () => {
      const caller = appRouter.createCaller(qcStaffCtx);
      await expect(caller.records.create({ patientName: "T", recordType: "inpatient", content: "C" })).rejects.toThrow();
    });
    it("user 应该被拒绝", async () => {
      const caller = appRouter.createCaller(userCtx);
      await expect(caller.records.create({ patientName: "T", recordType: "inpatient", content: "C" })).rejects.toThrow();
    });
  });

  describe("Sensitive Operation: 删除病历 (records.delete)", () => {
    it("admin 应该允许", async () => {
      const caller = appRouter.createCaller(adminCtx);
      const result = await caller.records.delete({ id: 1 });
      expect(result.success).toBe(true);
    });
    it("doctor 应该被拒绝", async () => {
      const caller = appRouter.createCaller(doctorCtx);
      await expect(caller.records.delete({ id: 1 })).rejects.toThrow();
    });
    it("qc_staff 应该被拒绝", async () => {
      const caller = appRouter.createCaller(qcStaffCtx);
      await expect(caller.records.delete({ id: 1 })).rejects.toThrow();
    });
    it("user 应该被拒绝", async () => {
      const caller = appRouter.createCaller(userCtx);
      await expect(caller.records.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("Sensitive Operation: 执行质控 (qc.execute)", () => {
    it("admin 应该允许", async () => {
      const caller = appRouter.createCaller(adminCtx);
      const result = await caller.qc.execute({ recordId: 1, mode: "auto" });
      expect(result).toBeDefined();
    });
    it("qc_staff 应该允许", async () => {
      const caller = appRouter.createCaller(qcStaffCtx);
      const result = await caller.qc.execute({ recordId: 1, mode: "auto" });
      expect(result).toBeDefined();
    });
    it("doctor 应该被拒绝", async () => {
      const caller = appRouter.createCaller(doctorCtx);
      await expect(caller.qc.execute({ recordId: 1, mode: "auto" })).rejects.toThrow();
    });
    it("user 应该被拒绝", async () => {
      const caller = appRouter.createCaller(userCtx);
      await expect(caller.qc.execute({ recordId: 1, mode: "auto" })).rejects.toThrow();
    });
  });

  describe("Sensitive Operation: 管理规则 (rules.create)", () => {
    it("admin 应该允许", async () => {
      const caller = appRouter.createCaller(adminCtx);
      const result = await caller.rules.create({ ruleId: "R1", name: "N", category: "completeness", condition: "{}", severity: "minor" });
      expect(result.success).toBe(true);
    });
    it("qc_staff 应该被拒绝", async () => {
      const caller = appRouter.createCaller(qcStaffCtx);
      await expect(caller.rules.create({ ruleId: "R1", name: "N", category: "completeness", condition: "{}", severity: "minor" })).rejects.toThrow();
    });
    it("doctor 应该被拒绝", async () => {
      const caller = appRouter.createCaller(doctorCtx);
      await expect(caller.rules.create({ ruleId: "R1", name: "N", category: "completeness", condition: "{}", severity: "minor" })).rejects.toThrow();
    });
    it("user 应该被拒绝", async () => {
      const caller = appRouter.createCaller(userCtx);
      await expect(caller.rules.create({ ruleId: "R1", name: "N", category: "completeness", condition: "{}", severity: "minor" })).rejects.toThrow();
    });
  });
});
