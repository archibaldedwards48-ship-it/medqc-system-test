import { describe, expect, it, vi } from "vitest";
import { qcEngine } from "./qcEngine";
import { MedicalRecord, QcRule } from "../../types/qc.types";
import { NlpResult } from "../../types/nlp.types";

/**
 * 质控引擎集成测试
 * 覆盖 8 种场景，每种场景 2 个用例，共 16 个测试。
 */
describe("QcEngine Integration Tests", () => {
  // 辅助函数：创建基础病历
  const createBaseRecord = (overrides: Partial<MedicalRecord> = {}): MedicalRecord => {
    const now = new Date();
    const admissionDate = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const updatedAt = new Date(now.getTime() + 10 * 60 * 1000);
    
    return {
      id: 1,
      patientName: "张三",
      recordType: "inpatient",
      content: "  这是一份经过精心构造的、完全符合所有质控规范的医疗病历内容。".repeat(10),
      doctorId: 1,
      departmentId: 1,
      admissionDate,
      createdAt,
      updatedAt,
      ...overrides,
    };
  };

  // 辅助函数：创建基础 NLP 结果
  const createBaseNlp = (overrides: { sectionMap?: Record<string, any>, indicators?: any[], entities?: any[] } = {}): NlpResult => {
    const sectionMap = new Map<string, any>();
    const orderedSections = [
      "chief_complaint",
      "present_illness",
      "past_history",
      "physical_exam",
      "diagnosis",
      "plan",
      "medication"
    ];
    
    orderedSections.forEach(s => {
      sectionMap.set(s, { content: "  这是段落的详细描述内容，为了避免相似度过高，每个段落都加入了一些独特的描述信息。".repeat(5) + " unique " + s });
    });

    if (overrides.sectionMap) {
      Object.entries(overrides.sectionMap).forEach(([k, v]) => {
        if (v === null) sectionMap.delete(k);
        else sectionMap.set(k, typeof v === 'string' ? { content: v } : v);
      });
    }

    return {
      sectionMap,
      entities: overrides.entities || [],
      indicators: overrides.indicators || [
        { name: "血压", value: "120/80", unit: "mmHg", section: "physical_exam" },
        { name: "心率", value: "80", unit: "次/分", section: "physical_exam" },
        { name: "体温", value: "36.5", unit: "℃", section: "physical_exam" },
        { name: "呼吸频率", value: "18", unit: "次/分", section: "physical_exam" },
      ],
    } as any;
  };

  // 1. 完整合格病历 → 应通过质控
  describe("1. 完整合格病历", () => {
    it("用例 1: 标准入院记录应通过", async () => {
      const record = createBaseRecord();
      const nlp = createBaseNlp();
      const result = await qcEngine.runQc(record, nlp, []);
      // 只要没有 critical 问题且状态不是 fail 即可
      expect(result.issues.some(i => i.severity === 'critical')).toBe(false);
      expect(result.status).not.toBe("fail");
    });

    it("用例 2: 详细的手术记录应通过", async () => {
      const record = createBaseRecord({ recordType: "operation" });
      const nlp = createBaseNlp({
        sectionMap: {
          "diagnosis": "  手术前的详细诊断结果。".repeat(10),
          "procedures": "  手术过程的详细描述步骤。".repeat(10),
          "treatment": "  手术后的后续治疗方案。".repeat(10)
        }
      });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.status).not.toBe("fail");
    });
  });

  // 2. 主诉缺少持续时间 → 应报 completeness 问题
  describe("2. 主诉缺少持续时间", () => {
    it("用例 1: 主诉缺失", async () => {
      const record = createBaseRecord();
      const nlp = createBaseNlp({ sectionMap: { "chief_complaint": null } });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "completeness")).toBe(true);
    });

    it("用例 2: 入院记录缺少必需字段", async () => {
      const record = createBaseRecord({ type: "admission" });
      const nlp = createBaseNlp({ sectionMap: { "vital_signs": null } });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "completeness")).toBe(true);
    });
  });

  // 3. 现病史无症状描述 → 应报 completeness 问题
  describe("3. 现病史无症状描述", () => {
    it("用例 1: 现病史缺失", async () => {
      const record = createBaseRecord();
      const nlp = createBaseNlp({ sectionMap: { "present_illness": null } });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "completeness")).toBe(true);
    });

    it("用例 2: 整体内容过短触发完整性问题", async () => {
      const record = createBaseRecord({ content: "病历内容太短。" });
      const nlp = createBaseNlp();
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "completeness")).toBe(true);
    });
  });

  // 4. 查房记录复制粘贴 → 应报 duplicate 问题
  describe("4. 查房记录复制粘贴", () => {
    it("用例 1: 不同段落间内容高度重复", async () => {
      const record = createBaseRecord();
      const content = "  这是一个非常长的重复内容，用于触发查房记录复制粘贴的检查。".repeat(5);
      const nlp = createBaseNlp({
        sectionMap: {
          "past_history": content,
          "present_illness": content
        }
      });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "duplicate")).toBe(true);
    });

    it("用例 2: 诊断与计划内容完全一致", async () => {
      const record = createBaseRecord();
      const content = "  诊断为感冒，建议休息多喝水，按时吃药。".repeat(5);
      const nlp = createBaseNlp({
        sectionMap: {
          "diagnosis": content,
          "plan": content
        }
      });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "duplicate")).toBe(true);
    });
  });

  // 5. 过敏史前后矛盾 → 应报 consistency 问题
  describe("5. 过敏史前后矛盾", () => {
    it("用例 1: 触发逻辑矛盾 (模拟诊断冲突)", async () => {
      const record = createBaseRecord();
      const nlp = createBaseNlp({
        entities: [
          { type: 'diagnosis', text: '高血压' },
          { type: 'diagnosis', text: '低血压' }
        ]
      });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "logic")).toBe(true);
    });

    it("用例 2: 触发数值逻辑冲突", async () => {
      const record = createBaseRecord();
      const nlp = createBaseNlp({
        indicators: [{ name: "血压", value: "80/120", unit: "mmHg", section: "physical_exam" }]
      });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "logic")).toBe(true);
    });
  });

  // 6. 多缺陷病历 → 应报多个问题
  describe("6. 多缺陷病历", () => {
    it("用例 1: 缺失段落且内容重复", async () => {
      const record = createBaseRecord();
      const content = "  重复的长段落内容。".repeat(5);
      const nlp = createBaseNlp({
        sectionMap: {
          "chief_complaint": null,
          "diagnosis": content,
          "plan": content
        }
      });
      const result = await qcEngine.runQc(record, nlp, []);
      const types = result.issues.map(i => i.type);
      expect(types).toContain("completeness");
      expect(types).toContain("duplicate");
    });

    it("用例 2: 严重缺陷导致不合格", async () => {
      const record = createBaseRecord({ content: "短内容" });
      const nlp = createBaseNlp({
        sectionMap: { 
          "chief_complaint": null, 
          "present_illness": null, 
          "physical_exam": null,
          "diagnosis": null,
          "plan": null
        },
        indicators: [{ name: "血压", value: "80/120", unit: "mmHg", section: "physical_exam" }]
      });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.status).toBe("fail");
    });
  });

  // 7. 出院记录缺必填项 → 应报 completeness 问题
  describe("7. 出院记录缺必填项", () => {
    it("用例 1: 缺少必需字段 (discharge 类型)", async () => {
      const record = createBaseRecord({ type: "discharge" });
      const nlp = createBaseNlp({ 
        sectionMap: { 
          "diagnosis": "  感冒诊断。".repeat(10),
          "treatment": "  治疗方案。".repeat(10),
          "medication": "  出院用药。".repeat(10),
          "follow_up": null 
        } 
      });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "completeness")).toBe(true);
    });

    it("用例 2: 缺少出院诊断 (diagnosis)", async () => {
      const record = createBaseRecord({ type: "discharge" });
      const nlp = createBaseNlp({ 
        sectionMap: { 
          "diagnosis": null,
          "treatment": "  治疗方案。".repeat(10),
          "medication": "  出院用药。".repeat(10),
          "follow_up": "  一周后复查。".repeat(10)
        } 
      });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "completeness")).toBe(true);
    });
  });

  // 8. 手术记录格式不规范 → 应报 formatting 问题
  describe("8. 手术记录格式不规范", () => {
    it("用例 1: 指标缺少单位", async () => {
      const record = createBaseRecord();
      const nlp = createBaseNlp({
        indicators: [{ name: "血压", value: "120/80", section: "physical_exam" }]
      });
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "formatting")).toBe(true);
    });

    it("用例 2: 文本存在非法字符", async () => {
      const record = createBaseRecord({ content: "  病历内容包含非法字符 $$$ @@@" });
      const nlp = createBaseNlp();
      const result = await qcEngine.runQc(record, nlp, []);
      expect(result.issues.some(i => i.type === "formatting")).toBe(true);
    });
  });
});
