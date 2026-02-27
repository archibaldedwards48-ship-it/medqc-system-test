# NLP 算法工程师技术交接文档

> 项目：病例质控知识库与规则归纳系统（MedQC）  
> 文档版本：v1.0 | 日期：2026-02-27  
> GitHub：https://github.com/archibaldedwards48-ship-it/medqc-system-test

---

## 一、快速上手

### 1.1 环境搭建

```bash
# 1. 克隆代码
git clone https://github.com/archibaldedwards48-ship-it/medqc-system-test.git
cd medqc-system-test

# 2. 安装依赖
pnpm install

# 3. 配置环境变量（向项目负责人获取 .env 文件）
cp .env.example .env

# 4. 推送数据库 Schema
pnpm db:push

# 5. 运行测试，确认基线（应全部通过）
pnpm test

# 6. 启动开发服务器
pnpm dev
```

### 1.2 你需要重点阅读的文件（按优先级）

```
server/types/nlp.types.ts          ← NLP 所有类型定义，先读这个
server/types/qc.types.ts           ← 质控引擎类型定义
server/services/nlp/pipeline.ts    ← NLP 5 阶段 Pipeline 主入口
server/services/nlp/paragraphIndexer.ts   ← Stage 1: 段落识别
server/services/nlp/metricExtractor.ts    ← Stage 3: 指标/实体提取
server/services/nlp/semanticBreaker.ts    ← Stage 2: 语义断路器
server/services/nlp/zeroAnchorProcessor.ts ← Stage 4: 零锚点处理
server/services/nlp/medicalValidator.ts   ← Stage 5: 医学校验
server/services/qc/qcEngine.ts     ← 质控引擎编排器（调用所有检查器）
server/services/qc/checkers/       ← 7 个质控检查器（你需要新增 3 个）
server/routers/nlpRouter.ts        ← NLP 相关 tRPC 接口
drizzle/schema.ts                  ← 数据库表结构
```

---

## 二、现有 NLP 架构详解

### 2.1 Pipeline 5 阶段

```
病历文本输入
    │
    ▼
Stage 1: ParagraphIndexer（段落索引）
    ├── 识别：主诉/现病史/既往史/家族史/体格检查/诊断/计划等 18 种段落
    ├── 方法：关键词匹配（"主诉"/"现病史"/"既往史" 等）
    └── 输出：Map<SectionName, {content, startIndex, endIndex}>
    │
    ▼
Stage 2: SemanticCircuitBreaker（语义断路器）
    ├── 识别段落之间的逻辑断点
    └── 输出：精化后的 sectionMap + breakpoints[]
    │
    ▼
Stage 3: MetricExtractor（指标/实体提取）
    ├── 提取生命体征（血压/心率/体温/呼吸/血氧/血糖）—— 正则匹配
    ├── 提取实验室结果（血红蛋白/白细胞等）—— 关键词匹配
    ├── 提取实体（药品/诊断/症状/手术/体征）—— 关键词列表匹配
    └── 输出：Indicator[] + Entity[]
    │
    ▼
Stage 4: ZeroAnchorProcessor（零锚点处理）
    ├── 对没有参考值的指标进行归一化
    └── 输出：normalizedIndicators[]
    │
    ▼
Stage 5: MedicalValidator（医学校验）
    ├── 验证提取结果是否符合医学常识
    └── 输出：validationErrors[] + 置信度
    │
    ▼
NlpResult { sectionMap, indicators, entities, relationships, confidence }
```

### 2.2 当前 NLP 能力边界（你需要了解的短板）

| 能力 | 当前状态 | 问题 |
|------|---------|------|
| 段落识别 | ✅ 基本可用 | 仅靠关键词匹配，遇到无标题段落会失败 |
| 症状实体识别 | ⚠️ 极弱 | `ENTITY_KEYWORDS.symptom` 只有 6 个词（疼痛/发热/咳嗽/头晕/乏力/症状），**这是你的第一个任务** |
| 诊断实体识别 | ⚠️ 极弱 | 只有 6 个词，无 ICD-10 编码支撑 |
| 药品实体识别 | ⚠️ 弱 | 只有 7 个词，无完整药品库支撑 |
| 指标提取 | ✅ 较好 | 正则匹配生命体征，覆盖主要指标 |
| 前后矛盾检测 | ❌ 无 | 需要新建 CrossDocumentChecker |
| 病历查重 | ❌ 无 | 需要新建 DuplicateChecker |
| 书面内涵规则检查 | ❌ 无 | 需要新建 ContentRuleChecker |

