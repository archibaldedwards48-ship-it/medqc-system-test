/**
 * Database query functions for MedQC system.
 * Uses Drizzle ORM with MySQL/TiDB via the platform's lazy connection pattern.
 */

import { eq, and, desc, or, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  medicalRecords,
  qcResults,
  qcIssues,
  spotCheckRecords,
  qcRules,
  terminologyMappings,
  qcConfigs,
  medicalTerminology,
  drugKnowledgeBase,
  auditLogs,
  statistics,
  symptomTerms,
  contentRules,
  qcMessages,
  InsertUser,
  InsertMedicalRecord,
  InsertQcResult,
  InsertQcIssue,
  InsertSpotCheckRecord,
  InsertQcRule,
  InsertTerminologyMapping,
  InsertQcConfig,
  InsertMedicalTerminology,
  InsertDrugKnowledge,
  InsertAuditLog,
  InsertStatistics,
  InsertSymptomTerm,
  InsertContentRule,
  InsertQcMessage,
  QcMessage,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// ============================================================
// Database connection (lazy singleton)
// ============================================================

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Helper: get db or throw
async function db() {
  const conn = await getDb();
  if (!conn) throw new Error("[Database] Not available");
  return conn;
}

// ============================================================
// User functions (preserving Manus OAuth upsert)
// ============================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const d = await db();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) {
    values.lastSignedIn = new Date();
  }
  if (Object.keys(updateSet).length === 0) {
    updateSet.lastSignedIn = new Date();
  }
  await d.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const d = await getDb();
  if (!d) return undefined;
  const result = await d.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const d = await db();
  const result = await d.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getUserByEmail(email: string) {
  const d = await db();
  const result = await d.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? undefined;
}

export async function getAllUsers() {
  const d = await db();
  return d.select().from(users);
}

export async function getUsersByRole(role: string) {
  const d = await db();
  return d.select().from(users).where(eq(users.role, role as any));
}

export async function updateUser(id: number, data: Partial<{ email: string; name: string; role: string }>) {
  const d = await db();
  return d.update(users).set(data as any).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const d = await db();
  return d.delete(users).where(eq(users.id, id));
}

// ============================================================
// Medical Records
// ============================================================

