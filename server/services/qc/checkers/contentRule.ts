import { IQcChecker, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';
import { getContentRules } from '../../../db';

export class ContentRuleChecker implements IQcChecker {
  name = 'content_rule';

  async check(
    record: MedicalRecord,
    nlpResult: NlpResult,
    rules: QcRule[]
  ): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 1. 从数据库加载对应文书类型的内涵规则
    const contentRules = await getContentRules(record.recordType);
    
    for (const rule of contentRules) {
      // 2. 获取对应段落的 NLP 结果
      const sectionContent = nlpResult.sectionMap.get(rule.section);
      
      // 3. 根据 checkType 执行不同的检查逻辑
      const issue = await this.applyRule(rule, sectionContent, nlpResult, record);
      if (issue) issues.push(issue);
    }
    
    return issues;
  }

  private async applyRule(rule: any, sectionContent: any, nlpResult: NlpResult, record: MedicalRecord): Promise<QcIssue | null> {
    if (!sectionContent && rule.checkType !== 'required_field') {
        return null;
    }

    const condition = JSON.parse(rule.condition);
    
    switch (condition.type) {
      case 'must_contain_entity':
        return this.checkMustContainEntity(rule, sectionContent, nlpResult, condition);
      
      case 'must_contain_duration':
        return this.checkMustContainDuration(rule, sectionContent);
      
      case 'must_not_be_generic':
        return this.checkMustNotBeGeneric(rule, sectionContent, condition);
      
      default:
        return null;
    }
  }

  private checkMustContainEntity(rule: any, sectionContent: any, nlpResult: NlpResult, condition: any): QcIssue | null {
    const entities = nlpResult.entities.filter(e => 
        e.type === condition.entityType && 
        e.startIndex >= sectionContent.startIndex && 
        e.endIndex <= sectionContent.endIndex
    );

    if (entities.length < (condition.minCount || 1)) {
        return {
            type: this.name,
            severity: rule.severity as any,
            message: rule.errorMessage,
            suggestion: `请在${rule.section}中补充相关的${condition.entityType}描述`,
            ruleId: `CONTENT_${rule.id}`
        };
    }
    return null;
  }

  private checkMustContainDuration(rule: any, sectionContent: any): QcIssue | null {
    const durationRegex = /(\d+|半|[一二三四五六七八九十百]+)(秒|分钟|小时|天|周|月|年|余?日)/;
    if (!durationRegex.test(sectionContent.content)) {
        return {
            type: this.name,
            severity: rule.severity as any,
            message: rule.errorMessage,
            suggestion: "请补充症状持续的时间描述，如'3天'、'1周'等",
            ruleId: `CONTENT_${rule.id}`
        };
    }
    return null;
  }

  private checkMustNotBeGeneric(rule: any, sectionContent: any, condition: any): QcIssue | null {
    for (const phrase of condition.genericPhrases || []) {
        if (sectionContent.content.includes(phrase)) {
            return {
                type: this.name,
                severity: rule.severity as any,
                message: rule.errorMessage,
                suggestion: `请避免使用'${phrase}'等空洞描述，应详细记录具体的诊疗行为`,
                ruleId: `CONTENT_${rule.id}`
            };
        }
    }
    return null;
  }
}

export const contentRuleChecker = new ContentRuleChecker();
