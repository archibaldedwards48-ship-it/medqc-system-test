/**
 * NLP Pipeline - Stage 1: 段落索引
 * 识别病历中的主要段落（主诉、现病史、既往史等）
 */

import { ParagraphIndexingResult, MedicalRecordSection, SectionInfo } from '../../types/nlp.types';

// 一级强锚点：带冒号/括号的标准标题（高置信度）
const STRONG_ANCHORS: Record<MedicalRecordSection, string[]> = {
  chief_complaint:    ['主诉：', '主诉:', '【主诉】', '主要症状：'],
  present_illness:    ['现病史：', '现病史:', '【现病史】', '病史：', '现病情：'],
  past_history:       ['既往史：', '既往史:', '【既往史】', '过去史：', '过去病史：'],
  family_history:     ['家族史：', '家族史:', '【家族史】'],
  social_history:     ['个人史：', '个人史:', '社会史：', '生活史：', '【个人史】'],
  review_of_systems:  ['系统回顾：', '系统回顾:', '【系统回顾】'],
  physical_exam:      ['体格检查：', '查体：', '体检：', '【查体】', '【体格检查】', '体格检查:'],
  vital_signs:        ['生命体征：', '生命体征:', 'T:', 'T：', '体温：'],
  lab_results:        ['辅助检查：', '实验室检查：', '检验结果：', '【辅助检查】', '化验：'],
  imaging:            ['影像学检查：', '影像检查：', 'CT：', 'MRI：', 'B超：'],
  diagnosis:          ['初步诊断：', '诊断：', '入院诊断：', '【诊断】', '印象：'],
  assessment:         ['评估：', '临床评估：', '病情评估：'],
  plan:               ['诊疗计划：', '处理：', '医嘱：', '治疗方案：', '【诊疗计划】'],
  treatment:          ['治疗：', '处理意见：', '治疗经过：'],
  medication:         ['用药情况：', '药物治疗：', '处方：', '目前用药：'],
  procedures:         ['手术经过：', '操作记录：', '手术记录：'],
  follow_up:          ['随访：', '复诊：', '出院医嘱：', '随访计划：'],
  other:              ['备注：', '其他：', '注意事项：'],
};

// 二级弱锚点：无冒号的纯文字标题（需结合行长度判断）
const WEAK_ANCHORS: Record<MedicalRecordSection, string[]> = {
  chief_complaint:    ['主诉', '主要症状'],
  present_illness:    ['现病史', '现病情'],
  past_history:       ['既往史', '过去史'],
  family_history:     ['家族史'],
  social_history:     ['个人史', '社会史'],
  review_of_systems:  ['系统回顾'],
  physical_exam:      ['体格检查', '查体', '体检'],
  vital_signs:        ['生命体征'],
  lab_results:        ['辅助检查', '检验结果', '化验结果'],
  imaging:            ['影像学', '影像检查'],
  diagnosis:          ['初步诊断', '入院诊断', '诊断'],
  assessment:         ['评估', '病情评估'],
  plan:               ['诊疗计划', '处理意见', '治疗方案'],
  treatment:          ['治疗', '处理'],
  medication:         ['用药情况', '药物治疗'],
  procedures:         ['手术经过', '操作记录'],
  follow_up:          ['随访', '复诊'],
  other:              ['备注', '其他'],
};

// 位置启发法：各段落在全文中的典型位置区间（0-1）
const POSITION_HINTS: Array<{ section: MedicalRecordSection; start: number; end: number }> = [
  { section: 'chief_complaint',   start: 0.00, end: 0.15 },
  { section: 'present_illness',   start: 0.08, end: 0.45 },
  { section: 'past_history',      start: 0.40, end: 0.65 },
  { section: 'family_history',    start: 0.55, end: 0.72 },
  { section: 'social_history',    start: 0.60, end: 0.75 },
  { section: 'physical_exam',     start: 0.65, end: 0.85 },
  { section: 'lab_results',       start: 0.75, end: 0.92 },
  { section: 'diagnosis',         start: 0.85, end: 1.00 },
  { section: 'plan',              start: 0.90, end: 1.00 },
];

/**
 * 段落索引处理器
 * 扫描文本找到各个段落的起始位置和内容
 */
