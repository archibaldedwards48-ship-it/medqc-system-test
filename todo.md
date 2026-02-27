# Project TODO

## Phase 1: Data Layer Migration (Backend → Manus Platform)
- [x] Adapt schema.ts from SQLite to MySQL/TiDB (mysqlTable, proper types)
- [x] Merge users table with Manus OAuth fields (openId, loginMethod, lastSignedIn)
- [x] Add 11 new tables (medicalRecords, qcResults, qcIssues, etc.)
- [x] Adapt db.ts with proper getDb() injection pattern
- [x] Convert SQLite API calls to MySQL API (.get→limit(1), .run→execute, etc.)
- [x] Convert Unix timestamp integers to MySQL timestamp type
- [x] Integrate shared/types.ts (merge with existing platform types)
- [x] Add server/types/ directory (nlp.types.ts, qc.types.ts, rule.types.ts)
- [x] Run pnpm db:push to create all tables
- [x] Write vitest tests for db.ts functions
- [x] Save checkpoint (b2d15784)

## Data Deliverables
- [x] D1 QC Rules Library - Accepted
- [x] D2 Clinical Guidelines (178 items) - Accepted
- [x] D3 Lab Test Reference Ranges (114 items) - Accepted
- [x] D4 Medical Terminology Synonyms (500 items v2) - Accepted
- [x] D5 Terminology Mapping Synonyms v2 (614 items) - Accepted
- [x] D6 Clinical Guidelines Full (353 items) - Accepted
- [x] Medication Knowledge Base V3 (19,190 items) - Accepted

## Phase 2: Business Logic Layer
- [x] NLP Pipeline integration (6 files)
- [x] QcEngineService + 7 Checkers integration (8 files)

## Phase 3: Router Layer
- [x] 11 router files integration
- [x] Replace monolithic routers.ts with modular structure
- [x] TypeScript compilation passes (0 errors)
- [x] Write vitest tests - 56 new tests, 109 total passing
- [x] Save checkpoint (b9cf037c)

## Phase 2: Business Logic Layer Integration (Detailed)
- [x] Copy 14 files to server/services/nlp/ and server/services/qc/
- [x] Fix import paths (../../types/, ../../db)
- [x] Fix SQLite→MySQL type mismatches in checkers
- [x] Fix QcResult/MedicalRecord/MedicalValidationResult type gaps
- [x] Fix JSON.parse for json() columns (contraindications, interactions)
- [x] TypeScript compilation passes (0 errors)
- [x] Write vitest tests - 53 tests all passing
- [x] Save Phase 2+3 checkpoint

## Data Enrichment (B tasks)
- [x] B2: D5 lab fullname supplement (614 items) - Accepted
- [x] B3: D1 rules structured (63 rules) - Accepted
- [ ] B1: D3 lab expansion to 200+ - Needs fix (field format mismatch)
- [ ] A1: Data format alignment for DB import (6 datasets) - In progress

---

## Phase 4: Frontend Development ✅

### 4.1 全局框架
- [x] 配置 DashboardLayout 侧边栏菜单（14个业务导航项，3个分组）
- [x] 全局主题配置（医疗蓝色调，Inter字体，index.css 色彩变量）
- [x] 注册所有业务路由（App.tsx，14条路由）
- [x] 登录页/未认证状态处理（DashboardLayout 内置）

### 4.2 首页看板（Dashboard）
- [x] 核心指标卡片（今日质控数、合格率、平均分、待处理数）
- [x] 质控趋势折线图（近30天，Recharts）
- [x] 部门合格率排行榜
- [x] 最近质控记录列表（5条，带状态标签）
- [x] 快捷操作入口（上传病历、执行质控、查看报告）

### 4.3 病历管理页
- [x] 病历列表（分页表格，支持按类型/日期筛选）
- [x] 病历搜索（按患者姓名实时搜索）
- [x] 新建病历表单（Dialog，含必填字段验证）
- [x] 病历详情抽屉（查看内容）
- [x] 病历编辑（医生/管理员权限）
- [x] 病历删除（管理员权限，二次确认）

### 4.4 质控执行页
- [x] 待质控病历列表（未质控 / 已质控 Tab 切换）
- [x] 一键执行质控（选择模式：自动/手动/AI）
- [x] 质控结果详情（评分 + 问题列表）
- [x] 问题严重程度标签（critical/major/minor 颜色区分）
- [x] 质控报告导出（CSV）
- [x] 批量质控执行

### 4.5 规则库管理页
- [x] 规则列表（按分类/状态筛选，分页）
- [x] 规则详情展开（条件、描述）
- [x] 新建规则表单（管理员）
- [x] 规则状态管理（草稿→发布→禁用 流程按钮）
- [x] 规则统计卡片（各分类数量）