### 2.3 质控引擎现有 7 个检查器

```
completeness.ts     完整性检查（段落是否齐全）
timeliness.ts       时效性检查（病历是否及时书写）
consistency.ts      一致性检查（字段是否一致）
formatting.ts       格式规范检查
logic.ts            逻辑性检查（性别/年龄矛盾等）
diagnosis.ts        诊断合理性检查
medicationSafety.ts 用药安全检查（禁忌症/相互作用）
```

每个检查器实现 `IQcChecker` 接口：

```typescript
interface IQcChecker {
  name: string;
  check(
    record: MedicalRecord,
    nlpResult: NlpResult,
    rules: QcRule[]
  ): Promise<QcIssue[]>;
}
```

---

## 三、你的任务清单（按优先级）

---

### 任务 P0-A：扩充症状体征实体识别库

**背景**：当前 `metricExtractor.ts` 中的 `ENTITY_KEYWORDS.symptom` 只有 6 个词，导致主诉/现病史中的症状实体几乎无法识别，是所有内涵质控规则的基础瓶颈。

**任务目标**：将症状实体词表从 6 条扩充至 200+ 条，并接入数据库（D7 症状体征术语库）。

**实现方案**：

```typescript
// 文件：server/services/nlp/metricExtractor.ts

// 当前（需要替换）：
const ENTITY_KEYWORDS = {
  symptom: ['疼痛', '发热', '咳嗽', '头晕', '乏力', '症状'],
  // ...
};

// 目标：从数据库 D7 动态加载
// 1. 在 server/db.ts 中新增函数：
export async function getSymptomTerms(): Promise<string[]>

// 2. 在 MetricExtractor 初始化时加载：
class MetricExtractor {
  private symptomTerms: string[] = [];
  
  async initialize() {
    this.symptomTerms = await getSymptomTerms();
  }
  
  private extractEntities(content: string): Entity[] {
    // 用 symptomTerms 替换硬编码列表
    for (const term of this.symptomTerms) {
      if (content.includes(term)) {
        entities.push({
          text: term,
          type: 'symptom',
          startIndex: content.indexOf(term),
          endIndex: content.indexOf(term) + term.length,
          confidence: 0.85,
        });
      }
    }
  }
}
```

**D7 数据库表设计**（在 `drizzle/schema.ts` 中新增）：

```typescript
export const symptomTerms = mysqlTable('symptom_terms', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),          // 症状名称，如"胸痛"
  aliases: text('aliases'),                                    // 别名，JSON 数组，如["心前区痛","胸部疼痛"]
  bodyPart: varchar('body_part', { length: 50 }),             // 部位，如"胸部"
  nature: varchar('nature', { length: 100 }),                 // 性质，如"压榨性/刺痛/钝痛"
  durationRequired: boolean('duration_required').default(true), // 主诉中是否必须写持续时间
  associatedSymptoms: text('associated_symptoms'),             // 常见伴随症状，JSON 数组
  relatedDiseases: text('related_diseases'),                   // 关联疾病，JSON 数组
  category: varchar('category', { length: 50 }),              // 分类：呼吸/循环/消化/神经等
  createdAt: timestamp('created_at').defaultNow(),
});
```

**数据专家 B 会提供 D7 数据文件（JSON 格式），你负责写入数据库和接入 NLP。**

---

### 任务 P0-B：新增 ContentRuleChecker（书面内涵规则检查器）

**背景**：这是本次升级最核心的检查器，用于检查病历各章节的实质内容是否符合书写规范（对标竞品 112 类内涵规则）。

**任务目标**：新建 `server/services/qc/checkers/contentRule.ts`，从数据库 D10 加载规则，对病历各章节进行内涵性检查。

**D10 数据库表设计**（在 `drizzle/schema.ts` 中新增）：

