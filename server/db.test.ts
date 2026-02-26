import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  getDb,
  createMedicalRecord,
  getMedicalRecordById,
  getAllMedicalRecords,
  updateMedicalRecord,
  deleteMedicalRecord,
  createQcResult,
  getQcResultById,
  getQcResultByMedicalRecordId,
  createQcIssue,
  getQcIssuesByResultId,
  createQcRule,
  getQcRuleByRuleId,
  getAllQcRules,
  updateQcRule,
  deleteQcRule,
  createTerminologyMapping,
  getTerminologyMapping,
  createQcConfig,
  getQcConfigByKey,
  createMedicalTerminologyEntry,
  getMedicalTerminologyByTerm,
  createDrug,
  getDrugByName,
  createAuditLog,
  getAuditLogs,
  createStatistics,
  getRecentStatistics,
  createSpotCheckRecord,
  getSpotCheckResultById,
  countMedicalRecords,
  countQcRules,
} from "./db";
import { sql } from "drizzle-orm";

describe("Database Layer - Phase 1 Integration", () => {
  // Verify database connection is available
  it("should connect to database", async () => {
    const db = await getDb();
    expect(db).not.toBeNull();
  });

  // ============ Medical Records ============
  describe("Medical Records CRUD", () => {
    let recordId: number;

    it("should create a medical record", async () => {
      recordId = await createMedicalRecord({
        patientName: "测试患者-张三",
        recordType: "inpatient",
        content: "主诉：头痛3天\n现病史：患者3天前无明显诱因出现头痛...",
        admissionDate: new Date("2026-01-15"),
      });
      expect(recordId).toBeGreaterThan(0);
    });

    it("should get medical record by id", async () => {
      const record = await getMedicalRecordById(recordId);
      expect(record).toBeDefined();
      expect(record!.patientName).toBe("测试患者-张三");
      expect(record!.recordType).toBe("inpatient");
    });

    it("should list all medical records", async () => {
      const records = await getAllMedicalRecords(10, 0);
      expect(records.length).toBeGreaterThan(0);
    });

    it("should count medical records", async () => {
      const count = await countMedicalRecords();
      expect(count).toBeGreaterThan(0);
    });

    it("should update a medical record", async () => {
      await updateMedicalRecord(recordId, {
        parsedContent: '{"sections":{"chief_complaint":"头痛3天"}}',
      });
      const updated = await getMedicalRecordById(recordId);
      expect(updated!.parsedContent).toContain("chief_complaint");
    });

    it("should delete a medical record", async () => {
      await deleteMedicalRecord(recordId);
      const deleted = await getMedicalRecordById(recordId);
      expect(deleted).toBeUndefined();
    });
  });

  // ============ QC Results ============
  describe("QC Results", () => {
    let recordId: number;
    let qcResultId: number;

    beforeAll(async () => {
      recordId = await createMedicalRecord({
        patientName: "QC测试患者",
        recordType: "discharge",
        content: "出院记录内容...",
      });
    });

    it("should create a QC result", async () => {
      qcResultId = await createQcResult({
        medicalRecordId: recordId,
        qcStaffId: null as any, // no staff in test
        qcMode: "standard",
        totalScore: "85.5",
        isQualified: true,
      });
      expect(qcResultId).toBeGreaterThan(0);
    });

    it("should get QC result by id", async () => {
      const result = await getQcResultById(qcResultId);
      expect(result).toBeDefined();
      expect(result!.totalScore).toBe("85.5");
      expect(result!.qcMode).toBe("standard");
    });

    it("should get QC result by medical record id", async () => {
      const result = await getQcResultByMedicalRecordId(recordId);
      expect(result).toBeDefined();
      expect(result!.id).toBe(qcResultId);
    });

    // Cleanup
    afterAll(async () => {
      const db = await getDb();
      if (db) {
        await db.execute(sql`DELETE FROM qc_results WHERE id = ${qcResultId}`);
        await db.execute(sql`DELETE FROM medical_records WHERE id = ${recordId}`);
      }
    });
  });

  // ============ QC Issues ============
  describe("QC Issues", () => {
    let recordId: number;
    let qcResultId: number;

    beforeAll(async () => {
      recordId = await createMedicalRecord({
        patientName: "Issue测试患者",
        recordType: "inpatient",
        content: "内容...",
      });
      qcResultId = await createQcResult({
        medicalRecordId: recordId,
        qcStaffId: null as any,
        qcMode: "comprehensive",
        totalScore: "72",
        isQualified: false,
      });
    });

    it("should create and retrieve QC issues", async () => {
      await createQcIssue({
        qcResultId,
        type: "completeness",
        severity: "major",
        message: "缺少现病史描述",
        suggestion: "请补充现病史相关内容",
      });

      const issues = await getQcIssuesByResultId(qcResultId);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe("completeness");
      expect(issues[0].severity).toBe("major");
    });

    afterAll(async () => {
      const db = await getDb();
      if (db) {
        await db.execute(sql`DELETE FROM qc_issues WHERE qcResultId = ${qcResultId}`);
        await db.execute(sql`DELETE FROM qc_results WHERE id = ${qcResultId}`);
        await db.execute(sql`DELETE FROM medical_records WHERE id = ${recordId}`);
      }
    });
  });

  // ============ QC Rules ============
  describe("QC Rules CRUD", () => {
    let ruleDbId: number;
    const testRuleId = `test_rule_${Date.now()}`;

    it("should create a QC rule", async () => {
      ruleDbId = await createQcRule({
        ruleId: testRuleId,
        name: "入院记录24小时完成检查",
        description: "入院记录应在患者入院24小时内完成",
        category: "timeliness",
        severity: "major",
        condition: "admissionRecord.completedWithin <= 24h",
      });
      expect(ruleDbId).toBeGreaterThan(0);
    });

    it("should get rule by ruleId", async () => {
      const rule = await getQcRuleByRuleId(testRuleId);
      expect(rule).toBeDefined();
      expect(rule!.name).toBe("入院记录24小时完成检查");
      expect(rule!.category).toBe("timeliness");
    });

    it("should list all active rules", async () => {
      const rules = await getAllQcRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it("should count rules", async () => {
      const count = await countQcRules();
      expect(count).toBeGreaterThan(0);
    });

    it("should update a rule", async () => {
      await updateQcRule(ruleDbId, { severity: "critical" });
      const updated = await getQcRuleByRuleId(testRuleId);
      expect(updated!.severity).toBe("critical");
    });

    it("should delete a rule", async () => {
      await deleteQcRule(ruleDbId);
      const deleted = await getQcRuleByRuleId(testRuleId);
      expect(deleted).toBeUndefined();
    });
  });

  // ============ Terminology Mappings ============
  describe("Terminology Mappings", () => {
    it("should create and retrieve a terminology mapping", async () => {
      const testAbbr = `BP_${Date.now()}`;
      await createTerminologyMapping({
        abbreviation: testAbbr,
        fullName: "血压",
        category: "abbreviation",
      });

      const mapping = await getTerminologyMapping(testAbbr);
      expect(mapping).toBeDefined();
      expect(mapping!.fullName).toBe("血压");

      // Cleanup
      const db = await getDb();
      if (db) await db.execute(sql`DELETE FROM terminology_mappings WHERE abbreviation = ${testAbbr}`);
    });
  });

  // ============ QC Configs ============
  describe("QC Configs", () => {
    it("should create and retrieve a config", async () => {
      const testKey = `test_config_${Date.now()}`;
      await createQcConfig({
        configType: "critical_value",
        configKey: testKey,
        configValue: JSON.stringify({ low: 2.2, high: 33.3 }),
        description: "血糖危急值",
      });

      const config = await getQcConfigByKey("critical_value", testKey);
      expect(config).toBeDefined();
      const parsed = JSON.parse(config!.configValue);
      expect(parsed.low).toBe(2.2);
      expect(parsed.high).toBe(33.3);

      // Cleanup
      const db = await getDb();
      if (db) await db.execute(sql`DELETE FROM qc_configs WHERE configKey = ${testKey}`);
    });
  });

  // ============ Medical Terminology ============
  describe("Medical Terminology", () => {
    it("should create and retrieve a terminology entry", async () => {
      const testTerm = `高血压_${Date.now()}`;
      await createMedicalTerminologyEntry({
        term: testTerm,
        standardName: "原发性高血压",
        category: "diagnosis",
        description: "以体循环动脉血压增高为主要特征的临床综合征",
        synonyms: ["高血压病", "Essential Hypertension", "HTN"] as any,
      });

      const entry = await getMedicalTerminologyByTerm(testTerm);
      expect(entry).toBeDefined();
      expect(entry!.standardName).toBe("原发性高血压");

      // Cleanup
      const db = await getDb();
      if (db) await db.execute(sql`DELETE FROM medical_terminology WHERE term = ${testTerm}`);
    });
  });

  // ============ Drug Knowledge Base ============
  describe("Drug Knowledge Base", () => {
    it("should create and retrieve a drug entry", async () => {
      const testDrug = `美托洛尔_${Date.now()}`;
      await createDrug({
        drugName: testDrug,
        genericName: "Metoprolol",
        category: "antihypertensive",
        maxDailyDose: "200",
        unit: "mg",
        contraindications: ["心动过缓", "二度及以上房室传导阻滞"] as any,
        interactions: ["维拉帕米", "地尔硫卓"] as any,
      });

      const drug = await getDrugByName(testDrug);
      expect(drug).toBeDefined();
      expect(drug!.genericName).toBe("Metoprolol");

      // Cleanup
      const db = await getDb();
      if (db) await db.execute(sql`DELETE FROM drug_knowledge_base WHERE drugName = ${testDrug}`);
    });
  });

  // ============ Audit Logs ============
  describe("Audit Logs", () => {
    it("should create and list audit logs", async () => {
      await createAuditLog({
        userId: null as any, // no FK user in test
        action: "create",
        entityType: "medical_record",
        entityId: 999,
        changes: { field: "content", oldValue: null, newValue: "..." } as any,
      });

      const logs = await getAuditLogs(10, 0);
      expect(logs.length).toBeGreaterThan(0);

      // Cleanup
      const db = await getDb();
      if (db) await db.execute(sql`DELETE FROM audit_logs WHERE entityId = 999`);
    });
  });

  // ============ Statistics ============
  describe("Statistics", () => {
    it("should create and retrieve statistics", async () => {
      await createStatistics({
        date: new Date("2026-02-25"),
        totalRecords: 100,
        qualifiedRecords: 85,
        averageScore: 88.5,
      });

      const stats = await getRecentStatistics(5);
      expect(stats.length).toBeGreaterThan(0);

      // Cleanup
      const db = await getDb();
      if (db) await db.execute(sql`DELETE FROM statistics WHERE totalRecords = 100 AND qualifiedRecords = 85`);
    });
  });

  // ============ Spot Check Records ============
  describe("Spot Check Records", () => {
    let recordId: number;

    beforeAll(async () => {
      recordId = await createMedicalRecord({
        patientName: "抽查测试患者",
        recordType: "outpatient",
        content: "门诊记录...",
      });
    });

    it("should create and retrieve spot check record", async () => {
      const spotId = await createSpotCheckRecord({
        medicalRecordId: recordId,
        qcStaffId: null as any,
        qcMode: "fast",
        totalScore: "92",
        isQualified: true,
      });

      const spot = await getSpotCheckResultById(spotId);
      expect(spot).toBeDefined();
      expect(spot!.totalScore).toBe("92");

      // Cleanup
      const db = await getDb();
      if (db) {
        await db.execute(sql`DELETE FROM spot_check_records WHERE id = ${spotId}`);
        await db.execute(sql`DELETE FROM medical_records WHERE id = ${recordId}`);
      }
    });
  });
});
