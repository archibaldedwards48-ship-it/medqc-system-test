/**
 * NLP Pipeline - 主入口
 * 编排 5 个阶段的处理流程
 */

import { NlpResult, NlpProcessingOptions, NlpError, Indicator, Entity, Relationship, SectionInfo, SymptomMatch } from '../../types/nlp.types';
import { paragraphIndexer } from './paragraphIndexer';
import { semanticCircuitBreaker } from './semanticBreaker';
import { metricExtractor } from './metricExtractor';
import { symptomMatcher } from './symptomMatcher';
import { zeroAnchorProcessor } from './zeroAnchorProcessor';
import { medicalValidator } from './medicalValidator';

/**
 * NLP Pipeline 类
 * 管理整个 NLP 处理流程
 */
export class NlpPipeline {
  private errors: NlpError[] = [];
  
  /**
   * 执行完整的 NLP 处理流程
   * @param content 医疗记录内容
   * @param options 处理选项
   * @returns NLP 处理结果
   */
  async process(content: string, options?: NlpProcessingOptions): Promise<NlpResult> {
    this.errors = [];
    
    try {
      // 默认执行所有阶段
      const stages = options?.stages || [
        'indexing',
        'semantic_circuit_breaker',
        'metric_extraction',
        'symptom_matching',
        'zero_anchor',
        'validation',
      ];
      
      let sectionMap = new Map<string, SectionInfo>();
      let indicators: Indicator[] = [];
      let entities: Entity[] = [];
      let relationships: Relationship[] = [];
      let symptomMatches: SymptomMatch[] = [];
      let confidence = 1;
      
      // Stage 1: 段落索引
      if (stages.includes('indexing')) {
        try {
          const indexResult = await paragraphIndexer.index(content);
          sectionMap = indexResult.sections;
          confidence *= indexResult.confidence;
        } catch (error) {
          this.addError('indexing', error instanceof Error ? error.message : '段落索引失败', 'error');
        }
      }
      
      // Stage 2: 语义断路器
      if (stages.includes('semantic_circuit_breaker')) {
        try {
          const breakerResult = await semanticCircuitBreaker.analyze(content, sectionMap);
          sectionMap = breakerResult.sections;
          confidence *= breakerResult.confidence;
        } catch (error) {
          this.addError('semantic_circuit_breaker', error instanceof Error ? error.message : '语义断路失败', 'warning');
        }
      }
      
      // Stage 3: 指标提取
      if (stages.includes('metric_extraction')) {
        try {
          const extractResult = await metricExtractor.extract(content);
          indicators = extractResult.indicators;
          entities = extractResult.entities;
          confidence *= extractResult.confidence;
        } catch (error) {
          this.addError('metric_extraction', error instanceof Error ? error.message : '指标提取失败', 'warning');
        }
      }

      // 新增可选 Stage: symptom_matching
      if (stages.includes('symptom_matching')) {
        try {
          symptomMatches = symptomMatcher.matchSymptoms(content);
        } catch (error) {
          this.addError('symptom_matching', error instanceof Error ? error.message : '症状匹配失败', 'warning');
        }
      }
      
      // Stage 4: 零锚点处理
      if (stages.includes('zero_anchor')) {
        try {
          const zeroAnchorResult = await zeroAnchorProcessor.process(indicators);
          indicators = zeroAnchorResult.normalizedIndicators;
          confidence *= zeroAnchorResult.confidence;
        } catch (error) {
          this.addError('zero_anchor', error instanceof Error ? error.message : '零锚点处理失败', 'warning');
        }
      }
      
      // Stage 5: 医学校验
      if (stages.includes('validation')) {
        try {
          const validationResult = await medicalValidator.validate(indicators);
          confidence *= validationResult.confidence;
          
          // 如果有严重错误，记录下来
          for (const error of validationResult.validationErrors) {
            if (error.severity === 'error') {
              this.addError('validation', error.error, 'error');
            }
          }
        } catch (error) {
          this.addError('validation', error instanceof Error ? error.message : '医学校验失败', 'warning');
        }
      }
      
      return {
        sectionMap,
        indicators,
        entities,
        relationships,
        symptomMatches,
        confidence: Math.max(confidence, 0),
      };
    } catch (error) {
      this.addError('pipeline', error instanceof Error ? error.message : '管道执行失败', 'error');
      
      // 返回部分结果
      return {
        sectionMap: new Map(),
        indicators: [],
        entities: [],
        relationships: [],
        confidence: 0,
      };
    }
  }
  
  /**
   * 添加错误
   * @param stage 阶段名称
   * @param message 错误信息
   * @param severity 严重程度
   */
  private addError(stage: string, message: string, severity: 'warning' | 'error'): void {
    this.errors.push({
      stage,
      message,
      severity,
    });
  }
  
  /**
   * 获取所有错误
   * @returns 错误列表
   */
  getErrors(): NlpError[] {
    return this.errors;
  }
  
  /**
   * 清空错误
   */
  clearErrors(): void {
    this.errors = [];
  }
  
  /**
   * 检查是否有严重错误
   * @returns 是否有严重错误
   */
  hasErrors(): boolean {
    return this.errors.some(e => e.severity === 'error');
  }
  
  /**
   * 生成处理报告
   * @param result NLP 处理结果
   * @returns 处理报告
   */
  generateReport(result: NlpResult): {
    sectionCount: number;
    indicatorCount: number;
    entityCount: number;
    relationshipCount: number;
    confidence: number;
    errorCount: number;
    warningCount: number;
    summary: string;
  } {
    const errorCount = this.errors.filter(e => e.severity === 'error').length;
    const warningCount = this.errors.filter(e => e.severity === 'warning').length;
    
    return {
      sectionCount: result.sectionMap.size,
      indicatorCount: result.indicators.length,
      entityCount: result.entities.length,
      relationshipCount: result.relationships.length,
      confidence: result.confidence,
      errorCount,
      warningCount,
      summary: `处理完成：识别 ${result.sectionMap.size} 个段落，提取 ${result.indicators.length} 个指标，${result.entities.length} 个实体，置信度 ${(result.confidence * 100).toFixed(2)}%`,
    };
  }
}

// 导出单例
export const nlpPipeline = new NlpPipeline();