```typescript
export const contentRules = mysqlTable('content_rules', {
  id: int('id').autoincrement().primaryKey(),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  // 文书类型：admission_record(入院记录) | discharge_record(出院记录) |
  //           first_progress_note(首次病程) | daily_progress_note(日常病程) |
  //           operation_record(手术记录) | critical_value_record(危急值记录)
  
  section: varchar('section', { length: 50 }).notNull(),
  // 对应 NLP 段落名：chief_complaint | present_illness | past_history 等
  
  checkType: varchar('check_type', { length: 50 }).notNull(),
  // 检查类型：required_field(必填字段) | forbidden_content(禁止内容) |
  //           format_check(格式检查) | cross_reference(交叉引用)
  
  condition: text('condition').notNull(),
  // 检查条件（JSON），示例：
  // {"type": "must_contain_entity", "entityType": "symptom", "minCount": 1}
  // {"type": "must_contain_duration", "section": "chief_complaint"}
  // {"type": "must_not_be_generic", "genericPhrases": ["向上级汇报", "密切观察"]}
  
  errorMessage: varchar('error_message', { length: 200 }).notNull(),
  // 错误提示，如"主诉缺少持续时间描述"
  
  severity: varchar('severity', { length: 20 }).default('major'),
  // critical | major | minor
  
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**检查器实现框架**：

```typescript
// 文件：server/services/qc/checkers/contentRule.ts

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
    const contentRules = await getContentRules(record.type);
    
    for (const rule of contentRules) {
      // 2. 获取对应段落的 NLP 结果
      const sectionContent = nlpResult.sectionMap.get(rule.section);
      
      // 3. 根据 checkType 执行不同的检查逻辑
      const issue = await this.applyRule(rule, sectionContent, nlpResult, record);
      if (issue) issues.push(issue);
    }
    
    return issues;
  }

  private async applyRule(rule, sectionContent, nlpResult, record): Promise<QcIssue | null> {
    const condition = JSON.parse(rule.condition);
    
    switch (condition.type) {
      case 'must_contain_entity':
        // 检查段落中是否包含指定类型的实体
        // 例：主诉必须包含症状实体
        return this.checkMustContainEntity(rule, sectionContent, nlpResult, condition);
      
      case 'must_contain_duration':
        // 检查主诉是否包含时间描述（X天/X月/X年）
        return this.checkMustContainDuration(rule, sectionContent);
      
      case 'must_not_be_generic':
        // 检查是否使用了套话（"向上级汇报"/"密切观察"等）
        return this.checkMustNotBeGeneric(rule, sectionContent, condition);
      
      case 'must_contain_section':
        // 检查必须存在的子章节（如既往史必须含手术史/输血史/过敏史）
        return this.checkMustContainSection(rule, sectionContent, condition);
      
      default:
        return null;
    }
  }
  
  // 具体检查方法由你实现...
}

export const contentRuleChecker = new ContentRuleChecker();
```

**然后在 `qcEngine.ts` 中注册**：

```typescript
import { contentRuleChecker } from './checkers/contentRule';

private checkers = [
  completenessChecker,
  timelinessChecker,
  consistencyChecker,
  formattingChecker,
  logicChecker,
  diagnosisChecker,
  medicationSafetyChecker,
  contentRuleChecker,  // ← 新增
];
```

---

### 任务 P0-C：新增 CrossDocumentChecker（前后矛盾检测器）

**背景**：病历中同一信息在多处文书中重复出现（如过敏史在病案首页和入院记录中都有），两处描述不一致是高频质控问题。

**任务目标**：新建 `server/services/qc/checkers/crossDocument.ts`，检测跨文书的前后矛盾。

**需要检测的矛盾类型**（数据专家 A 会提供完整规则，以下为核心 4 类）：

```typescript
// 矛盾类型 1：过敏史不一致
// 病案首页.过敏药物 vs 入院记录.既往史.过敏情况
// 检查方法：提取两处的过敏实体，比较是否一致

// 矛盾类型 2：手术史不一致
// 入院记录.既往史.手术史 vs 手术记录的存在性
// 检查方法：若既往史写"无手术史"但存在手术记录，则矛盾

// 矛盾类型 3：离院方式不一致
// 病案首页.离院方式（枚举值）vs 出院记录.出院情况描述
// 检查方法：提取出院记录中的离院方式描述，与首页枚举值比对

// 矛盾类型 4：入院诊断 vs 出院诊断
// 若出院诊断与入院诊断完全不同且无说明，提示矛盾
```

**实现框架**：

```typescript
// 文件：server/services/qc/checkers/crossDocument.ts

export class CrossDocumentChecker implements IQcChecker {
  name = 'cross_document';

  async check(
    record: MedicalRecord,
    nlpResult: NlpResult,
    rules: QcRule[]
  ): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 注意：record.content 是主文书内容
    // record.metadata 中可能含有其他文书引用（需要与后端工程师确认数据结构）
    
