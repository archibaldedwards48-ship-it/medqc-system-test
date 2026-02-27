import { describe, it, expect, beforeEach } from "vitest";
import { DuplicateChecker } from "./duplicate";
import { MedicalRecord } from "../../../types/qc.types";
import { NlpResult } from "../../../types/nlp.types";

describe("DuplicateChecker (Single Document Internal Redundancy)", () => {
  let checker: DuplicateChecker;

  beforeEach(() => {
    checker = new DuplicateChecker();
  });

  it("should detect identical content in different sections", async () => {
    const record: MedicalRecord = {
      id: 1,
      patientName: "张三",
      recordType: "admission_record",
      content: "主诉：胸痛3天。现病史：胸痛3天。",
      doctorId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const nlpResult: NlpResult = {
      sectionMap: new Map([
        ["chief_complaint", { content: "患者于3天前无明显诱因出现胸痛，伴有咳嗽", startIndex: 0, endIndex: 20 }],
        ["present_illness", { content: "患者于3天前无明显诱因出现胸痛，伴有咳嗽", startIndex: 21, endIndex: 41 }]
      ]),
      entities: [],
      indicators: [],
      relationships: [],
      confidence: 0.9
    };

    const issues = await checker.check(record, nlpResult, []);
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("内容高度重复");
    expect(issues[0].severity).toBe("major");
  });

  it("should report minor issue for partially duplicate content", async () => {
    const nlpResult: NlpResult = {
      sectionMap: new Map([
        ["chief_complaint", { content: "患者于3天前无明显诱因出现胸痛，程度较剧烈", startIndex: 0, endIndex: 20 }],
        ["present_illness", { content: "患者于3天前无明显诱因出现胸痛，程度较剧烈，伴有心悸气促", startIndex: 21, endIndex: 50 }]
      ]),
      entities: [],
      indicators: [],
      relationships: [],
      confidence: 0.9
    };

    const record: MedicalRecord = { id: 1 } as any;
    const issues = await checker.check(record, nlpResult, []);
    
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("minor");
  });

  it("should ignore short sections", async () => {
    const nlpResult: NlpResult = {
      sectionMap: new Map([
        ["chief_complaint", { content: "胸痛", startIndex: 0, endIndex: 2 }],
        ["present_illness", { content: "胸痛", startIndex: 3, endIndex: 5 }]
      ]),
      entities: [],
      indicators: [],
      relationships: [],
      confidence: 0.9
    };

    const record: MedicalRecord = { id: 1 } as any;
    const issues = await checker.check(record, nlpResult, []);
    expect(issues.length).toBe(0);
  });
});