export class ParagraphIndexer {
  /**
   * 执行段落索引
   * @param content 医疗记录内容
   * @returns 段落索引结果
   */
  async index(content: string): Promise<ParagraphIndexingResult> {
    const sections = new Map<string, SectionInfo>();
    const lines = content.split('\n');
    
    let currentSection: MedicalRecordSection | null = null;
    let currentSectionContent = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // 尝试识别新的段落
      const detectedSection = this.detectSection(line, i, lines.length);
      
      if (detectedSection && detectedSection !== currentSection) {
        // 保存前一个段落
        if (currentSection) {
          this.saveSection(sections, currentSection, currentSectionContent, content);
        }
        
        // 开始新段落
        currentSection = detectedSection;
        currentSectionContent = line;
      } else if (currentSection) {
        // 继续添加到当前段落
        currentSectionContent += '\n' + line;
      }
    }
    
    // 保存最后一个段落
    if (currentSection && currentSectionContent) {
      this.saveSection(sections, currentSection, currentSectionContent, content);
    }

    let usedFallback = false;
    // === 策略三：位置启发法兜底 ===
    // 当识别到的段落数 < 3 时（说明文书无标准标题），启用位置推断
    if (sections.size < 3 && content.length > 200) {
      usedFallback = true;
      const paragraphs = content
        .split(/\n{2,}/)  // 按空行切分段落块
        .filter(p => p.trim().length > 20);

      paragraphs.forEach((para, idx) => {
        const position = idx / Math.max(paragraphs.length - 1, 1);
        // 找到最匹配的位置区间
        const hint = POSITION_HINTS.find(h => position >= h.start && position <= h.end);
        if (hint && !sections.has(hint.section)) {
          const trimmedPara = para.trim();
          const startIndex = content.indexOf(trimmedPara);
          sections.set(hint.section, {
            content: trimmedPara,
            startIndex,
            endIndex: startIndex + trimmedPara.length,
          });
        }
      });
    }
    
    return {
      sections,
      confidence: this.calculateConfidence(sections.size, usedFallback),
    };
  }

  private saveSection(sections: Map<string, SectionInfo>, section: string, contentStr: string, fullContent: string) {
    const trimmed = contentStr.trim();
    const startIndex = fullContent.indexOf(trimmed);
    sections.set(section, {
      content: trimmed,
      startIndex,
      endIndex: startIndex + trimmed.length,
    });
  }
  
  /**
   * 检测行中的段落类型
   * @param line 文本行
   * @param lineIndex 当前行号
   * @param totalLines 总行数
   * @returns 检测到的段落类型，如果没有则返回 null
   */
  private detectSection(line: string, lineIndex: number, totalLines: number): MedicalRecordSection | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // === 策略一：强锚点匹配（最高优先级）===
    for (const [section, anchors] of Object.entries(STRONG_ANCHORS)) {
      for (const anchor of anchors) {
        if (trimmed.startsWith(anchor) || trimmed === anchor.replace(/：|:$/, '')) {
          return section as MedicalRecordSection;
        }
      }
    }

    // === 策略二：弱锚点匹配（需满足"短行"条件）===
    // 弱锚点只在行长度 < 15 字符时生效，避免把正文内容误判为标题
    if (trimmed.length < 15) {
      for (const [section, anchors] of Object.entries(WEAK_ANCHORS)) {
        for (const anchor of anchors) {
          if (trimmed === anchor || trimmed === anchor + '：' || trimmed === anchor + ':') {
            return section as MedicalRecordSection;
          }
        }
      }
    }

    return null;  // 正常行，不是标题
  }
  
  /**
   * 计算置信度
   * 基于识别到的段落数量
   * @param sectionCount 识别到的段落数
   * @param usedFallback 是否使用了位置启发法兜底
   * @returns 置信度（0-1）
   */
  private calculateConfidence(sectionCount: number, usedFallback: boolean): number {
    const base = Math.min(sectionCount / 8, 1);  // 识别8个段落即满分
    return usedFallback ? base * 0.6 : base;      // 使用兜底法时置信度打六折
  }
  
  /**
   * 获取特定段落的内容
   * @param sections 段落映射
   * @param sectionType 段落类型
   * @returns 段落内容，如果不存在则返回 undefined
   */
  getSection(sections: Map<string, SectionInfo>, sectionType: MedicalRecordSection): string | undefined {
    return sections.get(sectionType)?.content;
  }
  
  /**
   * 获取所有段落的摘要
   * @param sections 段落映射
   * @returns 段落摘要
   */
  getSummary(sections: Map<string, SectionInfo>): Record<string, string> {
    const summary: Record<string, string> = {};
    
    for (const [section, info] of sections) {
      // 取前 100 个字符作为摘要
      summary[section] = info.content.substring(0, 100) + (info.content.length > 100 ? '...' : '');
    }
    
    return summary;
  }
}

// 导出单例
export const paragraphIndexer = new ParagraphIndexer();
