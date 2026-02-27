import { describe, it, expect, beforeEach } from "vitest";
import { symptomMatcher } from "./symptomMatcher";

describe("SymptomMatcher (Task N1 & N2)", () => {
  
  it("精确匹配：'患者诉胸痛3天' → 匹配到'胸痛'", async () => {
    const text = "患者诉胸痛3天";
    const matches = symptomMatcher.matchSymptoms(text);
    
    expect(matches.length).toBeGreaterThan(0);
    const chestPainMatch = matches.find(m => m.name === "胸痛");
    expect(chestPainMatch).toBeDefined();
    expect(chestPainMatch?.matchedAlias).toBe("胸痛");
    expect(chestPainMatch?.position).toBe(3);
  });

  it("别名匹配：'心前区痛伴心悸' → 匹配到'胸痛'（通过别名'心前区痛'）和'心悸'", async () => {
    const text = "心前区痛伴心悸";
    const matches = symptomMatcher.matchSymptoms(text);
    
    // 应该匹配到两个症状：胸痛（别名：心前区痛）和心悸
    expect(matches.length).toBe(2);
    
    const chestPainMatch = matches.find(m => m.name === "胸痛");
    expect(chestPainMatch).toBeDefined();
    expect(chestPainMatch?.matchedAlias).toBe("心前区痛");
    
    const palpitationMatch = matches.find(m => m.name === "心悸");
    expect(palpitationMatch).toBeDefined();
    expect(palpitationMatch?.matchedAlias).toBe("心悸");
  });

  it("无匹配：'患者一般情况良好' → 返回空数组", async () => {
    const text = "患者一般情况良好";
    const matches = symptomMatcher.matchSymptoms(text);
    
    expect(matches.length).toBe(0);
  });
});
