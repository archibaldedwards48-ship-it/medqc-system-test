import { describe, it, expect, beforeEach } from "vitest";
import { symptomMatcher } from "./symptomMatcher";

describe("SymptomMatcher D7 Expansion (Task D7)", () => {
  
  it("新分类术语匹配：'患者自述近期失眠，且伴有幻觉' → 匹配到'失眠'和'幻觉'(精神科)", async () => {
    const text = "患者自述近期失眠，且伴有幻觉";
    const matches = symptomMatcher.matchSymptoms(text);
    
    // 应该匹配到失眠和幻觉
    const insomniaMatch = matches.find(m => m.name === "失眠");
    const hallucinationMatch = matches.find(m => m.name === "幻觉");
    
    expect(insomniaMatch).toBeDefined();
    expect(insomniaMatch?.category).toBe("精神科");
    
    expect(hallucinationMatch).toBeDefined();
    expect(hallucinationMatch?.category).toBe("精神科");
  });

  it("新分类别名匹配：'患者看东西重影，且喉咙有东西' → 匹配到'复视'和'咽部异物感'(五官科)", async () => {
    const text = "患者看东西重影，且喉咙有东西";
    const matches = symptomMatcher.matchSymptoms(text);
    
    // 看东西重影 -> 复视 (别名)
    const diplopiaMatch = matches.find(m => m.name === "复视");
    expect(diplopiaMatch).toBeDefined();
    expect(diplopiaMatch?.matchedAlias).toBe("看东西重影");
    // 数据中存在多个复视项，这里匹配到的可能是神经系统或五官科
    expect(["神经系统", "五官科"]).toContain(diplopiaMatch?.category);
    
    // 喉咙有东西 -> 咽部异物感 (别名)
    const globusMatch = matches.find(m => m.name === "咽部异物感");
    expect(globusMatch).toBeDefined();
    expect(globusMatch?.matchedAlias).toBe("喉咙有东西");
    expect(globusMatch?.category).toBe("五官科");
  });

  it("边界情况：'患者诉鼻塞，但无流泪' → 正确匹配鼻塞并处理否定词前的术语", async () => {
    const text = "患者诉鼻塞，但无流泪";
    const matches = symptomMatcher.matchSymptoms(text);
    
    // 鼻塞 (五官科/呼吸系统)
    const nasalMatch = matches.find(m => m.name === "鼻塞");
    expect(nasalMatch).toBeDefined();
    expect(["呼吸系统", "五官科"]).toContain(nasalMatch?.category);
    
    // 流泪 (五官科)
    const epiphoraMatch = matches.find(m => m.name === "流泪");
    expect(epiphoraMatch).toBeDefined();
    expect(epiphoraMatch?.category).toBe("五官科");
  });
});
