/**
 * Phase 3 Router Layer Tests
 * Tests for all tRPC router procedures using appRouter.createCaller()
 * Uses real DB connection (same pattern as db.test.ts)
 */

import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ============================================================
// Test context helpers
// ============================================================

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

// ============================================================
// Auth Router Tests
// ============================================================

describe("auth router", () => {
  it("auth.me returns null for unauthenticated context", async () => {
    const unauthCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(unauthCtx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated context", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });

  it("auth.ext.getRole returns role and permissions for admin", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.auth.ext.getRole();
    expect(result.role).toBe("admin");
    expect(result.permissions).toContain("manage:users");
    expect(result.permissions).toContain("write:rules");
  });

  it("auth.ext.getRole returns limited permissions for doctor", async () => {
    const caller = appRouter.createCaller(doctorCtx);
    const result = await caller.auth.ext.getRole();
    expect(result.role).toBe("doctor");
    expect(result.permissions).toContain("write:records");
    expect(result.permissions).not.toContain("manage:users");
  });

  it("auth.ext.checkPermission returns true for valid permission", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.auth.ext.checkPermission({ permission: "manage:users" });
    expect(result.hasPermission).toBe(true);
  });

  it("auth.ext.checkPermission returns false for invalid permission", async () => {
    const caller = appRouter.createCaller(userCtx);
    const result = await caller.auth.ext.checkPermission({ permission: "manage:users" });
    expect(result.hasPermission).toBe(false);
  });

  it("auth.ext.listUsers throws for non-admin", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(caller.auth.ext.listUsers()).rejects.toThrow("权限不足");
  });
});

// ============================================================
// Records Router Tests
// ============================================================

describe("records router", () => {
  let createdRecordId: number;

  it("records.create requires doctor or admin role", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(
      caller.records.create({
        patientName: "测试患者",
        recordType: "inpatient",
        content: "测试内容",
      })
    ).rejects.toThrow("权限不足");
  });

  it("records.create succeeds for doctor", async () => {
    const caller = appRouter.createCaller(doctorCtx);
    const result = await caller.records.create({
      patientName: "路由测试患者-李四",
      recordType: "inpatient",
      content: "主诉：发热2天\n现病史：患者2天前出现发热，体温38.5℃",
      admissionDate: new Date("2026-02-01"),
    });
    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
    createdRecordId = result.id;
  });

  it("records.getById returns the created record", async () => {
    if (!createdRecordId) return;
    const caller = appRouter.createCaller(doctorCtx);
    const record = await caller.records.getById({ id: createdRecordId });
    expect(record.patientName).toBe("路由测试患者-李四");
    expect(record.recordType).toBe("inpatient");
  });

  it("records.list returns paginated records", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.records.list({ page: 1, pageSize: 10 });
    expect(result.records).toBeInstanceOf(Array);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it("records.search returns results for valid query", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.records.search({ query: "路由测试" });
    expect(result.results).toBeInstanceOf(Array);
  });

  it("records.count returns total count", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.records.count();
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it("records.delete requires admin role", async () => {
    const caller = appRouter.createCaller(doctorCtx);
    await expect(
      caller.records.delete({ id: 99999 })
    ).rejects.toThrow("权限不足");
  });

  it("records.getById throws for non-existent record", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.records.getById({ id: 99999 })
    ).rejects.toThrow("病历不存在");
  });
});

// ============================================================
// Rules Router Tests
// ============================================================

describe("rules router", () => {
  let createdRuleId: number;

  it("rules.create requires admin role", async () => {
    const caller = appRouter.createCaller(qcStaffCtx);
    await expect(
      caller.rules.create({
        ruleId: "test_rule_001",
        name: "测试规则",
        category: "completeness",
        condition: "test condition",
        severity: "minor",
      })
    ).rejects.toThrow("权限不足");
  });

  it("rules.create succeeds for admin", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.rules.create({
      ruleId: `router_test_rule_${Date.now()}`,
      name: "路由测试规则",
      category: "completeness",
      condition: "field_missing:diagnosis",
      severity: "major",
      description: "测试用规则",
      status: "draft",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
    createdRuleId = result.id;
  });

  it("rules.list returns paginated rules", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.rules.list({ page: 1, pageSize: 10 });
    expect(result.rules).toBeInstanceOf(Array);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it("rules.getStatistics returns rule counts", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.rules.getStatistics();
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.categories).toBeInstanceOf(Array);
  });

  it("rules.publish requires admin role", async () => {
    const caller = appRouter.createCaller(qcStaffCtx);
    await expect(
      caller.rules.publish({ id: 1 })
    ).rejects.toThrow("权限不足");
  });

  it("rules.getById throws for non-existent rule", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.rules.getById({ id: 99999 })
    ).rejects.toThrow("规则不存在");
  });
});