### 4.6 统计分析页
- [x] 时间范围选择器（日/周/月 切换）
- [x] 质控通过率趋势图
- [x] 部门对比柱状图
- [x] 问题类型分布饼图
- [x] 数据导出功能

### 4.7 知识库页面组
- [x] 药品知识库（搜索 + 分页列表 + 详情展开）
- [x] 医学术语库（搜索 + 分类筛选 + 同义词展示）
- [x] 检验参考范围（表格展示，危急值高亮，读取 lab_reference 配置）
- [x] 临床指南库（分类浏览 + 关键词搜索 + 内容查看）

### 4.8 系统配置页（管理员）
- [x] 配置列表（按类型筛选展示）
- [x] 配置值编辑（Dialog 编辑）
- [x] 新增配置项
- [x] 抽查管理（创建抽查任务 + 结果查看）

### 4.9 AI 顾问页
- [x] 自定义对话界面（医疗质控专家角色）
- [x] 系统提示词（医疗质控专家角色）
- [x] 快捷问题模板（5个常用问题）
- [x] Markdown 渲染（Streamdown）
- [x] NLP 分析页（process/getSections/getEntities/getIndicators）
- [x] 质控报告页（generate + 下载 JSON）

---

## Phase 5: 数据扩充（数据专家并行执行）

### 5.1 立即启动
- [ ] D2-SOAP: 30种疾病的SOAP病历模板（入库 qcConfigs，configType='soap_template'）
- [ ] D3-clinical: 195项检验指标补充 clinicalSignificance 字段

### 5.2 短期（1-2周）
- [ ] D4-surgery: ICD-9-CM-3 手术操作术语扩充（60→200+条）
- [ ] D5-typo: 临床常见错别字映射库（心肌梗塞→心肌梗死 等）
- [ ] B1-fix: D3 lab expansion 字段格式修复后重新入库

### 5.3 中期规划
- [ ] 疾病分期分型知识库（TNM癌症分期、NYHA心功能分级、CKD分期）
- [ ] 症状体征结构化描述库（高频症状鉴别诊断树）

---

## Phase 6: 测试强化（测试工程师执行）

- [ ] 质控引擎标准病历测试集（8种场景，每种2个用例）
- [ ] NLP Pipeline 精度测试（段落识别、实体抽取、指标解析）
- [ ] 权限矩阵完整验证（4角色×所有敏感操作）
- [ ] 数据质量 SQL 审计（7个数据集）
- [ ] 性能基准测试（5个场景）
- [ ] 测试覆盖率达到 85%+

---

## Phase 7: 后端反馈表 qc_messages（后端工程师执行）

- [x] drizzle/schema.ts 新增 qc_messages 表（id/record_id/checker_type/issue_id/feedback_type/created_by/created_at/note）
- [x] pnpm db:push 迁移
- [x] server/db.ts 新增 createQcMessage / getQcMessages / getQcMessagesByRecord CRUD helper
- [x] server/routers/feedbackRouter.ts 新增 feedback.submit / feedback.list / feedback.listByRecord 三个 tRPC 路由
- [x] 修复 DuplicateChecker type: 'formatting' → 'duplicate'
- [x] 写 vitest 测试覆盖 feedback 路由（5个测试，含权限边界）

---

## Phase 8: 超额完成 - 质控闭环与前端增强

### 后端补强
- [x] qcRouter 新增 getIssues 路由（按 resultId 查询 issues，含 feedback 状态）
- [x] qcRouter.getResult 补充 issues 字段（一次请求返回结果+问题列表）

### 前端 QC 详情页 /qc-results/:id
- [x] 雷达图展示各 checker 得分（completeness/format/duplicate/cross_document）
- [x] 问题列表（按 severity 分组，支持按 type 筛选）
- [x] 每条问题旁“标记假阳性”按钮，调用 trpc.feedback.submit
- [x] 返回质控列表按钮，面包屑导航

### 前端反馈管理面板 /feedback
- [x] 侧边栏“工具”区新增入口（仅 admin/qc_staff 可见）
- [x] 表格展示所有反馈，支持按 checkerType / feedbackType 筛选
- [x] 统计卡片（假阳性总数、已确认数、建议数）

### 前端 Dashboard 增强
- [ ] 替换占位图表为真实 Recharts 数据（质控趋势折线图）
- [ ] 问题类型分布改为真实饼图
- [x] 最近质控记录列表点击跳转详情页

### 前端 Records 页增强
- [ ] 每条病历行增加质控状态徽章（已质控/未质控/不合格）
- [ ] 质控结果列增加"查看详情"链接，跳转 /qc-results/:id
- [x] 执行质控后直接跳转详情页（替代弹窗展示）

## Phase 9: D7 症状体征术语库导入（数据专家 B）
- [ ] 拉取 D7 数据文件 d7_symptom_terms.json
- [ ] 编写导入脚本并入库
- [ ] 验证导入数量
