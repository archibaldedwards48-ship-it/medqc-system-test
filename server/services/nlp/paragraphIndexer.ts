/**
 * NLP Pipeline - Stage 1: 段落索引
 * 识别病历中的主要段落（主诉、现病史、既往史等）
 */

import { ParagraphIndexingResult, MedicalRecordSection, SectionInfo } from '../../types/nlp.types';

// 段落标记关键词映射
const SECTION_KEYWORDS: Record<MedicalRecordSection, string[]> = {
  chief_complaint: ['主诉', '主要症状', 'chief complaint', 'cc'],
  present_illness: ['现病史', '现病情', 'present illness', 'hpi'],
  past_history: ['既往史', '过去病史', 'past history', 'psh'],
  family_history: ['家族史', '家庭史', 'family history', 'fh'],
  social_history: ['社会史', '生活史', 'social history', 'sh'],
  review_of_systems: ['系统回顾', '系统审查', 'review of systems', 'ros'],
  physical_exam: ['体格检查', '物理检查', 'physical examination', 'pe'],
  vital_signs: ['生命体征', '基本体征', 'vital signs', 'vs'],
  lab_results: ['实验室结果', '检验结果', 'laboratory results', 'lab'],
  imaging: ['影像学', '放射学', '影像检查', 'imaging', 'radiology'],
  diagnosis: ['诊断', '初步诊断', 'diagnosis', 'dx'],
  assessment: ['评估', '临床评估', 'assessment'],
  plan: ['计划', '治疗计划', '处理计划', 'plan'],
  treatment: ['治疗', '处理', 'treatment'],
  medication: ['用药', '药物', '处方', 'medication', 'rx'],
  procedures: ['操作', '程序', '手术', 'procedures', 'procedures'],
  follow_up: ['随访', '复诊', 'follow-up', 'fu'],
  other: ['其他', '备注', 'other', 'notes'],
};

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
    let currentSectionStart = 0;
    let currentSectionContent = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // 尝试识别新的段落
      const detectedSection = this.detectSection(line);
      
      if (detectedSection && detectedSection !== currentSection) {
        // 保存前一个段落
        if (currentSection) {
          const startIndex = content.indexOf(currentSectionContent);
          sections.set(currentSection, {
            content: currentSectionContent.trim(),
            startIndex,
            endIndex: startIndex + currentSectionContent.length,
          });
        }
        
        // 开始新段落
        currentSection = detectedSection;
        currentSectionStart = i;
        currentSectionContent = line;
      } else if (currentSection) {
        // 继续添加到当前段落
        currentSectionContent += '\n' + line;
      }
    }
    
    // 保存最后一个段落
    if (currentSection && currentSectionContent) {
      const startIndex = content.indexOf(currentSectionContent);
      sections.set(currentSection, {
        content: currentSectionContent.trim(),
        startIndex,
        endIndex: startIndex + currentSectionContent.length,
      });
    }
    
    return {
      sections,
      confidence: this.calculateConfidence(sections.size),
    };
  }
  
  /**
   * 检测行中的段落类型
   * @param line 文本行
   * @returns 检测到的段落类型，如果没有则返回 null
   */
  private detectSection(line: string): MedicalRecordSection | null {
    const lowerLine = line.toLowerCase();
    
    for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerLine.includes(keyword.toLowerCase())) {
          // 检查是否是标题行（通常较短且以冒号或其他标记结尾）
          if (line.length < 100 && (line.includes('：') || line.includes(':') || line.includes('—'))) {
            return section as MedicalRecordSection;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * 计算置信度
   * 基于识别到的段落数量
   * @param sectionCount 识别到的段落数
   * @returns 置信度（0-1）
   */
  private calculateConfidence(sectionCount: number): number {
    // 识别到的段落越多，置信度越高
    // 最多识别 18 个段落，所以最高置信度为 1
    return Math.min(sectionCount / 18, 1);
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