export async function getMedicalRecordById(id: number) {
  const d = await db();
  const result = await d.select().from(medicalRecords).where(eq(medicalRecords.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getAllMedicalRecords(limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(medicalRecords)
    .orderBy(desc(medicalRecords.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getMedicalRecordsByDoctor(doctorId: number, limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(medicalRecords)
    .where(eq(medicalRecords.doctorId, doctorId))
    .orderBy(desc(medicalRecords.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getMedicalRecordsByDepartment(departmentId: number, limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(medicalRecords)
    .where(eq(medicalRecords.departmentId, departmentId))
    .orderBy(desc(medicalRecords.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getMedicalRecordsByType(recordType: string, limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(medicalRecords)
    .where(eq(medicalRecords.recordType, recordType))
    .orderBy(desc(medicalRecords.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function searchMedicalRecords(patientName: string, limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(medicalRecords)
    .where(like(medicalRecords.patientName, `%${patientName}%`))
    .orderBy(desc(medicalRecords.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createMedicalRecord(data: Omit<InsertMedicalRecord, "id" | "createdAt" | "updatedAt">) {
  const d = await db();
  const result = await d.insert(medicalRecords).values(data);
  return result[0].insertId;
}

export async function updateMedicalRecord(id: number, data: Partial<InsertMedicalRecord>) {
  const d = await db();
  return d.update(medicalRecords).set(data).where(eq(medicalRecords.id, id));
}

export async function deleteMedicalRecord(id: number) {
  const d = await db();
  return d.delete(medicalRecords).where(eq(medicalRecords.id, id));
}

export async function countMedicalRecords() {
  const d = await db();
  const result = await d.select({ count: sql<number>`count(*)` }).from(medicalRecords);
  return result[0]?.count ?? 0;
}

// ============================================================
// Symptom Terms
// ============================================================

export async function getSymptomTerms(): Promise<string[]> {
  const d = await getDb();
  if (!d) {
    // 如果数据库不可用，返回基本硬编码列表以保证系统运行
    return ["疼痛", "发热", "咳嗽", "头晕", "乏力", "症状"];
  }
  const result = await d.select({ name: symptomTerms.name }).from(symptomTerms);
  return result.map((row) => row.name);
}

export async function getSymptomAliases(symptomName: string): Promise<string[]> {
  const d = await getDb();
  if (!d) return [];
  const results = await d
    .select({ aliases: symptomTerms.aliases })
    .from(symptomTerms)
    .where(eq(symptomTerms.name, symptomName))
    .limit(1);
  if (results.length === 0) return [];
  try {
    const aliases = results[0].aliases;
    if (!aliases) return [];
    return typeof aliases === "string" ? JSON.parse(aliases) : (aliases as string[]);
  } catch {
    return [];
  }
}

export async function createSymptomTerms(terms: InsertSymptomTerm[]) {
  const d = await db();
  return d.insert(symptomTerms).values(terms);
}

// ============================================================
// Content Rules
// ============================================================

export async function getContentRules(documentType: string) {
  const d = await db();
  return d
    .select()
    .from(contentRules)
    .where(and(eq(contentRules.documentType, documentType), eq(contentRules.isActive, true)));
}

export async function createContentRules(rules: InsertContentRule[]) {
  const d = await db();
  return d.insert(contentRules).values(rules);
}

// ============================================================
// QC Results
// ============================================================

export async function getQcResultById(id: number) {
  const d = await db();
  const result = await d.select().from(qcResults).where(eq(qcResults.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getQcResultByMedicalRecordId(medicalRecordId: number) {
  const d = await db();
  const result = await d.select().from(qcResults)
    .where(eq(qcResults.medicalRecordId, medicalRecordId))
    .orderBy(desc(qcResults.createdAt))
    .limit(1);
  return result[0] ?? undefined;
}

export async function getQcResultsByStaff(qcStaffId: number, limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(qcResults)
    .where(eq(qcResults.qcStaffId, qcStaffId))
    .orderBy(desc(qcResults.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getAllQcResults(limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(qcResults)
    .orderBy(desc(qcResults.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createQcResult(data: Omit<InsertQcResult, "id" | "createdAt" | "updatedAt">) {
  const d = await db();
  const result = await d.insert(qcResults).values(data);
  return result[0].insertId;
}

export async function updateQcResult(id: number, data: Partial<InsertQcResult>) {
  const d = await db();
  return d.update(qcResults).set(data).where(eq(qcResults.id, id));
}

// ============================================================
// QC Issues
// ============================================================

export async function getQcIssuesByResultId(qcResultId: number) {
  const d = await db();
  return d.select().from(qcIssues).where(eq(qcIssues.qcResultId, qcResultId));
}

export async function getQcIssuesByRecordId(recordId: number) {
  const d = await db();
  return d.select()
    .from(qcIssues)
    .innerJoin(qcResults, eq(qcIssues.qcResultId, qcResults.id))
    .where(eq(qcResults.medicalRecordId, recordId));
}

export async function createQcIssue(data: Omit<InsertQcIssue, "id" | "createdAt">) {
  const d = await db();
  const result = await d.insert(qcIssues).values(data);
  return result[0].insertId;
}

export async function createQcIssues(qcResultId: number, issues: Array<Omit<InsertQcIssue, "id" | "createdAt" | "qcResultId">>) {
  if (issues.length === 0) return;
  const d = await db();
  const records = issues.map((issue) => ({ ...issue, qcResultId }));
  return d.insert(qcIssues).values(records);
}

// ============================================================
// Spot Check Records
// ============================================================

export async function createSpotCheckRecord(data: Omit<InsertSpotCheckRecord, "id" | "createdAt">) {
  const d = await db();
  const result = await d.insert(spotCheckRecords).values(data);
  return result[0].insertId;
}

export async function getSpotCheckResultById(id: number) {
  const d = await db();
  const result = await d.select().from(spotCheckRecords).where(eq(spotCheckRecords.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getSpotCheckRecords(limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(spotCheckRecords)
    .orderBy(desc(spotCheckRecords.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getSpotCheckRecordsByStaff(qcStaffId: number, limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(spotCheckRecords)
    .where(eq(spotCheckRecords.qcStaffId, qcStaffId))
    .orderBy(desc(spotCheckRecords.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countSpotCheckRecords() {
  const d = await db();
  const result = await d.select({ count: sql<number>`count(*)` }).from(spotCheckRecords);
  return result[0]?.count ?? 0;
}

// ============================================================
// QC Rules
// ============================================================

export async function getAllQcRules() {
  const d = await db();
  return d.select().from(qcRules).where(eq(qcRules.status, "active"));
}

export async function getQcRuleById(id: number) {
  const d = await db();
  const result = await d.select().from(qcRules).where(eq(qcRules.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getQcRuleByRuleId(ruleId: string) {
  const d = await db();
  const result = await d.select().from(qcRules).where(eq(qcRules.ruleId, ruleId)).limit(1);
  return result[0] ?? undefined;
}

export async function getQcRulesByCategory(category: string) {
  const d = await db();
  return d.select().from(qcRules)
    .where(and(eq(qcRules.category, category), eq(qcRules.status, "active")));
}

export async function createQcRule(data: Omit<InsertQcRule, "id" | "createdAt" | "updatedAt">) {
  const d = await db();
  const result = await d.insert(qcRules).values({ ...data, status: data.status || "active" });
  return result[0].insertId;
}

export async function updateQcRule(id: number, data: Partial<InsertQcRule>) {
  const d = await db();
  return d.update(qcRules).set(data).where(eq(qcRules.id, id));
}

export async function deleteQcRule(id: number) {
  const d = await db();
  return d.delete(qcRules).where(eq(qcRules.id, id));
}

export async function countQcRules() {
  const d = await db();
  const result = await d.select({ count: sql<number>`count(*)` }).from(qcRules);
  return result[0]?.count ?? 0;
}

// ============================================================
// Terminology Mappings
// ============================================================

export async function getTerminologyMappings(category: string) {
  const d = await db();
  return d.select().from(terminologyMappings).where(eq(terminologyMappings.category, category));
}

export async function getAllTerminologyMappings() {
  const d = await db();
  return d.select().from(terminologyMappings);
}

export async function getTerminologyMapping(abbreviation: string) {
  const d = await db();
  const result = await d.select().from(terminologyMappings)
    .where(eq(terminologyMappings.abbreviation, abbreviation)).limit(1);
  return result[0] ?? undefined;
}

export async function createTerminologyMapping(data: Omit<InsertTerminologyMapping, "id" | "createdAt">) {
  const d = await db();
  const result = await d.insert(terminologyMappings).values(data);
  return result[0].insertId;
}

// ============================================================
// QC Configs
// ============================================================

export async function getAllQcConfigs() {
  const d = await db();
  return d.select().from(qcConfigs).where(eq(qcConfigs.status, "active"));
}

export async function getQcConfigById(id: number) {
  const d = await db();
  const result = await d.select().from(qcConfigs).where(eq(qcConfigs.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getQcConfigByKey(configType: string, configKey: string) {
  const d = await db();
  const result = await d.select().from(qcConfigs)
    .where(and(
      eq(qcConfigs.configType, configType),
      eq(qcConfigs.configKey, configKey),
      eq(qcConfigs.status, "active"),
    ))
    .limit(1);
  return result[0] ?? undefined;
}

export async function getQcConfigsByType(configType: string) {
  const d = await db();
  return d.select().from(qcConfigs)
    .where(and(eq(qcConfigs.configType, configType), eq(qcConfigs.status, "active")));
}

export async function createQcConfig(data: Omit<InsertQcConfig, "id" | "createdAt" | "updatedAt">) {
  const d = await db();
  const result = await d.insert(qcConfigs).values({ ...data, status: data.status || "active" });
  return result[0].insertId;
}

export async function updateQcConfig(id: number, data: Partial<InsertQcConfig>) {
  const d = await db();
  return d.update(qcConfigs).set(data).where(eq(qcConfigs.id, id));
}

// ============================================================
// Medical Terminology
// ============================================================

export async function getMedicalTerminologyByTerm(term: string) {
  const d = await db();
  const result = await d.select().from(medicalTerminology)
    .where(eq(medicalTerminology.term, term)).limit(1);
  return result[0] ?? undefined;
}

export async function getMedicalTerminologiesByCategory(category: string) {
  const d = await db();
  return d.select().from(medicalTerminology).where(eq(medicalTerminology.category, category));
}

export async function getAllMedicalTerminologies() {
  const d = await db();
  return d.select().from(medicalTerminology);
}

export async function createMedicalTerminologyEntry(data: Omit<InsertMedicalTerminology, "id" | "createdAt">) {
  const d = await db();
  const result = await d.insert(medicalTerminology).values(data);
  return result[0].insertId;
}

export async function searchMedicalTerminology(keyword: string) {
  const d = await db();
  return d.select().from(medicalTerminology)
    .where(or(
      like(medicalTerminology.term, `%${keyword}%`),
      like(medicalTerminology.standardName, `%${keyword}%`),
    ));
}

// ============================================================
// Drug Knowledge Base
// ============================================================

export async function getDrugByName(drugName: string) {
  const d = await db();
  const result = await d.select().from(drugKnowledgeBase)
    .where(eq(drugKnowledgeBase.drugName, drugName)).limit(1);
  return result[0] ?? undefined;
}

export async function getDrugsByCategory(category: string) {
  const d = await db();
  return d.select().from(drugKnowledgeBase).where(eq(drugKnowledgeBase.category, category));
}

export async function getAllDrugs(limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(drugKnowledgeBase).limit(limit).offset(offset);
}

export async function createDrug(data: Omit<InsertDrugKnowledge, "id" | "createdAt">) {
  const d = await db();
  const result = await d.insert(drugKnowledgeBase).values(data);
  return result[0].insertId;
}

export async function searchDrugs(keyword: string) {
  const d = await db();
  return d.select().from(drugKnowledgeBase)
    .where(or(
      like(drugKnowledgeBase.drugName, `%${keyword}%`),
      like(drugKnowledgeBase.genericName, `%${keyword}%`),
    ));
}

// ============================================================
// Audit Logs
// ============================================================

export async function createAuditLog(data: Omit<InsertAuditLog, "id" | "createdAt">) {
  const d = await db();
  const result = await d.insert(auditLogs).values(data);
  return result[0].insertId;
}

export async function getAuditLogs(limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getAuditLogsByUser(userId: number, limit = 100, offset = 0) {
  const d = await db();
  return d.select().from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============================================================
// Statistics
// ============================================================

export async function getStatisticsByDate(date: Date) {
  const d = await db();
  const result = await d.select().from(statistics)
    .where(eq(statistics.date, date))
    .limit(1);
  return result[0] ?? undefined;
}

export async function getRecentStatistics(limit = 30) {
  const d = await db();
  return d.select().from(statistics)
    .orderBy(desc(statistics.date))
    .limit(limit);
}

export async function createStatistics(data: Omit<InsertStatistics, "id" | "createdAt">) {
  const d = await db();
  const result = await d.insert(statistics).values(data);
  return result[0].insertId;
}

// ============================================================
// QC Messages (False-positive Feedback)
// ============================================================
export async function createQcMessage(data: Omit<InsertQcMessage, "id" | "createdAt">) {
  const d = await db();
  const result = await d.insert(qcMessages).values(data);
  return result[0].insertId as number;
}

export async function getQcMessagesByRecord(recordId: number) {
  const d = await db();
  return d.select().from(qcMessages)
    .where(eq(qcMessages.recordId, recordId))
    .orderBy(desc(qcMessages.createdAt));
}

export async function getQcMessages(options: {
  checkerType?: string;
  feedbackType?: QcMessage['feedbackType'];
  limit?: number;
  offset?: number;
}) {
  const d = await db();
  const conditions = [];
  if (options.checkerType) conditions.push(eq(qcMessages.checkerType, options.checkerType));
  if (options.feedbackType) conditions.push(eq(qcMessages.feedbackType, options.feedbackType));
  return d.select().from(qcMessages)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(qcMessages.createdAt))
    .limit(options.limit ?? 50)
    .offset(options.offset ?? 0);
}

export async function countQcMessages(checkerType?: string) {
  const d = await db();
  const condition = checkerType ? eq(qcMessages.checkerType, checkerType) : undefined;
  const result = await d.select({ count: sql<number>`count(*)` })
    .from(qcMessages)
    .where(condition);
  return Number(result[0]?.count ?? 0);
}