// ============================================================
// Config Router Tests
// ============================================================

describe("config router", () => {
  it("config.list returns all configs", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.config.list({});
    expect(result).toBeInstanceOf(Array);
  });

  it("config.getByType returns configs for type", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.config.getByType({ type: "lab_reference" });
    expect(result).toBeInstanceOf(Array);
  });

  it("config.create requires admin role", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(
      caller.config.create({
        configType: "test",
        configKey: "test_key",
        configValue: "test_value",
      })
    ).rejects.toThrow("权限不足");
  });

  it("config.create succeeds for admin", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.config.create({
      configType: "test",
      configKey: `test_key_${Date.now()}`,
      configValue: "test_value",
      description: "路由测试配置",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
  });

  it("config.getQcConfig returns key-value map", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.config.getQcConfig();
    expect(typeof result).toBe("object");
  });

  it("config.getSystemInfo returns config count", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.config.getSystemInfo();
    expect(result.configCount).toBeGreaterThanOrEqual(0);
    expect(result.types).toBeInstanceOf(Array);
  });
});

// ============================================================
// Drug Knowledge Router Tests
// ============================================================

describe("drugs router", () => {
  it("drugs.list returns paginated drugs", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.drugs.list({ page: 1, pageSize: 10 });
    expect(result.drugs).toBeInstanceOf(Array);
  });

  it("drugs.search returns results", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.drugs.search({ query: "阿司匹林" });
    expect(result.results).toBeInstanceOf(Array);
  });

  it("drugs.getStatistics returns category counts", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.drugs.getStatistics();
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.categories).toBeInstanceOf(Array);
  });

  it("drugs.create requires admin role", async () => {
    const caller = appRouter.createCaller(doctorCtx);
    await expect(
      caller.drugs.create({ drugName: "测试药品" })
    ).rejects.toThrow("权限不足");
  });

  it("drugs.getByName throws for non-existent drug", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.drugs.getByName({ name: "不存在的药品_xyz_12345" })
    ).rejects.toThrow("药品不存在");
  });
});

// ============================================================
// Medical Terminology Router Tests
// ============================================================

describe("terminology router", () => {
  it("terminology.list returns paginated terminologies", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.terminology.list({ page: 1, pageSize: 10 });
    expect(result.terminologies).toBeInstanceOf(Array);
  });

  it("terminology.search returns results", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.terminology.search({ query: "高血压" });
    expect(result.results).toBeInstanceOf(Array);
  });

  it("terminology.getStatistics returns category counts", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.terminology.getStatistics();
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.categories).toBeInstanceOf(Array);
  });

  it("terminology.create requires admin role", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(
      caller.terminology.create({
        term: "测试术语",
        standardName: "测试标准名",
        category: "diagnosis",
      })
    ).rejects.toThrow("权限不足");
  });

  it("terminology.getByName throws for non-existent term", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.terminology.getByName({ name: "不存在的术语_xyz_12345" })
    ).rejects.toThrow("术语不存在");
  });
});

// ============================================================
// Statistics Router Tests
// ============================================================

describe("statistics router", () => {
  it("statistics.getQcStatistics returns stats", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.statistics.getQcStatistics({});
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.passRate).toBeGreaterThanOrEqual(0);
    expect(result.passRate).toBeLessThanOrEqual(100);
  });

  it("statistics.getTrendAnalysis returns grouped data", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-12-31");
    const result = await caller.statistics.getTrendAnalysis({
      startDate,
      endDate,
      groupBy: "month",
    });
    expect(result.trend).toBeDefined();
    expect(result.period.groupBy).toBe("month");
  });

  it("statistics.getDepartmentStatistics returns department data", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.statistics.getDepartmentStatistics({});
    expect(typeof result).toBe("object");
  });

  it("statistics.getRecentStats returns recent data", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.statistics.getRecentStats({ days: 7 });
    expect(result).toBeInstanceOf(Array);
  });
});

