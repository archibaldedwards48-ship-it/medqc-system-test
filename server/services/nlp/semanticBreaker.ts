/**
 * NLP Pipeline - Stage 2: 语义断路器
 * 识别段落之间的逻辑关系和断路点
 */

import { SemanticCircuitBreakerResult, SectionInfo } from '../../types/nlp.types';

// 逻辑断路标记
const LOGICAL_BREAKPOINTS = [
  '但是', '然而', '不过', '相反', '反之', 'however', 'but',
  '因此', '所以', '由此', '故', 'therefore', 'thus',
  '首先', '其次', '再次', '最后', 'first', 'second', 'finally',
  '总之', '综上', '总结', '总体', 'in conclusion', 'in summary',
];

// 强调标记
const EMPHASIS_MARKS = ['**', '##', '!!', '※', '★', '●', '■'];

/**
 * 语义断路器
 * 识别段落之间的逻辑关系和断路点
 */
export class SemanticCircuitBreaker {
  /**
   * 执行语义断路分析
   * @param content 医疗记录内容
   * @param sections 段落映射
   * @returns 语义断路结果
   */
  async analyze(
    content: string,
    sections: Map<string, SectionInfo>
  ): Promise<SemanticCircuitBreakerResult> {
    const breakpoints: Array<{
      position: number;
      type: 'section_boundary' | 'logical_break' | 'emphasis_mark';
    }> = [];
    
    // 1. 检测段落边界
    for (const [_, info] of sections) {
      breakpoints.push({
        position: info.startIndex,
        type: 'section_boundary',
      });
    }
    
    // 2. 检测逻辑断路
    const logicalBreakpoints = this.detectLogicalBreaks(content);
    breakpoints.push(...logicalBreakpoints);
    
    // 3. 检测强调标记
    const emphasisBreakpoints = this.detectEmphasisMarks(content);
    breakpoints.push(...emphasisBreakpoints);
    
    // 按位置排序
    breakpoints.sort((a, b) => a.position - b.position);
    
    // 移除重复
    const uniqueBreakpoints = this.deduplicateBreakpoints(breakpoints);
    
    return {
      sections,
      breakpoints: uniqueBreakpoints,
      confidence: this.calculateConfidence(uniqueBreakpoints.length),
    };
  }
  
  /**
   * 检测逻辑断路
   * @param content 文本内容
   * @returns 逻辑断路点列表
   */
  private detectLogicalBreaks(content: string): Array<{
    position: number;
    type: 'logical_break';
  }> {
    const breakpoints: Array<{
      position: number;
      type: 'logical_break';
    }> = [];
    
    for (const breakpoint of LOGICAL_BREAKPOINTS) {
      let index = 0;
      while ((index = content.indexOf(breakpoint, index)) !== -1) {
        breakpoints.push({
          position: index,
          type: 'logical_break',
        });
        index += breakpoint.length;
      }
    }
    
    return breakpoints;
  }
  
  /**
   * 检测强调标记
   * @param content 文本内容
   * @returns 强调标记点列表
   */
  private detectEmphasisMarks(content: string): Array<{
    position: number;
    type: 'emphasis_mark';
  }> {
    const breakpoints: Array<{
      position: number;
      type: 'emphasis_mark';
    }> = [];
    
    for (const mark of EMPHASIS_MARKS) {
      let index = 0;
      while ((index = content.indexOf(mark, index)) !== -1) {
        breakpoints.push({
          position: index,
          type: 'emphasis_mark',
        });
        index += mark.length;
      }
    }
    
    return breakpoints;
  }
  
  /**
   * 移除重复的断路点
   * @param breakpoints 断路点列表
   * @returns 去重后的断路点列表
   */
  private deduplicateBreakpoints(
    breakpoints: Array<{
      position: number;
      type: 'section_boundary' | 'logical_break' | 'emphasis_mark';
    }>
  ): Array<{
    position: number;
    type: 'section_boundary' | 'logical_break' | 'emphasis_mark';
  }> {
    const seen = new Set<number>();
    return breakpoints.filter(bp => {
      if (seen.has(bp.position)) {
        return false;
      }
      seen.add(bp.position);
      return true;
    });
  }
  
  /**
   * 计算置信度
   * 基于检测到的断路点数量
   * @param breakpointCount 断路点数量
   * @returns 置信度（0-1）
   */
  private calculateConfidence(breakpointCount: number): number {
    // 检测到的断路点越多，置信度越高
    // 假设最多 50 个断路点，所以最高置信度为 1
    return Math.min(breakpointCount / 50, 1);
  }
  
  /**
   * 获取两个断路点之间的内容
   * @param content 文本内容
   * @param startPosition 起始位置
   * @param endPosition 结束位置
   * @returns 中间的内容
   */
  getContentBetween(content: string, startPosition: number, endPosition: number): string {
    return content.substring(startPosition, endPosition).trim();
  }
  
  /**
   * 按断路点分割文本
   * @param content 文本内容
   * @param breakpoints 断路点列表
   * @returns 分割后的文本段落
   */
  splitByBreakpoints(
    content: string,
    breakpoints: Array<{ position: number; type: string }>
  ): string[] {
    const segments: string[] = [];
    
    for (let i = 0; i < breakpoints.length; i++) {
      const start = breakpoints[i].position;
      const end = i + 1 < breakpoints.length ? breakpoints[i + 1].position : content.length;
      segments.push(content.substring(start, end).trim());
    }
    
    return segments.filter(s => s.length > 0);
  }
}

// 导出单例
export const semanticCircuitBreaker = new SemanticCircuitBreaker();
