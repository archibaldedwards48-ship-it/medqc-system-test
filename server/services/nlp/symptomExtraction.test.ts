import { describe, it, expect, vi, beforeEach } from "vitest";
import { MetricExtractor } from "./metricExtractor";
import * as db from "../../db";

// 模拟数据库调用
vi.mock("../../db", async () => {
  const actual = await vi.importActual("../../db");
  return {
    ...actual,
    getSymptomTerms: vi.fn(),
  };
});

describe("Symptom Entity Extraction", () => {
  let extractor: MetricExtractor;
  const mockSymptomTerms = [
    "胸痛", "腹痛", "发热", "头痛", "呼吸困难", "咳嗽", "心悸", "水肿", "头晕", "乏力",
    "恶心", "呕吐", "腹泻", "便秘", "消瘦", "贫血", "黄疸", "发绀", "呼吸促", "胸闷",
    "气促", "咳痰", "咯血", "尿急", "尿频", "尿痛", "腰痛", "关节痛", "抽搐", "意识障碍"
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (db.getSymptomTerms as any).mockResolvedValue(mockSymptomTerms);
    extractor = new MetricExtractor();
  });

  it("should initialize with symptom terms from database", async () => {
    await extractor.initialize();
    expect(db.getSymptomTerms).toHaveBeenCalledTimes(1);
  });

  it("should extract symptoms from a complex medical text", async () => {
    const text = "患者3天前无明显诱因出现发热，最高体温38.5℃，伴有咳嗽、咳痰，痰为白色泡沫状。今日感胸痛，呈压榨性，伴有心悸、气促，遂来就诊。既往有头痛、头晕史。";
    
    const result = await extractor.extract(text);
    const symptoms = result.entities.filter(e => e.type === 'symptom').map(e => e.text);
    
    // 验证识别出的症状
    expect(symptoms).toContain("发热");
    expect(symptoms).toContain("咳嗽");
    expect(symptoms).toContain("咳痰");
    expect(symptoms).toContain("胸痛");
    expect(symptoms).toContain("心悸");
    expect(symptoms).toContain("气促");
    expect(symptoms).toContain("头痛");
    expect(symptoms).toContain("头晕");
    
    // 验证数量（应至少识别出上述 8 个）
    expect(symptoms.length).toBeGreaterThanOrEqual(8);
  });

  it("should handle overlapping symptoms correctly", async () => {
    // 假设词库中有 "呼吸困难" 和 "呼吸"
    (db.getSymptomTerms as any).mockResolvedValue(["呼吸困难", "呼吸", "困难"]);
    extractor = new MetricExtractor();
    
    const text = "患者感呼吸困难。";
    const result = await extractor.extract(text);
    const symptoms = result.entities.filter(e => e.type === 'symptom').map(e => e.text);
    
    expect(symptoms).toContain("呼吸困难");
    expect(symptoms).toContain("呼吸");
    expect(symptoms).toContain("困难");
  });

  it("should handle empty symptom list gracefully", async () => {
    (db.getSymptomTerms as any).mockResolvedValue([]);
    extractor = new MetricExtractor();
    
    const text = "患者发热、咳嗽。";
    const result = await extractor.extract(text);
    const symptoms = result.entities.filter(e => e.type === 'symptom');
    
    expect(symptoms.length).toBe(0);
  });
});