// ============================================================
// QC Router Tests
// ============================================================

describe("qc router", () => {
  it("qc.list returns paginated results", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.qc.list({ page: 1, pageSize: 10 });
    expect(result.results).toBeInstanceOf(Array);
  });

  it("qc.getRules returns paginated rules", async () => {
    const caller = appRouter.createCaller(qcStaffCtx);
    const result = await caller.qc.getRules({ page: 1, pageSize: 10 });
    expect(result.rules).toBeInstanceOf(Array);
  });

  it("qc.getStatistics returns counts", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.qc.getStatistics();
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.passRate).toBeGreaterThanOrEqual(0);
  });

  it("qc.execute requires qc_staff or admin role", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(
      caller.qc.execute({ recordId: 1, mode: "auto" })
    ).rejects.toThrow("权限不足");
  });

  it("qc.execute throws for non-existent record", async () => {
    const caller = appRouter.createCaller(qcStaffCtx);
    await expect(
      caller.qc.execute({ recordId: 99999, mode: "auto" })
    ).rejects.toThrow("病历不存在");
  });
});

// ============================================================
// Spot Check Router Tests
// ============================================================

describe("spotCheck router", () => {
  it("spotCheck.list returns paginated spot checks", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.spotCheck.list({ page: 1, pageSize: 10 });
    expect(result.spotChecks).toBeInstanceOf(Array);
  });

  it("spotCheck.getStatistics returns counts", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.spotCheck.getStatistics();
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it("spotCheck.create requires qc_staff or admin role", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(
      caller.spotCheck.create({ recordId: 1 })
    ).rejects.toThrow("权限不足");
  });

  it("spotCheck.getById throws for non-existent record", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.spotCheck.getById({ id: 99999 })
    ).rejects.toThrow("抽查记录不存在");
  });
});

// ============================================================
// NLP Router Tests
// ============================================================

describe("nlp router", () => {
  it("nlp.process with direct content returns result", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.nlp.process({
      content: "主诉：头痛3天\n【现病史】患者3天前出现头痛，体温37.8℃，血压130/85mmHg",
    });
    expect(result).toBeDefined();
    expect(result.sectionMap).toBeDefined();
    expect(result.entities).toBeInstanceOf(Array);
    expect(result.indicators).toBeInstanceOf(Array);
  });

  it("nlp.process throws when neither recordId nor content provided", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.nlp.process({})
    ).rejects.toThrow("必须提供 recordId 或 content");
  });

  it("nlp.process throws for non-existent recordId", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.nlp.process({ recordId: 99999 })
    ).rejects.toThrow("病历不存在");
  });
});

// ============================================================
// Report Router Tests
// ============================================================

describe("report router", () => {
  it("report.getStatistics returns report counts", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.report.getStatistics({});
    expect(result.totalReports).toBeGreaterThanOrEqual(0);
    expect(result.passRate).toBeGreaterThanOrEqual(0);
  });

  it("report.generate throws for non-existent result", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.report.generate({ resultId: 99999 })
    ).rejects.toThrow("质控结果不存在");
  });

  it("report.exportCsv returns csv for empty list", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.report.exportCsv({ resultIds: [] });
    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
  });
});

// ============================================================
// Feedback Router Tests
// ============================================================
describe("feedback router", () => {
  it("feedback.list throws FORBIDDEN for doctor role", async () => {
    const caller = appRouter.createCaller(doctorCtx);
    await expect(
      caller.feedback.list({})
    ).rejects.toThrow();
  });

  it("feedback.list returns paginated results for admin", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.feedback.list({ page: 1, pageSize: 10 });
    expect(result.items).toBeInstanceOf(Array);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it("feedback.list supports checkerType filter", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.feedback.list({ checkerType: "completeness" });
    expect(result.items).toBeInstanceOf(Array);
    result.items.forEach(item => {
      expect(item.checkerType).toBe("completeness");
    });
  });

  it("feedback.listByRecord returns empty array for non-existent record", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.feedback.listByRecord({ recordId: 99999 });
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
  });

  it("feedback.submit throws for invalid feedbackType", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(
      caller.feedback.submit({
        recordId: 1,
        checkerType: "completeness",
        issueId: "CHIEF_COMPLAINT_MISSING",
        feedbackType: "invalid_type" as any,
      })
    ).rejects.toThrow();
  });
});
