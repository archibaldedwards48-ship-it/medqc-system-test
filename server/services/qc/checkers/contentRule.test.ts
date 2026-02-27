import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContentRuleChecker } from "./contentRule";
import { MedicalRecord, QcRule } from "../../../types/qc.types";
import { NlpResult } from "../../../types/nlp.types";
import * as db from "../../../db";

vi.mock("../../../db", async () => {
  const actual = await vi.importActual("../../../db");
  return {
    ...actual,
    getContentRules: vi.fn(),
  };
});

describe("ContentRuleChecker", () => {
  let checker: ContentRuleChecker;
  const mockRecord: MedicalRecord = {
    id: 1,
    patientName: "张三",
    recordType: "admission_record",
    content: "主诉：胸痛3天。现病史：患者3天前出现胸痛...",
    doctorId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNlpResult: NlpResult = {
    sectionMap: new Map([
      ["chief_complaint", { content: "胸痛3天", startIndex: 0, endIndex: 7 }],
      ["present_illness", { content: "患者3天前出现胸痛", startIndex: 8, endIndex: 20 }]
    ]),
    entities: [
      { text: "胸痛", type: "symptom", startIndex: 3, endIndex: 5, confidence: 0.9 },
      { text: "胸痛", type: "symptom", startIndex: 16, endIndex: 18, confidence: 0.9 }
    ],
    indicators: [],
    relationships: [],
    confidence: 0.9
  };

  beforeEach(() => {
    vi.clearAllMocks();
    checker = new ContentRuleChecker();
  });

  it("should detect missing symptom in chief complaint", async () => {
    (db.getContentRules as any).mockResolvedValue([
      {
        id: 1,
        documentType: "admission_record",
        section: "chief_complaint",
        checkType: "must_contain_entity",
        condition: JSON.stringify({ type: "must_contain_entity", entityType: "symptom", minCount: 1 }),
        errorMessage: "主诉缺少症状描述",
        severity: "major",
        isActive: true
      }
    ]);

    // 构造一个没有症状的 NLP 结果
    const nlpNoSymptom = { ...mockNlpResult, entities: [] };
    const issues = await checker.check(mockRecord, nlpNoSymptom, []);
    
    expect(issues.length).toBe(1);
    expect(issues[0].message).toBe("主诉缺少症状描述");
  });

  it("should detect missing duration in chief complaint", async () => {
    (db.getContentRules as any).mockResolvedValue([
      {
        id: 2,
        documentType: "admission_record",
        section: "chief_complaint",
        checkType: "must_contain_duration",
        condition: JSON.stringify({ type: "must_contain_duration" }),
        errorMessage: "主诉缺少持续时间",
        severity: "major",
        isActive: true
      }
    ]);

    const nlpNoDuration = { 
        ...mockNlpResult, 
        sectionMap: new Map([["chief_complaint", { content: "胸痛", startIndex: 0, endIndex: 2 }]]) 
    };
    const issues = await checker.check(mockRecord, nlpNoDuration, []);
    
    expect(issues.length).toBe(1);
    expect(issues[0].message).toBe("主诉缺少持续时间");
  });

  it("should detect generic phrases", async () => {
    (db.getContentRules as any).mockResolvedValue([
      {
        id: 3,
        documentType: "admission_record",
        section: "present_illness",
        checkType: "must_not_be_generic",
        condition: JSON.stringify({ type: "must_not_be_generic", genericPhrases: ["向上级汇报"] }),
        errorMessage: "现病史包含空洞描述",
        severity: "minor",
        isActive: true
      }
    ]);

    const nlpWithGeneric = { 
        ...mockNlpResult, 
        sectionMap: new Map([["present_illness", { content: "患者病情平稳，已向上级汇报。", startIndex: 0, endIndex: 15 }]]) 
    };
    const issues = await checker.check(mockRecord, nlpWithGeneric, []);
    
    expect(issues.length).toBe(1);
    expect(issues[0].message).toBe("现病史包含空洞描述");
  });
});
