# 测试工程师入职指南

## 项目基本信息

| 项目名称 | 病例质控知识库与规则归纳系统（MedQC Platform） |
|---------|----------------------------------------------|
| GitHub 仓库 | https://github.com/archibaldedwards48-ship-it/medqc-system-test |
| 线上预览 | https://3000-i58gm9xmopjfziuebzfvd-ad91a1e8.us2.manus.computer |
| 当前版本 | cd1dd784（Phase 4 完成） |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui |
| **后端** | Express 4 + tRPC 11（类型安全 RPC） |
| **数据库** | MySQL / TiDB（通过 Drizzle ORM） |
| **认证** | Manus OAuth（JWT Cookie） |
| **测试框架** | Vitest（单元测试） |
| **包管理** | pnpm |
| **构建工具** | Vite |

---

## 项目开发进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 1：数据层迁移 | ✅ 完成 | 12张 MySQL 表，60+ Drizzle ORM 查询函数 |
| Phase 2：业务逻辑层 | ✅ 完成 | NLP Pipeline + QcEngine（7个检查器） |
| Phase 3：路由层 | ✅ 完成 | 11个 tRPC 路由模块 |
| Phase 4：前端开发 | ✅ 完成 | 14个业务页面全部上线 |
| Phase 5：数据扩充 | 🔄 进行中 | 数据专家并行执行 |
| Phase 6：测试强化 | 🔴 待启动 | **您的工作** |

---

## 本地环境搭建

### 1. 克隆代码

```bash
git clone https://github.com/archibaldedwards48-ship-it/medqc-system-test.git
cd medqc-system-test
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 环境变量配置

项目依赖以下环境变量（在 `.env` 文件中配置）：

```env
# 数据库连接（MySQL/TiDB）
DATABASE_URL=mysql://user:password@host:port/dbname

# JWT 签名密钥
JWT_SECRET=your-jwt-secret

# Manus OAuth（如需测试认证流程）
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im

# LLM API（如需测试 AI 顾问功能）
BUILT_IN_FORGE_API_URL=https://...
BUILT_IN_FORGE_API_KEY=your-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-key
VITE_FRONTEND_FORGE_API_URL=https://...
```

> **注意**：如果只做后端单元测试，不需要配置 OAuth 和 LLM 相关变量。测试框架会自动 mock 数据库连接。

### 4. 运行现有测试

```bash
# 运行所有测试（当前 109 个，应全部通过）
pnpm test

# 生成覆盖率报告（目标 85%+）
pnpm test --coverage

# 监听模式（开发时使用）
pnpm test --watch
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

---

## 项目文件结构

```
medqc-system-test/
├── client/src/
│   ├── pages/              ← 14个业务页面
│   │   ├── Dashboard.tsx   ← 总览看板
│   │   ├── Records.tsx     ← 病历管理
│   │   ├── QcExecution.tsx ← 质控执行
│   │   ├── Rules.tsx       ← 规则库
│   │   ├── Statistics.tsx  ← 统计分析
│   │   ├── DrugKnowledge.tsx
│   │   ├── Terminology.tsx
│   │   ├── LabReferences.tsx
│   │   ├── Guidelines.tsx
│   │   ├── AiAdvisor.tsx
│   │   ├── NlpAnalysis.tsx
│   │   ├── SpotCheck.tsx
│   │   ├── Reports.tsx
│   │   └── Config.tsx
│   └── components/
│       └── DashboardLayout.tsx ← 侧边栏布局
├── server/
│   ├── routers/            ← 11个 tRPC 路由模块
│   │   ├── recordsRouter.ts
│   │   ├── qcRouter.ts
│   │   ├── rulesRouter.ts
│   │   ├── drugKnowledgeRouter.ts
│   │   ├── medicalTerminologyRouter.ts
│   │   ├── configRouter.ts
│   │   ├── statisticsRouter.ts
│   │   ├── spotCheckRouter.ts
│   │   ├── nlpRouter.ts
│   │   ├── reportRouter.ts
│   │   └── authRouter.ts
│   ├── services/
│   │   ├── nlp/            ← NLP Pipeline（6个模块）
│   │   └── qc/             ← QcEngine（7个检查器）
│   ├── db.ts               ← 60+ 数据库查询函数
│   ├── routers.ts          ← tRPC 路由聚合入口
│   ├── db.test.ts          ← 数据库层测试（24个）
│   ├── services.test.ts    ← 业务逻辑层测试（28个）
│   ├── routers.test.ts     ← 路由层测试（56个）
│   └── auth.logout.test.ts ← 认证测试（1个）
├── drizzle/
│   └── schema.ts           ← 12张数据库表定义
└── shared/
    └── types.ts            ← 共享类型定义
```

---

## 当前测试覆盖情况（109个测试）

### 已有测试文件

