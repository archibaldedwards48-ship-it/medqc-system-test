import * as fs from 'fs';
import * as path from 'path';

export interface TypoResult {
  wrong: string;
  correct: string;
  position: number;
  context: string;
  category: string;
}

export interface TypoMapping {
  wrong: string;
  correct: string;
  category: string;
}

export class TypoDetector {
  private static instance: TypoDetector;
  private mapping: TypoMapping[] = [];
  private isLoaded = false;

  private constructor() {
    this.loadMapping();
  }

  public static getInstance(): TypoDetector {
    if (!TypoDetector.instance) {
      TypoDetector.instance = new TypoDetector();
    }
    return TypoDetector.instance;
  }

  private loadMapping() {
    try {
      const dataPath = path.join(process.cwd(), 'data', 'd5_typo_mapping.json');
      if (fs.existsSync(dataPath)) {
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        this.mapping = JSON.parse(rawData) as TypoMapping[];
        this.isLoaded = true;
      }
    } catch (error) {
      console.error('Failed to load typo mapping:', error);
    }
  }

  /**
   * 在文本中检测错别字
   * @param text 待检测文本
   * @returns 错别字检测结果列表
   */
  public detectTypos(text: string): TypoResult[] {
    if (!text || !this.isLoaded) return [];

    const results: TypoResult[] = [];
    
    // 为了提高效率，我们可以按错别字长度从长到短排序，避免子串冲突（虽然在这个库中可能不明显）
    const sortedMapping = [...this.mapping].sort((a, b) => b.wrong.length - a.wrong.length);

    for (const item of sortedMapping) {
      let pos = text.indexOf(item.wrong);
      while (pos !== -1) {
        // 检查是否已经覆盖过这个位置（简单的位置冲突检查）
        const isAlreadyCovered = results.some(r => 
          (pos >= r.position && pos < r.position + r.wrong.length) ||
          (pos + item.wrong.length > r.position && pos + item.wrong.length <= r.position + r.wrong.length)
        );

        if (!isAlreadyCovered) {
          // 获取上下文 (前后各 10 个字符)
          const start = Math.max(0, pos - 10);
          const end = Math.min(text.length, pos + item.wrong.length + 10);
          const context = text.substring(start, end);

          results.push({
            wrong: item.wrong,
            correct: item.correct,
            position: pos,
            context: context,
            category: item.category
          });
        }
        
        pos = text.indexOf(item.wrong, pos + 1);
      }
    }

    // 按位置排序
    return results.sort((a, b) => a.position - b.position);
  }
}

export const typoDetector = TypoDetector.getInstance();
