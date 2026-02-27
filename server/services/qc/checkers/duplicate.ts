import { IQcChecker, IssueType, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';

export class DuplicateChecker implements IQcChecker {
  name = 'duplicate' as const;

  /**
   * 检查病历内容重复性
   * 目前主要实现横向查重（同份病历不同段落间的重复）
   */
  async check(record: MedicalRecord, nlpResult: NlpResult, rules: QcRule[]): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    const sections = Array.from(nlpResult.sectionMap.entries());

    // 遍历所有段落对，检查相似度
    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        const [name1, sec1] = sections[i];
        const [name2, sec2] = sections[j];

        // 过滤掉内容太短的段落，避免误报
        if (sec1.content.length < 10 || sec2.content.length < 10) continue;

        const similarity = this.calculateSimilarity(sec1.content, sec2.content);

        if (similarity > 0.7) {
          issues.push({
            type: 'duplicate' as IssueType,
            severity: similarity > 0.9 ? 'major' : 'minor',
            message: `段落"${this.getSectionDisplayName(name1)}"与"${this.getSectionDisplayName(name2)}"内容高度重复（相似度: ${Math.round(similarity * 100)}%）`,
            suggestion: '请检查是否存在复制粘贴行为，确保各章节内容描述的针对性和准确性',
            ruleId: 'DUPLICATE_SECTION_CONTENT'
          });
        }
      }
    }

    return issues;
  }

  /**
   * 计算两个字符串的相似度 (基于 Jaccard 相似度)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(this.tokenize(str1));
    const set2 = new Set(this.tokenize(str2));

    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * 简单的分词处理（移除标点符号并按字符切分，适合中文）
   */
  private tokenize(text: string): string[] {
    // 使用 Array.from 确保正确处理 Unicode 字符（如中文）
    return Array.from(text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ''))
      .filter(c => c.trim().length > 0);
  }

  private getSectionDisplayName(name: string): string {
    const mapping: Record<string, string> = {
      chief_complaint: '主诉',
      present_illness: '现病史',
      history_of_present_illness: '现病史',
      past_history: '既往史',
      past_medical_history: '既往史',
      physical_examination: '体格检查',
      diagnosis: '诊断',
      plan: '诊疗计划'
    };
    return mapping[name] || name;
  }
}

export const duplicateChecker = new DuplicateChecker();
