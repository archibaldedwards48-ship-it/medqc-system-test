/**
 * Phase 2 Integration Tests
 * Tests for NLP Pipeline and QC Engine services
 */
import { describe, it, expect } from "vitest";

// ============ NLP Pipeline Tests ============

describe("NLP Pipeline - Module Imports", () => {
  it("should import NlpPipeline class", async () => {
    const { NlpPipeline } = await import("./services/nlp/pipeline");
    expect(NlpPipeline).toBeDefined();
    expect(typeof NlpPipeline).toBe("function");
  });

  it("should import nlpPipeline singleton", async () => {
    const { nlpPipeline } = await import("./services/nlp/pipeline");
    expect(nlpPipeline).toBeDefined();
    expect(typeof nlpPipeline.process).toBe("function");
    expect(typeof nlpPipeline.getErrors).toBe("function");
    expect(typeof nlpPipeline.clearErrors).toBe("function");
    expect(typeof nlpPipeline.hasErrors).toBe("function");
    expect(typeof nlpPipeline.generateReport).toBe("function");
  });

  it("should import paragraphIndexer", async () => {
    const { paragraphIndexer } = await import("./services/nlp/paragraphIndexer");
    expect(paragraphIndexer).toBeDefined();
    expect(typeof paragraphIndexer.index).toBe("function");
  });

  it("should import semanticCircuitBreaker", async () => {
    const { semanticCircuitBreaker } = await import("./services/nlp/semanticBreaker");
    expect(semanticCircuitBreaker).toBeDefined();
    expect(typeof semanticCircuitBreaker.analyze).toBe("function");
  });

  it("should import metricExtractor", async () => {
    const { metricExtractor } = await import("./services/nlp/metricExtractor");
    expect(metricExtractor).toBeDefined();
    expect(typeof metricExtractor.extract).toBe("function");
  });

  it("should import zeroAnchorProcessor", async () => {
    const { zeroAnchorProcessor } = await import("./services/nlp/zeroAnchorProcessor");
    expect(zeroAnchorProcessor).toBeDefined();
    expect(typeof zeroAnchorProcessor.process).toBe("function");
  });

  it("should import medicalValidator", async () => {
    const { medicalValidator } = await import("./services/nlp/medicalValidator");
    expect(medicalValidator).toBeDefined();
    expect(typeof medicalValidator.validate).toBe("function");
    expect(typeof medicalValidator.generateReport).toBe("function");
  });
});

