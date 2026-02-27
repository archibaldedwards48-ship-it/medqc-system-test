/**
 * NLP Pipeline - Stage 3: 指标提取
 * 从文本中提取医学指标（血压、血糖等）
 */

import { MetricExtractionResult, Entity, Indicator } from '../../types/nlp.types';
import { getSymptomTerms } from '../../db';

// 医学指标正则表达式
const VITAL_SIGNS_PATTERNS = {
  blood_pressure: /(\d{2,3})\/(\d{2,3})\s*(mmHg|毫米汞柱)/gi,
  heart_rate: /(\d{2,3})\s*(bpm|次\/分|\/min|心率)/gi,
  temperature: /(\d{2}\.\d)\s*(℃|°C|摄氏度|度)/gi,
  respiratory_rate: /(\d{1,2})\s*(次\/分|\/min|呼吸频率)/gi,
  oxygen_saturation: /(\d{1,3})%\s*(SpO2|血氧|O2饱和度)/gi,
  blood_glucose: /(\d{1,3}(?:\.\d{1,2})?)\s*(mg\/dL|mmol\/L|血糖)/gi,
};

// 实体类型关键词
const ENTITY_KEYWORDS = {
  medication: ['阿司匹林', '青霉素', '头孢', '胰岛素', '药物', '用药', '处方'],
  diagnosis: ['高血压', '糖尿病', '心脏病', '感染', '诊断', '疾病'],
  lab_result: ['血红蛋白', '白细胞', '血小板', '血糖', '尿酸', '肌酐'],
  procedure: ['手术', '穿刺', '切除', '置管', '操作', '程序'],
  symptom: [], // 将由数据库动态填充
  vital_sign: ['血压', '心率', '体温', '呼吸', '血氧', '脉搏'],
};

/**
 * 指标提取器
 * 从医疗记录中提取医学指标和实体
 */
export class MetricExtractor {
  private symptomTerms: string[] = [];
  private initialized = false;

  /**
   * 初始化提取器，加载数据库词表
   */
  async initialize() {
    if (this.initialized) return;
    this.symptomTerms = await getSymptomTerms();
    this.initialized = true;
  }

  /**
   * 执行指标提取
   * @param content 医疗记录内容
   * @returns 指标提取结果
   */
  async extract(content: string): Promise<MetricExtractionResult> {
    // 确保已初始化
    await this.initialize();

    const indicators: Indicator[] = [];
    const entities: Entity[] = [];

    // 1. 提取生命体征
    const vitalSigns = this.extractVitalSigns(content);
    indicators.push(...vitalSigns);
    
    // 2. 提取实验室结果
    const labResults = this.extractLabResults(content);
    indicators.push(...labResults);
    
    // 3. 提取实体
    const extractedEntities = this.extractEntities(content);
    entities.push(...extractedEntities);
    
    return {
      indicators,
      entities,
      confidence: this.calculateConfidence(indicators.length, entities.length),
    };
  }
  
