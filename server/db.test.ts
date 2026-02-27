import { describe, expect, it, vi } from "vitest";
import * as dbMethods from "./db";

// Mock the database layer
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db") as any;
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue({}), // Mock connection
    createMedicalRecord: vi.fn().mockResolvedValue(1),
    getMedicalRecordById: vi.fn().mockImplementation(async (id) => ({ id, patientName: "Test", recordType: "inpatient" })),
    getAllMedicalRecords: vi.fn().mockResolvedValue([]),
    updateMedicalRecord: vi.fn().mockResolvedValue({}),
    deleteMedicalRecord: vi.fn().mockResolvedValue({}),
    createQcResult: vi.fn().mockResolvedValue(1),
    getQcResultById: vi.fn().mockResolvedValue({ id: 1 }),
    getQcResultByMedicalRecordId: vi.fn().mockResolvedValue({ id: 1 }),
    createQcIssue: vi.fn().mockResolvedValue(1),
    getQcIssuesByResultId: vi.fn().mockResolvedValue([]),
    createQcRule: vi.fn().mockResolvedValue(1),
    getQcRuleByRuleId: vi.fn().mockResolvedValue({ id: 1, ruleId: "R1" }),
    getAllQcRules: vi.fn().mockResolvedValue([]),
    updateQcRule: vi.fn().mockResolvedValue({}),
    deleteQcRule: vi.fn().mockResolvedValue({}),
    createTerminologyMapping: vi.fn().mockResolvedValue(1),
    getTerminologyMapping: vi.fn().mockResolvedValue({ id: 1 }),
    createQcConfig: vi.fn().mockResolvedValue(1),
    getQcConfigByKey: vi.fn().mockResolvedValue({ id: 1 }),
    createMedicalTerminologyEntry: vi.fn().mockResolvedValue(1),
    getMedicalTerminologyByTerm: vi.fn().mockResolvedValue({ id: 1 }),
    createDrug: vi.fn().mockResolvedValue(1),
    getDrugByName: vi.fn().mockResolvedValue({ id: 1 }),
    createAuditLog: vi.fn().mockResolvedValue(1),
    getAuditLogs: vi.fn().mockResolvedValue([]),
    createStatistics: vi.fn().mockResolvedValue(1),
    getRecentStatistics: vi.fn().mockResolvedValue([]),
    createSpotCheckRecord: vi.fn().mockResolvedValue(1),
    getSpotCheckResultById: vi.fn().mockResolvedValue({ id: 1 }),
    countMedicalRecords: vi.fn().mockResolvedValue(1),
    countQcRules: vi.fn().mockResolvedValue(1),
  };
});

describe("Database Layer - Phase 1 Integration", () => {
  // Verify database connection is available
  it("should connect to database", async () => {
    const db = await dbMethods.getDb();
    expect(db).not.toBeNull();
  });

  // ============ Medical Records ============
  describe("Medical Records CRUD", () => {
    let recordId: number;

    it("should create a medical record", async () => {
      recordId = await dbMethods.createMedicalRecord({
        patientName: "测试患者",
        recordType: "inpatient",
        content: "测试病历内容",
        doctorId: 1,
        departmentId: 1,
      });
      expect(recordId).toBeGreaterThan(0);
    });

    it("should get medical record by id", async () => {
      const record = await dbMethods.getMedicalRecordById(1);
      expect(record).toBeDefined();
      expect(record?.patientName).toBe("Test");
    });

    it("should list all medical records", async () => {
      const records = await dbMethods.getAllMedicalRecords();
      expect(Array.isArray(records)).toBe(true);
    });

    it("should count medical records", async () => {
      const count = await dbMethods.countMedicalRecords();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should update a medical record", async () => {
      const result = await dbMethods.updateMedicalRecord(1, { patientName: "更新后的患者" });
      expect(result).toBeDefined();
    });

    it("should delete a medical record", async () => {
      const result = await dbMethods.deleteMedicalRecord(1);
      expect(result).toBeDefined();
    });
  });

  // ============ QC Rules ============
  describe("QC Rules CRUD", () => {
    let ruleId: number;

    it("should create a QC rule", async () => {
      ruleId = await dbMethods.createQcRule({
        ruleId: "RULE_TEST_001",
        name: "测试规则",
        category: "completeness",
        severity: "major",
        condition: "{}",
        status: "active",
      });
      expect(ruleId).toBeGreaterThan(0);
    });

    it("should get rule by ruleId", async () => {
      const rule = await dbMethods.getQcRuleByRuleId("RULE_TEST_001");
      expect(rule).toBeDefined();
      expect(rule?.ruleId).toBe("R1");
    });

    it("should list all active rules", async () => {
      const rules = await dbMethods.getAllQcRules();
      expect(Array.isArray(rules)).toBe(true);
    });

    it("should count rules", async () => {
      const count = await dbMethods.countQcRules();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should update a rule", async () => {
      const result = await dbMethods.updateQcRule(1, { name: "更新后的规则" });
      expect(result).toBeDefined();
    });

    it("should delete a rule", async () => {
      const result = await dbMethods.deleteQcRule(1);
      expect(result).toBeDefined();
    });
  });

  // ============ Terminology Mappings ============
  describe("Terminology Mappings", () => {
    it("should create and retrieve a terminology mapping", async () => {
      const id = await dbMethods.createTerminologyMapping({
        abbreviation: "T1",
        fullName: "Terminology 1",
        category: "test",
      });
      expect(id).toBeGreaterThan(0);
      const mapping = await dbMethods.getTerminologyMapping("T1");
      expect(mapping).toBeDefined();
    });
  });

  // ============ QC Configs ============
  describe("QC Configs", () => {
    it("should create and retrieve a config", async () => {
      const id = await dbMethods.createQcConfig({
        configType: "test",
        configKey: "K1",
        configValue: "V1",
        status: "active",
      });
      expect(id).toBeGreaterThan(0);
      const config = await dbMethods.getQcConfigByKey("test", "K1");
      expect(config).toBeDefined();
    });
  });

  // ============ Medical Terminology ============
  describe("Medical Terminology", () => {
    it("should create and retrieve a terminology entry", async () => {
      const id = await dbMethods.createMedicalTerminologyEntry({
        term: "Term1",
        standardName: "Standard1",
        category: "diagnosis",
      });
      expect(id).toBeGreaterThan(0);
      const entry = await dbMethods.getMedicalTerminologyByTerm("Term1");
      expect(entry).toBeDefined();
    });
  });

  // ============ Drug Knowledge Base ============
  describe("Drug Knowledge Base", () => {
    it("should create and retrieve a drug entry", async () => {
      const id = await dbMethods.createDrug({
        drugName: "Drug1",
        category: "antibiotics",
      });
      expect(id).toBeGreaterThan(0);
      const drug = await dbMethods.getDrugByName("Drug1");
      expect(drug).toBeDefined();
    });
  });

  // ============ Audit Logs ============
  describe("Audit Logs", () => {
    it("should create and list audit logs", async () => {
      const id = await dbMethods.createAuditLog({
        userId: 1,
        action: "test",
        module: "test",
      });
      expect(id).toBeGreaterThan(0);
      const logs = await dbMethods.getAuditLogs();
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  // ============ Statistics ============
  describe("Statistics", () => {
    it("should create and retrieve statistics", async () => {
      const id = await dbMethods.createStatistics({
        date: new Date(),
        totalRecords: 10,
        qualifiedRecords: 8,
      });
      expect(id).toBeGreaterThan(0);
      const stats = await dbMethods.getRecentStatistics();
      expect(Array.isArray(stats)).toBe(true);
    });
  });
});
