import * as fs from 'fs';
import * as path from 'path';
import { SymptomMatch } from '../../types/nlp.types';

interface SymptomTerm {
  name: string;
  aliases: string[];
  bodyPart: string;
  category: string;
  [key: string]: any;
}

export class SymptomMatcher {
  private static instance: SymptomMatcher;
  private terms: SymptomTerm[] = [];
  private isLoaded = false;

  private constructor() {
    this.loadTerms();
  }

  public static getInstance(): SymptomMatcher {
    if (!SymptomMatcher.instance) {
      SymptomMatcher.instance = new SymptomMatcher();
    }
    return SymptomMatcher.instance;
  }

  private loadTerms() {
    try {
      const dataPath = path.join(process.cwd(), 'data', 'd7_symptom_terms.json');
      if (fs.existsSync(dataPath)) {
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        this.terms = JSON.parse(rawData) as SymptomTerm[];
        this.isLoaded = true;
      }
    } catch (error) {
      console.error('Failed to load symptom terms:', error);
    }
  }

  /**
   * 在文本中匹配症状术语
   * @param text 待匹配文本
   * @returns 匹配到的症状结果列表
   */
  public matchSymptoms(text: string): SymptomMatch[] {
    if (!text || !this.isLoaded) return [];

    const matches: SymptomMatch[] = [];
    
    for (const term of this.terms) {
      // 检查主名称
      let pos = text.indexOf(term.name);
      if (pos !== -1) {
        matches.push({
          name: term.name,
          bodyPart: term.bodyPart,
          category: term.category,
          matchedAlias: term.name,
          position: pos
        });
      }

      // 检查别名
      if (term.aliases && term.aliases.length > 0) {
        for (const alias of term.aliases) {
          // 避免重复匹配（如果主名称已经匹配到相同位置或包含该别名）
          // 这里简单处理：如果别名匹配到的位置不同，则记录
          let aliasPos = text.indexOf(alias);
          while (aliasPos !== -1) {
            // 检查是否已经记录过该术语在同一位置的匹配
            const alreadyMatched = matches.some(m => m.name === term.name && m.position === aliasPos);
            if (!alreadyMatched) {
              matches.push({
                name: term.name,
                bodyPart: term.bodyPart,
                category: term.category,
                matchedAlias: alias,
                position: aliasPos
              });
            }
            // 继续查找下一个出现位置
            aliasPos = text.indexOf(alias, aliasPos + 1);
          }
        }
      }
    }

    // 按位置排序
    return matches.sort((a, b) => a.position - b.position);
  }
}

export const symptomMatcher = SymptomMatcher.getInstance();
