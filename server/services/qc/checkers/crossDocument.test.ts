import { describe, it, expect, vi, beforeEach } from "vitest";
import { CrossDocumentChecker } from "./crossDocument";
import { MedicalRecord } from "../../../types/qc.types";
import { NlpResult } from "../../../types/nlp.types";
import * as db from "../../../db";

vi.mock("../../../db", async () => {
  const actual = await vi.importActual("../../../db");
  return {
    ...actual,
    getSymptomAliases: vi.fn(),
  };
});

describe("CrossDocumentChecker (Single Document Internal Consistency)", () => {
  let checker: CrossDocumentChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    checker = new CrossDocumentChecker();
  });

  it("should detect symptom inconsistency between chief complaint and present illness", async () => {
    (db.getSymptomAliases as any).mockResolvedValue(["心前区疼痛", "胸部不适"]);
    
    const record: MedicalRecord = {
      id: 1,
      patientName: "张三",
      recordType: "admission_record",
      content: "主诉：胸痛3天。现病史：患者3天前出现腹痛...",
      doctorId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const nlpResult: NlpResult = {
      sectionMap: new Map([
        ["chief_complaint", { content: "胸痛3天", startIndex: 0, endIndex: 7 }],
        ["present_illness", { content: "患者3天前出现腹痛", startIndex: 8, endIndex: 20 }]
      ]),
      entities: [
        { text: "胸痛", type: "symptom", startIndex: 3, endIndex: 5, confidence: 0.9 }
      ],
      indicators: [],
      relationships: [],
      confidence: 0.9
    };

    const issues = await checker.check(record, nlpResult, []);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("CROSS_SYMPTOM_CONSISTENCY");
    expect(issues[0].message).toContain("胸痛");
  });

  it("should not report issue when symptom alias is found in present illness", async () => {
    (db.getSymptomAliases as any).mockResolvedValue(["心前区疼痛", "胸部不适"]);
    
    const record: MedicalRecord = {
      id: 1,
      patientName: "张三",
      recordType: "admission_record",
      content: "主诉：胸痛3天。现病史：患者3天前出现心前区疼痛...",
      doctorId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const nlpResult: NlpResult = {
      sectionMap: new Map([
        ["chief_complaint", { content: "胸痛3天", startIndex: 0, endIndex: 7 }],
        ["present_illness", { content: "患者3天前出现心前区疼痛", startIndex: 8, endIndex: 25 }]
      ]),
      entities: [
        { text: "胸痛", type: "symptom", startIndex: 3, endIndex: 5, confidence: 0.9 }
      ],
      indicators: [],
      relationships: [],
      confidence: 0.9
    };

    const issues = await checker.check(record, nlpResult, []);
    expect(issues.length).toBe(0);
  });

  it("should detect surgery history contradiction", async () => {
    const record: MedicalRecord = {
      id: 1,
      patientName: "李四",
      recordType: "admission_record",
      content: "既往史：否认手术史。体格检查：腹部可见手术切口...",
      doctorId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const nlpResult: NlpResult = {
      sectionMap: new Map([
        ["past_history", { content: "否认手术史", startIndex: 0, endIndex: 10 }]
      ]),
      entities: [],
      indicators: [],
      relationships: [],
      confidence: 0.9
    };

    const issues = await checker.check(record, nlpResult, []);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("CROSS_SURGERY_HISTORY");
    expect(issues[0].message).toContain("手术切口");
  });

  it("should detect allergy and medication contradiction", async () => {
    const record: MedicalRecord = {
      id: 1,
      patientName: "王五",
      recordType: "admission_record",
      content: "既往史：无药物过敏史。诊疗计划：给予青霉素抗感染治疗。",
      doctorId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const nlpResult: NlpResult = {
      sectionMap: new Map([
        ["past_history", { content: "无药物过敏史", startIndex: 0, endIndex: 10 }]
      ]),
      entities: [],
      indicators: [],
      relationships: [],
      confidence: 0.9
    };

    const issues = await checker.check(record, nlpResult, []);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("CROSS_ALLERGY_MEDICATION");
    expect(issues[0].severity).toBe("critical");
  });
});
