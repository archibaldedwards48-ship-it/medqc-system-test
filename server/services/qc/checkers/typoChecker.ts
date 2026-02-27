/**
 * D5: 错别字检查服务
 * 基于错别字映射库扫描病历文本中的错别字
 */

import fs from 'fs';
import path from 'path';

export interface TypoIssue {
  wrong: string;
  correct: string;
  position: number;
  category: string;
}

export interface TypoMapping {
  wrong: string;
  correct: string;
  category: string;
}

export class TypoChecker {
  private mappings: TypoMapping[] = [];

  constructor() {
    this.loadMappings();
  }

  /**
   * 加载错别字映射库
   */
  private loadMappings() {
    try {
      const dataPath = path.resolve(process.cwd(), 'data/d5_typo_mapping.json');
      if (fs.existsSync(dataPath)) {
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        this.mappings = JSON.parse(rawData);
      }
    } catch (error) {
      console.error('Failed to load typo mappings:', error);
      this.mappings = [];
    }
  }

  /**
   * 扫描文本中的错别字
   */
  public check(text: string): TypoIssue[] {
    if (!text) return [];

    const issues: TypoIssue[] = [];

    for (const mapping of this.mappings) {
      if (!mapping.wrong) continue;

      let pos = text.indexOf(mapping.wrong);
      while (pos !== -1) {
        issues.push({
          wrong: mapping.wrong,
          correct: mapping.correct,
          position: pos,
          category: mapping.category,
        });
        
        // 继续查找下一个
        pos = text.indexOf(mapping.wrong, pos + 1);
      }
    }

    // 按位置排序
    return issues.sort((a, b) => a.position - b.position);
  }
}

export const typoChecker = new TypoChecker();