| 文件 | 测试数 | 覆盖范围 |
|------|--------|---------|
| `server/db.test.ts` | 24 | 数据库查询函数（CRUD、分页、搜索） |
| `server/services.test.ts` | 28 | NLP Pipeline、QcEngine、各检查器 |
| `server/routers.test.ts` | 56 | 11个路由模块的输入验证和响应格式 |
| `server/auth.logout.test.ts` | 1 | 登出流程 |

### 覆盖缺口（需要补充）

以下场景**尚未覆盖**，是您的主要工作目标：

---

## 您的测试任务清单

### 任务一：运行现有测试，确认基线

```bash
pnpm test
# 预期：109 passed, 0 failed
```

### 任务二：数据质量 SQL 审计

在项目 Database 面板或通过 MySQL 客户端执行以下审计 SQL：

```sql
-- 检查检验参考范围数据异常（min > max）
SELECT configKey, configValue 
FROM qc_configs 
WHERE configType = 'lab_reference';

-- 检查药品知识库数据完整性
SELECT COUNT(*) as total,
       COUNT(drugName) as has_name,
       COUNT(genericName) as has_generic,
       COUNT(contraindications) as has_contra
FROM drug_knowledge_base;

-- 检查医学术语重复项
SELECT term, COUNT(*) as cnt 
FROM medical_terminology 
GROUP BY term 
HAVING cnt > 1;

-- 检查质控规则状态分布
SELECT status, COUNT(*) as cnt 
FROM qc_rules 
GROUP BY status;

-- 检查病历数据完整性
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN patientName IS NULL THEN 1 ELSE 0 END) as missing_name,
  SUM(CASE WHEN content IS NULL OR content = '' THEN 1 ELSE 0 END) as missing_content
FROM medical_records;
```

### 任务三：补充权限边界测试

在 `server/routers.test.ts` 末尾追加以下测试场景：

```typescript
// 示例：doctor 角色不能删除病历（应返回 FORBIDDEN）
it('doctor cannot delete medical record', async () => {
  const ctx = createMockContext({ role: 'doctor' });
  await expect(
    appRouter.createCaller(ctx).records.delete({ id: 1 })
  ).rejects.toThrow('FORBIDDEN');
});

// 示例：未登录用户访问受保护接口（应返回 UNAUTHORIZED）
it('unauthenticated user cannot list records', async () => {
  const ctx = createMockContext({ user: null });
  await expect(
    appRouter.createCaller(ctx).records.list({ page: 1, pageSize: 10 })
  ).rejects.toThrow('UNAUTHORIZED');
});
```

### 任务四：质控引擎标准测试集

在 `server/services.test.ts` 中补充 8 种标准病历场景：

| 场景 | 预期结果 |
|------|---------|
| 完整合格病历（主诉+现病史+体检+诊断+治疗） | 总分 ≥ 85，isQualified = true |
| 缺少主诉 | 触发 `MISSING_CHIEF_COMPLAINT` 规则 |
| 缺少体格检查 | 触发 `MISSING_PHYSICAL_EXAM` 规则 |
| 诊断与检验结果不符 | 触发 `DIAGNOSIS_LAB_MISMATCH` 规则 |
| 药物剂量超标 | 触发 `DRUG_DOSE_EXCEEDED` 规则 |
| 危急值未处理 | 触发 `CRITICAL_VALUE_UNHANDLED` 规则 |
| 手术记录缺失 | 触发 `MISSING_OPERATION_NOTE` 规则 |
| 完全空白病历 | 总分 = 0，所有必填项规则触发 |

### 任务五：NLP 精度测试

```typescript
// 测试段落识别准确性
it('should correctly identify chief complaint section', () => {
  const text = '主诉：发热3天，咳嗽2天。现病史：患者3天前无明显诱因出现发热...';
  const result = nlpPipeline.extractSections(text);
  expect(result.chiefComplaint).toContain('发热3天');
});

// 测试实体识别
it('should extract diagnosis entities', () => {
  const text = '诊断：1. 急性上呼吸道感染 2. 高血压病3级';
  const entities = nlpPipeline.extractEntities(text);
  expect(entities.diagnoses).toContain('急性上呼吸道感染');
  expect(entities.diagnoses).toContain('高血压病3级');
});
```

### 任务六：性能基准测试

```bash
# 安装 autocannon（HTTP 压测工具）
pnpm add -D autocannon

# 对关键接口压测（目标：P95 < 500ms）
npx autocannon -c 10 -d 10 http://localhost:3000/api/trpc/records.list
```

---

## 缺陷报告模板

发现问题后，请按以下格式提交：

```markdown
## Bug #001

**严重程度**：Critical / Major / Minor
**模块**：records / qc / rules / ...
**接口**：trpc.records.list / trpc.qc.execute / ...

**复现步骤**：
1. 步骤一
2. 步骤二

**预期结果**：...
**实际结果**：...

**相关测试用例**：
\`\`\`typescript
it('should ...', async () => {
  // 失败的测试用例
});
\`\`\`
```

---

## 联系方式

遇到问题请直接在项目对话中反馈，开发侧会及时响应。

**测试目标**：覆盖率 ≥ 85%，所有 Critical 缺陷在交付前修复。
