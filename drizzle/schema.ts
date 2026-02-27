import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  double,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ============================================================
// Users table (Manus OAuth + QC roles)
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "doctor", "qc_staff"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// Medical Records
// ============================================================
export const medicalRecords = mysqlTable("medical_records", {
  id: int("id").autoincrement().primaryKey(),
  patientName: varchar("patientName", { length: 255 }).notNull(),
  recordType: varchar("recordType", { length: 64 }).notNull(),
  content: text("content").notNull(),
  parsedContent: text("parsedContent"),
  fileName: varchar("fileName", { length: 512 }),
  doctorId: int("doctorId").references(() => users.id),
  departmentId: int("departmentId"),
  admissionDate: timestamp("admissionDate"),
  dischargeDate: timestamp("dischargeDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = typeof medicalRecords.$inferInsert;

// ============================================================
// QC Results
// ============================================================
export const qcResults = mysqlTable("qc_results", {
  id: int("id").autoincrement().primaryKey(),
  medicalRecordId: int("medicalRecordId").references(() => medicalRecords.id),
  qcStaffId: int("qcStaffId").references(() => users.id),
  qcMode: varchar("qcMode", { length: 32 }).notNull(),
  totalScore: varchar("totalScore", { length: 32 }),
  isQualified: boolean("isQualified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QcResult = typeof qcResults.$inferSelect;
export type InsertQcResult = typeof qcResults.$inferInsert;

// ============================================================
// QC Issues
// ============================================================
export const qcIssues = mysqlTable("qc_issues", {
  id: int("id").autoincrement().primaryKey(),
  qcResultId: int("qcResultId").references(() => qcResults.id),
  type: varchar("type", { length: 64 }).notNull(),
  severity: varchar("severity", { length: 32 }).notNull(),
  message: text("message").notNull(),
  suggestion: text("suggestion"),
  ruleId: varchar("ruleId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QcIssue = typeof qcIssues.$inferSelect;
export type InsertQcIssue = typeof qcIssues.$inferInsert;

// ============================================================
// Spot Check Records
// ============================================================
export const spotCheckRecords = mysqlTable("spot_check_records", {
  id: int("id").autoincrement().primaryKey(),
  medicalRecordId: int("medicalRecordId").references(() => medicalRecords.id),
  qcStaffId: int("qcStaffId").references(() => users.id),
  qcMode: varchar("qcMode", { length: 32 }).notNull(),
  totalScore: varchar("totalScore", { length: 32 }),
  isQualified: boolean("isQualified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpotCheckRecord = typeof spotCheckRecords.$inferSelect;
export type InsertSpotCheckRecord = typeof spotCheckRecords.$inferInsert;

// ============================================================
// QC Rules
// ============================================================
export const qcRules = mysqlTable("qc_rules", {
  id: int("id").autoincrement().primaryKey(),
  ruleId: varchar("ruleId", { length: 64 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull(),
  severity: varchar("severity", { length: 32 }).notNull(),
  condition: text("condition").notNull(),
  status: varchar("status", { length: 32 }).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QcRuleRow = typeof qcRules.$inferSelect;
export type InsertQcRule = typeof qcRules.$inferInsert;

// ============================================================
// Terminology Mappings
// ============================================================
export const terminologyMappings = mysqlTable("terminology_mappings", {
  id: int("id").autoincrement().primaryKey(),
  abbreviation: varchar("abbreviation", { length: 255 }).notNull(),
  fullName: varchar("fullName", { length: 512 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TerminologyMappingRow = typeof terminologyMappings.$inferSelect;
export type InsertTerminologyMapping = typeof terminologyMappings.$inferInsert;

// ============================================================
// QC Configs
// ============================================================
export const qcConfigs = mysqlTable("qc_configs", {
  id: int("id").autoincrement().primaryKey(),
  configType: varchar("configType", { length: 64 }).notNull(),
  configKey: varchar("configKey", { length: 128 }).notNull(),
  configValue: text("configValue").notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QcConfigRow = typeof qcConfigs.$inferSelect;
export type InsertQcConfig = typeof qcConfigs.$inferInsert;

// ============================================================
// Medical Terminology
// ============================================================
export const medicalTerminology = mysqlTable("medical_terminology", {
  id: int("id").autoincrement().primaryKey(),
  term: varchar("term", { length: 255 }).unique().notNull(),
  standardName: varchar("standardName", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  description: text("description"),
  synonyms: json("synonyms"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MedicalTerminologyRow = typeof medicalTerminology.$inferSelect;
export type InsertMedicalTerminology = typeof medicalTerminology.$inferInsert;

// ============================================================
// Drug Knowledge Base
// ============================================================
export const drugKnowledgeBase = mysqlTable("drug_knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  drugName: varchar("drugName", { length: 255 }).unique().notNull(),
  genericName: varchar("genericName", { length: 255 }),
  category: varchar("category", { length: 128 }),
  maxDailyDose: varchar("maxDailyDose", { length: 64 }),
  unit: varchar("unit", { length: 32 }),
  contraindications: json("contraindications"),
  interactions: json("interactions"),
  sideEffects: json("sideEffects"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DrugKnowledgeRow = typeof drugKnowledgeBase.$inferSelect;
export type InsertDrugKnowledge = typeof drugKnowledgeBase.$inferInsert;

// ============================================================
// Audit Logs
// ============================================================
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId"),
  changes: json("changes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================
// Statistics
// ============================================================
export const statistics = mysqlTable("statistics", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date"),
  totalRecords: int("totalRecords").default(0),
  qualifiedRecords: int("qualifiedRecords").default(0),
  averageScore: double("averageScore").default(0),
  departmentId: int("departmentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StatisticsRow = typeof statistics.$inferSelect;
export type InsertStatistics = typeof statistics.$inferInsert;

// ============================================================
// Symptom Terms (D7)
// ============================================================
export const symptomTerms = mysqlTable("symptom_terms", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 症状名称，如"胸痛"
  aliases: text("aliases"), // 别名，JSON 数组，如["心前区痛","胸部疼痛"]
  bodyPart: varchar("body_part", { length: 50 }), // 部位，如"胸部"
  nature: varchar("nature", { length: 100 }), // 性质，如"压榨性/刺痛/钝痛"
  durationRequired: boolean("duration_required").default(true), // 主诉中是否必须写持续时间
  associatedSymptoms: text("associated_symptoms"), // 常见伴随症状，JSON 数组
  relatedDiseases: text("related_diseases"), // 关联疾病，JSON 数组
  category: varchar("category", { length: 50 }), // 分类：呼吸/循环/消化/神经等
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SymptomTerm = typeof symptomTerms.$inferSelect;
export type InsertSymptomTerm = typeof symptomTerms.$inferInsert;

// ============================================================
// Content Rules (D10)
// ============================================================
export const contentRules = mysqlTable("content_rules", {
  id: int("id").autoincrement().primaryKey(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  // 文书类型：admission_record(入院记录) | discharge_record(出院记录) |
  //           first_progress_note(首次病程) | daily_progress_note(日常病程) |
  //           operation_record(手术记录) | critical_value_record(危急值记录)

  section: varchar("section", { length: 50 }).notNull(),
  // 对应 NLP 段落名：chief_complaint | present_illness | past_history 等

  checkType: varchar("check_type", { length: 50 }).notNull(),
  // 检查类型：required_field(必填字段) | forbidden_content(禁止内容) |
  //           format_check(格式检查) | cross_reference(交叉引用)

  condition: text("condition").notNull(),
  // 检查条件（JSON），示例：
  // {"type": "must_contain_entity", "entityType": "symptom", "minCount": 1}
  // {"type": "must_contain_duration", "section": "chief_complaint"}
  // {"type": "must_not_be_generic", "genericPhrases": ["向上级汇报", "密切观察"]}

  errorMessage: varchar("error_message", { length: 200 }).notNull(),
  // 错误提示，如"主诉缺少持续时间描述"

  severity: varchar("severity", { length: 20 }).default("major"),
  // critical | major | minor

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ContentRule = typeof contentRules.$inferSelect;
export type InsertContentRule = typeof contentRules.$inferInsert;