  /**
   * 提取生命体征
   * @param content 文本内容
   * @returns 生命体征列表
   */
  private extractVitalSigns(content: string): Indicator[] {
    const indicators: Indicator[] = [];
    
    // 血压
    const bpMatches = content.matchAll(VITAL_SIGNS_PATTERNS.blood_pressure);
    for (const match of bpMatches) {
      const systolic = parseInt(match[1]);
      const diastolic = parseInt(match[2]);
      indicators.push({
        name: '血压',
        value: `${systolic}/${diastolic}`,
        unit: 'mmHg',
        referenceRange: '90-140/60-90',
        isAbnormal: systolic > 140 || diastolic > 90,
        severity: systolic > 160 || diastolic > 100 ? 'critical' : systolic > 140 || diastolic > 90 ? 'major' : undefined,
      });
    }
    
    // 心率
    const hrMatches = content.matchAll(VITAL_SIGNS_PATTERNS.heart_rate);
    for (const match of hrMatches) {
      const rate = parseInt(match[1]);
      indicators.push({
        name: '心率',
        value: rate.toString(),
        unit: 'bpm',
        referenceRange: '60-100',
        isAbnormal: rate < 60 || rate > 100,
        severity: rate < 40 || rate > 120 ? 'critical' : rate < 60 || rate > 100 ? 'major' : undefined,
      });
    }
    
    // 体温
    const tempMatches = content.matchAll(VITAL_SIGNS_PATTERNS.temperature);
    for (const match of tempMatches) {
      const temp = parseFloat(match[1]);
      indicators.push({
        name: '体温',
        value: temp.toString(),
        unit: '℃',
        referenceRange: '36.5-37.5',
        isAbnormal: temp < 36.5 || temp > 37.5,
        severity: temp < 35 || temp > 39 ? 'critical' : temp < 36.5 || temp > 37.5 ? 'major' : undefined,
      });
    }
    
    // 呼吸频率
    const rrMatches = content.matchAll(VITAL_SIGNS_PATTERNS.respiratory_rate);
    for (const match of rrMatches) {
      const rate = parseInt(match[1]);
      indicators.push({
        name: '呼吸频率',
        value: rate.toString(),
        unit: '次/分',
        referenceRange: '12-20',
        isAbnormal: rate < 12 || rate > 20,
        severity: rate < 8 || rate > 30 ? 'critical' : rate < 12 || rate > 20 ? 'major' : undefined,
      });
    }
    
    // 血氧饱和度
    const o2Matches = content.matchAll(VITAL_SIGNS_PATTERNS.oxygen_saturation);
    for (const match of o2Matches) {
      const spo2 = parseInt(match[1]);
      indicators.push({
        name: '血氧饱和度',
        value: spo2.toString(),
        unit: '%',
        referenceRange: '95-100',
        isAbnormal: spo2 < 95,
        severity: spo2 < 90 ? 'critical' : spo2 < 95 ? 'major' : undefined,
      });
    }
    
    // 血糖
    const bgMatches = content.matchAll(VITAL_SIGNS_PATTERNS.blood_glucose);
    for (const match of bgMatches) {
      const glucose = parseFloat(match[1]);
      indicators.push({
        name: '血糖',
        value: glucose.toString(),
        unit: 'mmol/L',
        referenceRange: '3.9-6.1',
        isAbnormal: glucose < 3.9 || glucose > 6.1,
        severity: glucose < 2.8 || glucose > 11 ? 'critical' : glucose < 3.9 || glucose > 6.1 ? 'major' : undefined,
      });
    }
    
    return indicators;
  }
  
  /**
   * 提取实验室结果
   * @param content 文本内容
   * @returns 实验室结果列表
   */
  private extractLabResults(content: string): Indicator[] {
    const indicators: Indicator[] = [];
    
    // 简单的实验室结果提取（基于关键词）
    const labKeywords = ['血红蛋白', '白细胞', '血小板', '血糖', '尿酸', '肌酐', '胆固醇'];
    
    for (const keyword of labKeywords) {
      const regex = new RegExp(`${keyword}[：:]*\\s*(\\d+(?:\\.\\d+)?)\\s*([a-zA-Z/]*)`);
      const matches = content.matchAll(new RegExp(regex.source, 'g'));
      
      for (const match of matches) {
        indicators.push({
          name: keyword,
          value: match[1],
          unit: match[2] || '',
          isAbnormal: false, // 需要与参考值比对
        });
      }
    }
    
    return indicators;
  }
  
  /**
   * 提取实体
   * @param content 文本内容
   * @returns 实体列表
   */
  private extractEntities(content: string): Entity[] {
    const entities: Entity[] = [];

    for (const [type, keywords] of Object.entries(ENTITY_KEYWORDS)) {
      // 如果是症状类型，使用动态加载的词表
      const actualKeywords = type === "symptom" ? this.symptomTerms : (keywords as string[]);

      for (const keyword of actualKeywords) {
        if (!keyword) continue;
        // 医疗文本中可能没有空格分隔，去掉 \b 约束，改用 includes 或全局正则
        // 考虑到性能和匹配准确性，这里使用 indexOf 循环匹配
        let pos = content.indexOf(keyword);
        while (pos !== -1) {
          entities.push({
            text: keyword,
            type: type as any,
            startIndex: pos,
            endIndex: pos + keyword.length,
            confidence: 0.85,
          });
          pos = content.indexOf(keyword, pos + keyword.length);
        }
      }
    }

    return entities;
  }
  
  /**
   * 计算置信度
   * @param indicatorCount 指标数量
   * @param entityCount 实体数量
   * @returns 置信度（0-1）
   */
  private calculateConfidence(indicatorCount: number, entityCount: number): number {
    // 基于提取的指标和实体数量计算置信度
    const totalExtracted = indicatorCount + entityCount;
    return Math.min(totalExtracted / 20, 1);
  }
  
  /**
   * 验证指标的合理性
   * @param indicator 指标
   * @returns 是否合理
   */
  validateIndicator(indicator: Indicator): boolean {
    // 基本的合理性检查
    if (!indicator.name || !indicator.value) {
      return false;
    }
    
    // 检查数值是否为有效数字
    const numValue = parseFloat(indicator.value);
    if (isNaN(numValue)) {
      return false;
    }
    
    return true;
  }
}

// 导出单例
export const metricExtractor = new MetricExtractor();
