import { describe, it, expect, beforeEach } from "vitest";
import { typoDetector } from "./typoDetector";

describe("TypoDetector (Task D5)", () => {
  
  it("单个错别字：'患者既往有心肌梗塞病史' → 匹配到'心肌梗塞'", async () => {
    const text = "患者既往有心肌梗塞病史";
    const typos = typoDetector.detectTypos(text);
    
    expect(typos.length).toBeGreaterThanOrEqual(1);
    const target = typos.find(t => t.wrong === "心肌梗塞");
    expect(target).toBeDefined();
    expect(target?.correct).toBe("心肌梗死");
  });

  it("多个错别字：'糖尿并患者常伴有肾脏损害' → 匹配到'糖尿并'和'肾脏'", async () => {
    const text = "糖尿并患者常伴有肾脏损害";
    const typos = typoDetector.detectTypos(text);
    
    expect(typos.length).toBeGreaterThanOrEqual(2);
    expect(typos.map(t => t.wrong)).toContain("糖尿并");
    expect(typos.map(t => t.wrong)).toContain("肾脏");
  });

  it("无错别字：'患者一般情况良好，无特殊不适' → 返回空数组", async () => {
    const text = "患者一般情况良好，无特殊不适";
    const typos = typoDetector.detectTypos(text);
    
    expect(typos.length).toBe(0);
  });

  it("跨类别错别字：'心电图显示心肌梗塞，建议查肝功' → 匹配到'心肌梗塞'(疾病)和'肝功'(检查)", async () => {
    const text = "心电图显示心肌梗塞，建议查肝功";
    const typos = typoDetector.detectTypos(text);
    
    // 心电图 (检查项目), 心肌梗塞 (疾病名称), 肝功 (检查项目)
    expect(typos.length).toBeGreaterThanOrEqual(2);
    const diseaseTypo = typos.find(t => t.category === "疾病名称" && t.wrong === "心肌梗塞");
    const checkTypo = typos.find(t => t.category === "检查项目" && t.wrong === "肝功");
    
    expect(diseaseTypo).toBeDefined();
    expect(checkTypo).toBeDefined();
  });
});
