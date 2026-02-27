# 架构审查报告

## 系统规模

| 模块 | 数量 |
|------|------|
| 数据库表 | 15 |
| 后端路由文件 | 12 (1984 行) |
| DB 函数 | 78 (693 行) |
| QC Checkers | 10 (2130 行) |
| NLP 服务模块 | 7 |
| 前端页面 | 19 |
| 测试 | 131 个通过 |
| D10 内涵规则 | 35 条 |
| D7 症状术语 | 50 条 |

## 架构优势

1. **Checker 插件化**：10 个 checker 都实现 IQcChecker 接口，QcEngine 通过数组注册，新增 checker 零侵入
2. **NLP Pipeline 分阶段**：5 个 stage（indexing → semantic_breaker → metric_extraction → zero_anchor → validation），可选择性执行
3. **类型系统完整**：qc.types.ts 和 nlp.types.ts 定义了完整的领域模型
4. **质控模式分级**：fast/standard/comprehensive/ai 四种模式，按需启用不同 checker

## 架构问题

### P0 - 评分体系过于简单
- 当前：每个 checker 独立评分，总分 = 所有 checker 平均分
- 问题：completeness（完整性）和 medication_safety（用药安全）权重相同，不合理
- 影响：用药安全扣 20 分和格式问题扣 20 分被等价对待

### P1 - 质控模式定义与实际执行脱节
- qc.types.ts 定义了 FastQcConfig（只跑 completeness + formatting）
- 但 qcEngine.runQc 默认跑所有 10 个 checker，模式配置未生效
- 前端 QcExecution 有模式选择（auto/manual/ai），但后端未区分

### P2 - D7 术语库未集成到任何 checker
- 50 条症状术语已入库，但没有 checker 使用它
- NLP Pipeline 的 symptomExtraction 模块未使用 D7 数据

### P3 - 反馈闭环未闭合
- feedback 路由已有，但反馈数据未回流到规则优化
- 假阳性标记后，下次质控同一规则仍会触发

### P4 - db.ts 过于臃肿
- 78 个函数，693 行，所有表的 CRUD 混在一个文件
- 应按领域拆分：db/records.ts, db/qc.ts, db/feedback.ts

### P5 - 缺少批量质控能力
- 当前只能单条执行质控
- 医院场景需要"一键质控全部未检病历"

## 优化建议（按优先级）

### 立即执行
1. **加权评分体系**：给 checker 分配权重（medication_safety: 0.2, completeness: 0.15, ...）
2. **质控模式生效**：让 fast/standard/comprehensive 真正控制启用哪些 checker
3. **D7 集成**：SymptomMatcher 集成到 NLP Pipeline，增强症状识别

### 下一阶段
4. **反馈闭环**：假阳性标记后，该规则对该 section 的触发阈值提高
5. **批量质控**：新增 batchExecute 路由
6. **db.ts 拆分**：按领域拆分为多个文件
