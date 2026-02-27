import { IQcChecker, IssueType, MedicalRecord, QcIssue, QcRule } from '../../../types/qc.types';
import { NlpResult } from '../../../types/nlp.types';
import { getSymptomAliases } from '../../../db';

export class CrossDocumentChecker implements IQcChecker {
  name = 'cross_document' as const;

  async check(record: MedicalRecord, nlpResult: NlpResult, rules: QcRule[]): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    const sectionMap = nlpResult.sectionMap;

    // 检查1：症状一致性（主诉 vs 现病史）
    const symptomIssue = await this.checkSymptomConsistency(sectionMap, nlpResult);
    if (symptomIssue) issues.push(symptomIssue);

    // 检查2：既往史逻辑（"无手术史" vs 全文出现"术后"）
    const surgeryIssue = this.checkSurgeryHistoryConsistency(sectionMap, record.content);
    if (surgeryIssue) issues.push(surgeryIssue);

    // 检查3：过敏与用药矛盾（"无过敏史" vs 用药含敏感药物）
    const allergyIssue = this.checkAllergyMedicationConsistency(sectionMap, record.content);
    if (allergyIssue) issues.push(allergyIssue);

    return issues;
  }

  private async checkSymptomConsistency(
    sectionMap: Map<string, any>,
    nlpResult: NlpResult
  ): Promise<QcIssue | null> {
    const chiefComplaint = sectionMap.get('chief_complaint');
    const presentIllness = sectionMap.get('present_illness') ?? sectionMap.get('history_of_present_illness');
    if (!chiefComplaint || !presentIllness) return null;

    // 从 NLP 实体中提取主诉里的症状
    const ccSymptoms = nlpResult.entities.filter(e =>
      e.type === 'symptom' &&
      e.startIndex >= chiefComplaint.startIndex &&
      e.endIndex <= chiefComplaint.endIndex
    );
    if (ccSymptoms.length === 0) return null;

    // 从 D7 库获取每个症状的别名，扩展匹配范围
    const piContent = presentIllness.content ?? '';
    for (const symptom of ccSymptoms) {
      const aliases = await getSymptomAliases(symptom.text);
      const allForms = [symptom.text, ...aliases];
      const foundInPI = allForms.some(form => piContent.includes(form));
      if (!foundInPI) {
        return {
          type: 'cross_document' as IssueType,
          severity: 'major',
          message: `主诉中提及的"${symptom.text}"在现病史中未见相关描述`,
          suggestion: `请在现病史中详细描述"${symptom.text}"的起病时间、诱因、演变过程及伴随症状`,
          ruleId: 'CROSS_SYMPTOM_CONSISTENCY'
        };
      }
    }
    return null;
  }

  private checkSurgeryHistoryConsistency(
    sectionMap: Map<string, any>,
    fullContent: string
  ): QcIssue | null {
    const pastHistory = sectionMap.get('past_medical_history') ?? sectionMap.get('past_history');
    if (!pastHistory) return null;

    const phContent: string = pastHistory.content ?? '';
    const noSurgeryPatterns = ['否认手术史', '无手术史', '无外伤手术史'];
    const hasDeniedSurgery = noSurgeryPatterns.some(p => phContent.includes(p));
    if (!hasDeniedSurgery) return null;

    // 检查全文是否出现手术相关词汇
    const surgeryKeywords = ['术后', '手术切口', '手术瘢痕', '术区', '吻合口', '造瘘口'];
    const foundKeyword = surgeryKeywords.find(kw => fullContent.includes(kw));
    if (foundKeyword) {
      return {
        type: 'cross_document' as IssueType,
        severity: 'major',
        message: `既往史记录"无手术史"，但病历中出现"${foundKeyword}"，存在逻辑矛盾`,
        suggestion: '请核实患者手术史，修正既往史或删除矛盾描述',
        ruleId: 'CROSS_SURGERY_HISTORY'
      };
    }
    return null;
  }

  private checkAllergyMedicationConsistency(
    sectionMap: Map<string, any>,
    fullContent: string
  ): QcIssue | null {
    const pastHistory = sectionMap.get('past_medical_history') ?? sectionMap.get('past_history');
    if (!pastHistory) return null;

    const phContent: string = pastHistory.content ?? '';
    const noAllergyPatterns = ['否认药物过敏', '无过敏史', '无药物过敏史', '过敏史：无'];
    const hasDeniedAllergy = noAllergyPatterns.some(p => phContent.includes(p));
    if (!hasDeniedAllergy) return null;

    // 高风险过敏药物清单（可后续从 D4 药品库动态加载）
    const highRiskDrugs = [
      { name: '青霉素', aliases: ['阿莫西林', '氨苄西林', '哌拉西林', 'PCN'] },
      { name: '头孢类', aliases: ['头孢', 'cef'] },
      { name: '磺胺', aliases: ['复方新诺明', 'SMZ'] },
      { name: '阿司匹林', aliases: ['乙酰水杨酸', 'aspirin'] },
    ];

    for (const drug of highRiskDrugs) {
      const allForms = [drug.name, ...drug.aliases];
      const found = allForms.find(form =>
        fullContent.toLowerCase().includes(form.toLowerCase())
      );
      if (found) {
        return {
          type: 'cross_document' as IssueType,
          severity: 'critical',
          message: `既往史记录"无过敏史"，但病历中出现"${found}"（${drug.name}类），存在用药安全风险`,
          suggestion: '请核实患者过敏史，如确实无过敏，请确认该药物使用的安全性',
          ruleId: 'CROSS_ALLERGY_MEDICATION'
        };
      }
    }
    return null;
  }
}

export const crossDocumentChecker = new CrossDocumentChecker();