    // 检查过敏史一致性
    const allergyIssue = this.checkAllergyConsistency(record, nlpResult);
    if (allergyIssue) issues.push(allergyIssue);
    
    // 检查手术史一致性
    const surgeryIssue = this.checkSurgeryConsistency(record, nlpResult);
    if (surgeryIssue) issues.push(surgeryIssue);
    
    return issues;
  }
}
```

> **注意**：CrossDocumentChecker 需要访问同一患者的多份文书，需要与后端工程师协商 `MedicalRecord` 数据结构是否携带关联文书，或通过数据库查询获取。

---

### 任务 P1-A：新增 DuplicateChecker（病历查重）

**背景**：查房记录复制粘贴是高频质控问题，竞品将此列为 6 条规则。

**任务目标**：新建 `server/services/qc/checkers/duplicate.ts`，检测相邻查房记录的文本相似度。

**算法选择**：

```typescript
// 推荐使用 Jaccard 相似度（简单高效，适合中文短文本）
function jaccardSimilarity(text1: string, text2: string): number {
  const set1 = new Set(text1.split(''));  // 字符级 n-gram
  const set2 = new Set(text2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// 或使用 2-gram 提高精度
function bigramSimilarity(text1: string, text2: string): number {
  const bigrams1 = new Set(getBigrams(text1));
  const bigrams2 = new Set(getBigrams(text2));
  // ...
}

function getBigrams(text: string): string[] {
  const bigrams = [];
  for (let i = 0; i < text.length - 1; i++) {
    bigrams.push(text.slice(i, i + 2));
  }
  return bigrams;
}
```

**实现框架**：

```typescript
// 文件：server/services/qc/checkers/duplicate.ts

const DEFAULT_SIMILARITY_THRESHOLD = 0.95; // 95% 相似度触发警告

export class DuplicateChecker implements IQcChecker {
  name = 'duplicate';
  
  async check(record, nlpResult, rules): Promise<QcIssue[]> {
    const issues: QcIssue[] = [];
    
    // 从规则库获取相似度阈值（可配置）
    const threshold = this.getThresholdFromRules(rules) || DEFAULT_SIMILARITY_THRESHOLD;
    
    // 获取该患者的所有查房记录（需要数据库查询）
    // 按日期排序，检查相邻记录的相似度
    const progressNotes = await this.getProgressNotes(record.patientId);
    
    for (let i = 1; i < progressNotes.length; i++) {
      const similarity = bigramSimilarity(
        progressNotes[i-1].content,
        progressNotes[i].content
      );
      
      if (similarity >= threshold) {
        issues.push({
          type: 'duplicate',
          severity: 'major',
          message: `${progressNotes[i].date} 的查房记录与前一日相似度达 ${(similarity * 100).toFixed(1)}%，疑似复制粘贴`,
          suggestion: '请检查并修改查房记录，确保内容反映当日实际病情变化',
          location: `查房记录 - ${progressNotes[i].date}`,
        });
      }
    }
    
    return issues;
  }
}
```

---

### 任务 P1-B：提升段落识别准确率

**背景**：`paragraphIndexer.ts` 当前仅靠关键词匹配，遇到以下情况会失败：
- 段落标题后直接跟内容（无换行）
- 使用数字编号（"1. 主诉"）
- 使用全角冒号（"主诉："）

**任务目标**：增强段落识别的正则表达式，提升识别率至 90%+。

**改进方向**：

```typescript
// 当前（仅关键词匹配）：
const SECTION_KEYWORDS = {
  chief_complaint: ['主诉', '主要症状'],
  // ...
};

// 改进（正则 + 关键词 + 位置权重）：
const SECTION_PATTERNS: Record<MedicalRecordSection, RegExp[]> = {
  chief_complaint: [
    /^主诉[：:]\s*/m,
    /^【主诉】/m,
    /^\d+[\.、]\s*主诉/m,
    /^一[、.]\s*主诉/m,
  ],
  present_illness: [
    /^现病史[：:]\s*/m,
    /^【现病史】/m,
    /^\d+[\.、]\s*现病史/m,
  ],
  // ...
};
```

---

## 四、数据库操作规范

### 4.1 新增 db.ts 函数模板

所有数据库查询函数写在 `server/db.ts` 中：

```typescript
// 示例：获取症状术语列表
export async function getSymptomTerms(): Promise<string[]> {
  const terms = await db
    .select({ name: symptomTerms.name })
    .from(symptomTerms)
    .where(eq(symptomTerms.isActive, true));
  return terms.map(t => t.name);
}

// 示例：获取内涵规则
export async function getContentRules(documentType: string) {
  return await db
    .select()
    .from(contentRules)
    .where(
      and(
        eq(contentRules.documentType, documentType),
        eq(contentRules.isActive, true)
      )
    );
}
```

### 4.2 数据库迁移

修改 `drizzle/schema.ts` 后必须执行：

```bash
pnpm db:push
```

---

## 五、测试规范

### 5.1 每个新检查器必须有对应测试

参考 `server/routers.test.ts` 的测试模式，在 `server/services.test.ts` 中新增：

```typescript
describe('ContentRuleChecker', () => {
  it('应检测出主诉缺少持续时间', async () => {
    const record = createTestRecord({
      type: 'admission',
      content: '主诉：发热\n现病史：患者发热，体温38.5℃',
    });
    const nlpResult = await nlpPipeline.process(record.content);
    const issues = await contentRuleChecker.check(record, nlpResult, []);
    
    expect(issues.some(i => i.message.includes('持续时间'))).toBe(true);
  });

  it('应通过包含完整时间描述的主诉', async () => {
    const record = createTestRecord({
      type: 'admission',
      content: '主诉：发热3天\n现病史：患者3天前出现发热',
    });
    const nlpResult = await nlpPipeline.process(record.content);
    const issues = await contentRuleChecker.check(record, nlpResult, []);
    
    const durationIssues = issues.filter(i => i.message.includes('持续时间'));
    expect(durationIssues.length).toBe(0);
  });
});
```

### 5.2 运行测试

```bash
pnpm test                    # 运行所有测试
pnpm test --coverage         # 生成覆盖率报告（目标 85%+）
pnpm test server/services    # 只运行服务层测试
```

---

## 六、与团队协作说明

| 协作对象 | 协作内容 | 沟通方式 |
|---------|---------|---------|
| **数据专家 B** | D7 症状体征术语库数据（JSON 文件），你负责接入数据库和 NLP | 他提供数据文件，你写入脚本 |
| **数据专家 A** | D10 内涵规则库数据（JSON 文件），你负责实现规则执行逻辑 | 他定义规则条件格式，你实现 `applyRule` |
| **后端工程师** | CrossDocumentChecker 需要多文书数据，与他确认 `MedicalRecord` 数据结构 | 确认 `record.relatedDocuments` 字段设计 |
| **测试工程师** | 为你的新检查器提供标准测试病历（正例/反例各 5 份） | 他提供测试数据，你验证准确率 |

---

## 七、里程碑与交付节点

| 时间 | 交付物 | 验收标准 |
|------|--------|---------|
| **Week 1 末** | D7 症状库接入 NLP（150 条），段落识别准确率提升 | 测试集症状识别准确率 ≥ 80% |
| **Week 2 末** | ContentRuleChecker 上线（入院记录 29 类规则） | 测试病历跑通，新增测试用例全部通过 |
| **Week 3 末** | CrossDocumentChecker 上线（4 类矛盾检测） | 矛盾检测准确率 ≥ 85% |
| **Week 4 末** | DuplicateChecker 上线（查重功能） | 查重准确率 ≥ 90%（测试集验证） |

---

## 八、常见问题

**Q：NLP Pipeline 的置信度是怎么计算的？**  
A：各阶段置信度相乘，最终结果 = Stage1 × Stage2 × Stage3 × Stage4 × Stage5。每个阶段内部根据识别到的实体数量和规则命中率计算局部置信度。

**Q：如何在不破坏现有测试的情况下修改 metricExtractor.ts？**  
A：先运行 `pnpm test` 确认基线，修改后再运行确认。如果需要异步初始化（从数据库加载词表），注意在 `pipeline.ts` 中相应调整初始化顺序。

**Q：D7/D10 数据还没到，我先做什么？**  
A：先用硬编码的小数据集（20-30 条）实现完整的检查器框架和测试用例，数据到位后直接替换数据源即可。

**Q：遇到技术问题找谁？**  
A：直接找项目 AI 助手（即本文档的出处），描述问题和当前代码，可以获得具体的代码级指导。