describe("NLP Pipeline - ParagraphIndexer", () => {
  it("should index a simple medical record", async () => {
    const { paragraphIndexer } = await import("./services/nlp/paragraphIndexer");
    const content = `【主诉】头痛3天
【现病史】患者3天前无明显诱因出现头痛，为持续性胀痛。
【既往史】高血压病史5年，规律服用降压药。
【体格检查】T: 36.5℃，P: 80次/分，BP: 140/90mmHg`;

    const result = await paragraphIndexer.index(content);
    expect(result).toBeDefined();
    expect(result.sections).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("should handle empty content", async () => {
    const { paragraphIndexer } = await import("./services/nlp/paragraphIndexer");
    const result = await paragraphIndexer.index("");
    expect(result).toBeDefined();
    expect(result.sections).toBeDefined();
  });
});

describe("NLP Pipeline - MetricExtractor", () => {
  it("should extract indicators from medical text", async () => {
    const { metricExtractor } = await import("./services/nlp/metricExtractor");
    const content = `体温 36.5℃，心率 80次/分，血压 120/80mmHg，血糖 5.6mmol/L`;

    const result = await metricExtractor.extract(content);
    expect(result).toBeDefined();
    expect(result.indicators).toBeDefined();
    expect(Array.isArray(result.indicators)).toBe(true);
    expect(result.entities).toBeDefined();
    expect(Array.isArray(result.entities)).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("should handle text with no indicators", async () => {
    const { metricExtractor } = await import("./services/nlp/metricExtractor");
    const result = await metricExtractor.extract("患者一般情况可，精神好。");
    expect(result).toBeDefined();
    expect(result.indicators).toBeDefined();
  });
});

describe("NLP Pipeline - MedicalValidator", () => {
  it("should validate indicators", async () => {
    const { medicalValidator } = await import("./services/nlp/medicalValidator");
    const indicators = [
      { name: "体温", value: "36.5", unit: "℃", isAbnormal: false },
      { name: "心率", value: "80", unit: "bpm", isAbnormal: false },
    ];

    const result = await medicalValidator.validate(indicators);
    expect(result).toBeDefined();
    expect(result.indicators).toHaveLength(2);
    expect(result.totalIndicators).toBe(2);
    expect(result.validationErrors).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("should detect out-of-range values", async () => {
    const { medicalValidator } = await import("./services/nlp/medicalValidator");
    const indicators = [
      { name: "体温", value: "50", unit: "℃", isAbnormal: true },
    ];

    const result = await medicalValidator.validate(indicators);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it("should generate a report", async () => {
    const { medicalValidator } = await import("./services/nlp/medicalValidator");
    const validationResult = {
      indicators: [{ name: "体温", value: "36.5", unit: "℃", isAbnormal: false }],
      totalIndicators: 1,
      validationErrors: [],
      confidence: 1,
    };

    const report = medicalValidator.generateReport(validationResult);
    expect(report.totalIndicators).toBe(1);
    expect(report.errorCount).toBe(0);
    expect(report.summary).toContain("1 个指标");
  });
});

// ============ QC Engine Tests ============

describe("QC Engine - Module Imports", () => {
  it("should import QcEngineService class", async () => {
    const { QcEngineService } = await import("./services/qc/qcEngine");
    expect(QcEngineService).toBeDefined();
    expect(typeof QcEngineService).toBe("function");
  });

  it("should import qcEngine singleton", async () => {
    const { qcEngine } = await import("./services/qc/qcEngine");
    expect(qcEngine).toBeDefined();
    expect(typeof qcEngine.runQc).toBe("function");
    expect(typeof qcEngine.generateReport).toBe("function");
    expect(typeof qcEngine.getStatistics).toBe("function");
  });
});

describe("QC Engine - Checker Imports", () => {
  it("should import completenessChecker", async () => {
    const { completenessChecker } = await import("./services/qc/checkers/completeness");
    expect(completenessChecker).toBeDefined();
    expect(completenessChecker.name).toBe("completeness");
    expect(typeof completenessChecker.check).toBe("function");
  });

  it("should import timelinessChecker", async () => {
    const { timelinessChecker } = await import("./services/qc/checkers/timeliness");
    expect(timelinessChecker).toBeDefined();
    expect(timelinessChecker.name).toBe("timeliness");
    expect(typeof timelinessChecker.check).toBe("function");
  });

  it("should import consistencyChecker", async () => {
    const { consistencyChecker } = await import("./services/qc/checkers/consistency");
    expect(consistencyChecker).toBeDefined();
    expect(consistencyChecker.name).toBe("consistency");
    expect(typeof consistencyChecker.check).toBe("function");
  });

  it("should import formattingChecker", async () => {
    const { formattingChecker } = await import("./services/qc/checkers/formatting");
    expect(formattingChecker).toBeDefined();
    expect(formattingChecker.name).toBe("formatting");
    expect(typeof formattingChecker.check).toBe("function");
  });

  it("should import logicChecker", async () => {
    const { logicChecker } = await import("./services/qc/checkers/logic");
    expect(logicChecker).toBeDefined();
    expect(logicChecker.name).toBe("logic");
    expect(typeof logicChecker.check).toBe("function");
  });

  it("should import diagnosisChecker", async () => {
    const { diagnosisChecker } = await import("./services/qc/checkers/diagnosis");
    expect(diagnosisChecker).toBeDefined();
    expect(diagnosisChecker.name).toBe("diagnosis");
    expect(typeof diagnosisChecker.check).toBe("function");
  });

  it("should import medicationSafetyChecker", async () => {
    const { medicationSafetyChecker } = await import("./services/qc/checkers/medicationSafety");
    expect(medicationSafetyChecker).toBeDefined();
    expect(medicationSafetyChecker.name).toBe("medicationSafety");
    expect(typeof medicationSafetyChecker.check).toBe("function");
  });
});

describe("QC Engine - Report Generation", () => {
  it("should generate a report from QC result", async () => {
    const { qcEngine } = await import("./services/qc/qcEngine");
    const mockResult = {
      recordId: 1,
      totalScore: 85,
      overallScore: 85,
      status: "pass_with_warning" as const,
      scores: { completeness: 90, formatting: 80 },
      issues: [
        {
          type: "completeness" as const,
          severity: "minor" as const,
          message: "缺少过敏史",
        },
        {
          type: "formatting" as const,
          severity: "major" as const,
          message: "日期格式不规范",
        },
      ],
      timestamp: new Date(),
    };

    const report = qcEngine.generateReport(mockResult);
    expect(report).toBeDefined();
    expect(report.summary).toContain("2 个问题");
    expect(report.summary).toContain("85");
    expect(report.issuesByType).toBeDefined();
    expect(report.issuesBySeverity).toBeDefined();
    expect(report.scoreBreakdown).toBeDefined();
    expect(report.recommendations).toBeDefined();
  });

  it("should generate statistics from QC result", async () => {
    const { qcEngine } = await import("./services/qc/qcEngine");
    const mockResult = {
      recordId: 1,
      totalScore: 75,
      overallScore: 75,
      status: "fail" as const,
      scores: {},
      issues: [
        { type: "completeness" as const, severity: "critical" as const, message: "主诉缺失" },
        { type: "logic" as const, severity: "major" as const, message: "逻辑矛盾" },
        { type: "formatting" as const, severity: "minor" as const, message: "格式问题" },
      ],
      timestamp: new Date(),
    };

    const stats = qcEngine.getStatistics(mockResult);
    expect(stats.totalIssues).toBe(3);
    expect(stats.criticalIssues).toBe(1);
    expect(stats.majorIssues).toBe(1);
    expect(stats.minorIssues).toBe(1);
    expect(stats.averageScore).toBe(75);
    expect(stats.passRate).toBe(0);
  });
});

// ============ Type System Tests ============

describe("Type System - NLP Types", () => {
  it("should export all required NLP types", async () => {
    const nlpTypes = await import("./types/nlp.types");
    // Verify type exports exist (they're types so we check the module loaded)
    expect(nlpTypes).toBeDefined();
  });
});

describe("Type System - QC Types", () => {
  it("should export all required QC types", async () => {
    const qcTypes = await import("./types/qc.types");
    expect(qcTypes).toBeDefined();
  });
});

describe("Type System - Rule Types", () => {
  it("should export all required Rule types", async () => {
    const ruleTypes = await import("./types/rule.types");
    expect(ruleTypes).toBeDefined();
  });
});
