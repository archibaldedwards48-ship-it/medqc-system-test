/**
 * NLP Pipeline - Stage 4: 零锚点处理
 * 处理没有明确参考值的指标，通过医学知识库进行标准化
 */

import { ZeroAnchorProcessingResult, Indicator } from '../../types/nlp.types';
import { getMedicalTerminologyByTerm, getDrugByName } from '../../db';

// 常见指标的标准参考范围
const STANDARD_REFERENCE_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  '血压': { min: 90, max: 140, unit: 'mmHg' },
  '心率': { min: 60, max: 100, unit: 'bpm' },
  '体温': { min: 36.5, max: 37.5, unit: '℃' },
  '呼吸频率': { min: 12, max: 20, unit: '次/分' },
  '血氧饱和度': { min: 95, max: 100, unit: '%' },
  '血糖': { min: 3.9, max: 6.1, unit: 'mmol/L' },
  '血红蛋白': { min: 120, max: 160, unit: 'g/L' },
  '白细胞': { min: 4.5, max: 11, unit: '×10^9/L' },
  '血小板': { min: 150, max: 400, unit: '×10^9/L' },
};

/**
 * 零锚点处理器
 * 处理没有参考值的指标，进行标准化和补充
 */
export class ZeroAnchorProcessor {
  /**
   * 执行零锚点处理
   * @param indicators 指标列表
   * @returns 零锚点处理结果
   */
  async process(indicators: Indicator[]): Promise<ZeroAnchorProcessingResult> {
    const normalizedIndicators: Indicator[] = [];
    
    for (const indicator of indicators) {
      // 如果没有参考范围，尝试补充
      if (!indicator.referenceRange) {
        const normalized = await this.normalizeIndicator(indicator);
        normalizedIndicators.push(normalized);
      } else {
        normalizedIndicators.push(indicator);
      }
    }
    
    return {
      indicators,
      normalizedIndicators,
      confidence: this.calculateConfidence(normalizedIndicators),
    };
  }
  
  /**
   * 标准化指标
   * 补充缺失的参考范围和单位
   * @param indicator 指标
   * @returns 标准化后的指标
   */
  private async normalizeIndicator(indicator: Indicator): Promise<Indicator> {
    const normalized = { ...indicator };
    
    // 1. 尝试从标准参考范围中获取
    if (STANDARD_REFERENCE_RANGES[indicator.name]) {
      const range = STANDARD_REFERENCE_RANGES[indicator.name];
      normalized.referenceRange = `${range.min}-${range.max}`;
      
      if (!normalized.unit) {
        normalized.unit = range.unit;
      }
      
      // 更新异常状态
      const value = this.parseValue(indicator.value);
      if (value !== null) {
        normalized.isAbnormal = value < range.min || value > range.max;
      }
    }
    
    // 2. 尝试从医学术语库中获取
    try {
      const terminology = await getMedicalTerminologyByTerm(indicator.name);
      if (terminology) {
        // 可以从术语库中获取额外信息
        if (!normalized.referenceRange) {
          // 从术语库中提取参考范围（如果有的话）
        }
      }
    } catch (error) {
      // 忽略数据库错误，继续处理
    }
    
    // 3. 标准化单位
    normalized.unit = this.normalizeUnit(normalized.unit || '', indicator.name);
    
    return normalized;
  }
  
  /**
   * 标准化单位
   * @param unit 原始单位
   * @param indicatorName 指标名称
   * @returns 标准化后的单位
   */
  private normalizeUnit(unit: string, indicatorName: string): string {
    // 常见单位映射
    const unitMappings: Record<string, string> = {
      'mmhg': 'mmHg',
      '毫米汞柱': 'mmHg',
      'bpm': 'bpm',
      '次/分': 'bpm',
      '/min': 'bpm',
      '℃': '℃',
      '°c': '℃',
      '摄氏度': '℃',
      '%': '%',
      'mmol/l': 'mmol/L',
      'mg/dl': 'mg/dL',
      'g/l': 'g/L',
      '×10^9/l': '×10^9/L',
    };
    
    const lowerUnit = unit.toLowerCase();
    return unitMappings[lowerUnit] || unit;
  }
  
  /**
   * 解析指标值
   * @param value 指标值（可能是字符串）
   * @returns 数值，如果无法解析则返回 null
   */
  private parseValue(value: string): number | null {
    // 处理范围值（如 "120-160"）
    if (value.includes('-')) {
      const parts = value.split('-');
      if (parts.length === 2) {
        const avg = (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
        return isNaN(avg) ? null : avg;
      }
    }
    
    // 处理单个数值
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  
  /**
   * 检测异常指标
   * @param indicators 指标列表
   * @returns 异常指标列表
   */
  detectAbnormalIndicators(indicators: Indicator[]): Indicator[] {
    return indicators.filter(ind => ind.isAbnormal);
  }
  
  /**
   * 按严重程度分类指标
   * @param indicators 指标列表
   * @returns 按严重程度分类的指标
   */
  classifyBySeverity(indicators: Indicator[]): Record<string, Indicator[]> {
    const classified: Record<string, Indicator[]> = {
      critical: [],
      major: [],
      minor: [],
      normal: [],
    };
    
    for (const indicator of indicators) {
      if (indicator.severity === 'critical') {
        classified.critical.push(indicator);
      } else if (indicator.severity === 'major') {
        classified.major.push(indicator);
      } else if (indicator.severity === 'minor') {
        classified.minor.push(indicator);
      } else if (!indicator.isAbnormal) {
        classified.normal.push(indicator);
      }
    }
    
    return classified;
  }
  
  /**
   * 计算置信度
   * @param normalizedIndicators 标准化后的指标列表
   * @returns 置信度（0-1）
   */
  private calculateConfidence(normalizedIndicators: Indicator[]): number {
    if (normalizedIndicators.length === 0) {
      return 0;
    }
    
    // 计算有参考范围的指标比例
    const withReferenceRange = normalizedIndicators.filter(ind => ind.referenceRange).length;
    return withReferenceRange / normalizedIndicators.length;
  }
  
  /**
   * 生成指标摘要
   * @param indicators 指标列表
   * @returns 摘要信息
   */
  generateSummary(indicators: Indicator[]): {
    total: number;
    abnormal: number;
    critical: number;
    major: number;
    minor: number;
  } {
    return {
      total: indicators.length,
      abnormal: indicators.filter(ind => ind.isAbnormal).length,
      critical: indicators.filter(ind => ind.severity === 'critical').length,
      major: indicators.filter(ind => ind.severity === 'major').length,
      minor: indicators.filter(ind => ind.severity === 'minor').length,
    };
  }
}

// 导出单例
export const zeroAnchorProcessor = new ZeroAnchorProcessor();
