/**
 * NLP Pipeline - Stage 5: 医学校验
 * 验证提取的信息是否符合医学常识
 */

import { MedicalValidationResult, Indicator, NlpError } from '../../types/nlp.types';
import { getDrugByName, getQcConfigsByType } from '../../db';

/**
 * 医学校验器
 * 验证提取的医学信息的合理性
 */
export class MedicalValidator {
  /**
   * 执行医学校验
   * @param indicators 指标列表
   * @returns 医学校验结果
   */
  async validate(indicators: Indicator[]): Promise<MedicalValidationResult> {
    const validationErrors: Array<{
      indicator: Indicator;
      error: string;
      severity: 'warning' | 'error';
    }> = [];
    
    for (const indicator of indicators) {
      const errors = await this.validateIndicator(indicator);
      validationErrors.push(...errors.map(error => ({
        indicator,
        error,
        severity: 'warning' as const,
      })));
    }
    
    return {
      indicators,
      totalIndicators: indicators.length,
      validationErrors,
      confidence: this.calculateConfidence(indicators.length, validationErrors.length),
    };
  }
  
  /**
   * 验证单个指标
   * @param indicator 指标
   * @returns 错误列表
   */
  private async validateIndicator(indicator: Indicator): Promise<string[]> {
    const errors: string[] = [];
    
    // 1. 检查基本信息
    if (!indicator.name) {
      errors.push('指标名称缺失');
    }
    
    if (!indicator.value) {
      errors.push('指标值缺失');
    }
    
    // 2. 检查数值范围合理性
    const value = this.parseValue(indicator.value);
    if (value !== null) {
      const rangeError = this.validateValueRange(indicator.name, value);
      if (rangeError) {
        errors.push(rangeError);
      }
    }
    
    // 3. 检查单位是否合理
    if (indicator.unit) {
      const unitError = this.validateUnit(indicator.name, indicator.unit);
      if (unitError) {
        errors.push(unitError);
      }
    }
    
    // 4. 检查参考范围是否合理
    if (indicator.referenceRange) {
      const refRangeError = this.validateReferenceRange(indicator.referenceRange);
      if (refRangeError) {
        errors.push(refRangeError);
      }
    }
    
    // 5. 特殊指标的医学校验
    const specialError = await this.validateSpecialIndicator(indicator);
    if (specialError) {
      errors.push(specialError);
    }
    
    return errors;
  }
  
  /**
   * 验证数值范围
   * @param indicatorName 指标名称
   * @param value 数值
   * @returns 错误信息，如果没有错误则返回 null
   */
  private validateValueRange(indicatorName: string, value: number): string | null {
    // 定义各指标的合理范围
    const validRanges: Record<string, { min: number; max: number }> = {
      '血压': { min: 0, max: 300 },
      '心率': { min: 0, max: 300 },
      '体温': { min: 30, max: 45 },
      '呼吸频率': { min: 0, max: 60 },
      '血氧饱和度': { min: 0, max: 100 },
      '血糖': { min: 0, max: 50 },
      '血红蛋白': { min: 0, max: 250 },
      '白细胞': { min: 0, max: 100 },
      '血小板': { min: 0, max: 1000 },
    };
    
    const range = validRanges[indicatorName];
    if (range && (value < range.min || value > range.max)) {
      return `指标值 ${value} 超出合理范围 [${range.min}, ${range.max}]`;
    }
    
    return null;
  }
  
  /**
   * 验证单位
   * @param indicatorName 指标名称
   * @param unit 单位
   * @returns 错误信息，如果没有错误则返回 null
   */
  private validateUnit(indicatorName: string, unit: string): string | null {
    // 定义各指标的标准单位
    const standardUnits: Record<string, string[]> = {
      '血压': ['mmHg', 'kPa'],
      '心率': ['bpm', '次/分'],
      '体温': ['℃', '°C', '°F'],
      '呼吸频率': ['次/分', 'bpm'],
      '血氧饱和度': ['%'],
      '血糖': ['mmol/L', 'mg/dL'],
      '血红蛋白': ['g/L', 'g/dL'],
      '白细胞': ['×10^9/L', '×10^3/μL'],
      '血小板': ['×10^9/L', '×10^3/μL'],
    };
    
    const units = standardUnits[indicatorName];
    if (units && !units.includes(unit)) {
      return `单位 ${unit} 不符合指标 ${indicatorName} 的标准单位 [${units.join(', ')}]`;
    }
    
    return null;
  }
  
  /**
   * 验证参考范围
   * @param referenceRange 参考范围
   * @returns 错误信息，如果没有错误则返回 null
   */
  private validateReferenceRange(referenceRange: string): string | null {
    // 检查参考范围格式
    const rangePattern = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/;
    const match = referenceRange.match(rangePattern);
    
    if (!match) {
      return `参考范围格式不正确: ${referenceRange}`;
    }
    
    const min = parseFloat(match[1]);
    const max = parseFloat(match[2]);
    
    if (min >= max) {
      return `参考范围最小值 ${min} 不应小于等于最大值 ${max}`;
    }
    
    return null;
  }
  
  /**
   * 特殊指标的医学校验
   * @param indicator 指标
   * @returns 错误信息，如果没有错误则返回 null
   */
  private async validateSpecialIndicator(indicator: Indicator): Promise<string | null> {
    // 血压校验
    if (indicator.name === '血压') {
      const parts = indicator.value.split('/');
      if (parts.length === 2) {
        const systolic = parseFloat(parts[0]);
        const diastolic = parseFloat(parts[1]);
        
        if (systolic < diastolic) {
          return `血压值异常：收缩压 ${systolic} 不应小于舒张压 ${diastolic}`;
        }
      }
    }
    
    // 血糖校验（需要考虑进食状态）
    if (indicator.name === '血糖') {
      const value = parseFloat(indicator.value);
      if (value > 11) {
        // 可能是高血糖，需要进一步确认
      }
    }
    
    return null;
  }
  
  /**
   * 解析指标值
   * @param value 指标值
   * @returns 数值，如果无法解析则返回 null
   */
  private parseValue(value: string): number | null {
    // 处理范围值
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
   * 计算置信度
   * @param indicatorCount 指标总数
   * @param errorCount 错误总数
   * @returns 置信度（0-1）
   */
  private calculateConfidence(indicatorCount: number, errorCount: number): number {
    if (indicatorCount === 0) {
      return 0;
    }
    
    // 错误越少，置信度越高
    return Math.max(1 - errorCount / indicatorCount, 0);
  }
  
  /**
   * 生成校验报告
   * @param result 校验结果
   * @returns 校验报告
   */
  generateReport(result: MedicalValidationResult): {
    totalIndicators: number;
    validIndicators: number;
    invalidIndicators: number;
    errorCount: number;
    errorRate: number;
    summary: string;
  } {
    const invalidIndicators = new Set(result.validationErrors.map(e => e.indicator.name)).size;
    const errorCount = result.validationErrors.length;
    const errorRate = result.totalIndicators > 0 ? errorCount / result.totalIndicators : 0;
    
    return {
      totalIndicators: result.totalIndicators,
      validIndicators: result.totalIndicators - invalidIndicators,
      invalidIndicators,
      errorCount,
      errorRate,
      summary: `共检查 ${result.totalIndicators} 个指标，发现 ${errorCount} 个错误，错误率 ${(errorRate * 100).toFixed(2)}%`,
    };
  }
}

// 导出单例
export const medicalValidator = new MedicalValidator();
