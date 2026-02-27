import { describe, it, expect, beforeEach } from "vitest";
import { ParagraphIndexer } from "./paragraphIndexer";

describe("ParagraphIndexer Enhancements", () => {
  let indexer: ParagraphIndexer;

  beforeEach(() => {
    indexer = new ParagraphIndexer();
  });

  it("应正确识别标准格式病历的所有段落（强锚点全命中）", async () => {
    const content = `主诉：发热3天\n现病史：患者3天前出现发热...\n既往史：无特殊\n体格检查：体温38.5℃`;
    const result = await indexer.index(content);
    expect(result.sections.has('chief_complaint')).toBe(true);
    expect(result.sections.has('present_illness')).toBe(true);
    expect(result.sections.has('past_history')).toBe(true);
    expect(result.sections.has('physical_exam')).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it("应识别无冒号的短标题行（弱锚点命中）", async () => {
    const content = `主诉\n发热3天\n现病史\n患者3天前出现发热`;
    const result = await indexer.index(content);
    expect(result.sections.has('chief_complaint')).toBe(true);
    expect(result.sections.has('present_illness')).toBe(true);
  });

  it("完全无标题时应通过位置启发法识别段落（位置启发法兜底）", async () => {
    // 构造一个足够长且按段落分布的无标题病历
    const content = `患者于3天前无明显诱因出现发热，最高体温达38.5℃，伴有咳嗽、咳痰，痰为白色泡沫状，无胸痛、心悸，无恶心、呕吐，为求进一步诊治，遂来我院就诊。\n\n平素身体健康，否认高血压、糖尿病、冠心病病史，否认肝炎、结核等传染病史，否认手术、外伤、输血史，否认药物、食物过敏史。\n\n发育正常，营养良好，神志清楚，自主体位，查体合作。全身皮肤黏膜无黄疸、出血点，浅表淋巴结未触及肿大。\n\n初步诊断：1.急性上呼吸道感染 2.发热待查`;
    
    const result = await indexer.index(content);
    // 识别出的段落数应大于0
    expect(result.sections.size).toBeGreaterThan(0);
    // 应该识别出主诉、现病史等典型位置段落
    expect(result.sections.has('chief_complaint') || result.sections.has('present_illness')).toBe(true);
    // 兜底法置信度应低于标准识别
    expect(result.confidence).toBeLessThan(0.8);
  });
});
