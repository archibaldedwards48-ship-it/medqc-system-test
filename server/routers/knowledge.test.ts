/**
 * Knowledge Router Tests
 * Covers D6, D8, and D9 features
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';
import fs from 'fs';
import path from 'path';

// --- Mock Context ---

const mockUser = {
  id: 1,
  openId: 'test-user',
  role: 'admin' as const,
  name: 'Test Admin',
  email: 'admin@test.com',
  loginMethod: 'manus',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockCtx: TrpcContext = {
  user: mockUser,
  req: {} as any,
  res: {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as any,
};

const caller = appRouter.createCaller(mockCtx);

describe('Knowledge Router - D6 Disease Staging', () => {
  it('should return all disease staging data when no params provided', async () => {
    const result = await caller.knowledge.getDiseaseStaging({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should filter disease staging by disease name', async () => {
    const result = await caller.knowledge.getDiseaseStaging({ disease: '肺癌' });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].disease).toContain('肺癌');
  });

  it('should verify the structure of disease staging items', async () => {
    const result = await caller.knowledge.getDiseaseStaging({ disease: '肺癌' });
    const item = result[0];
    expect(item).toHaveProperty('disease');
    expect(item).toHaveProperty('category');
    expect(item).toHaveProperty('stagingSystem');
    expect(item).toHaveProperty('stages');
    expect(Array.isArray(item.stages)).toBe(true);
    expect(item.stages[0]).toHaveProperty('stage');
    expect(item.stages[0]).toHaveProperty('criteria');
  });
});

describe('Knowledge Router - D6 Symptom Differential', () => {
  it('should filter symptom differential by symptom name', async () => {
    const result = await caller.knowledge.getSymptomDifferential({ symptom: '胸痛' });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].symptom).toContain('胸痛');
  });

  it('should verify the structure of symptom differential items', async () => {
    const result = await caller.knowledge.getSymptomDifferential({ symptom: '胸痛' });
    const item = result[0];
    expect(item).toHaveProperty('symptom');
    expect(item).toHaveProperty('category');
    expect(item).toHaveProperty('differentialDiagnosis');
    expect(Array.isArray(item.differentialDiagnosis)).toBe(true);
  });
});

describe('Knowledge Router - D6 Search Knowledge', () => {
  it('should search across both staging and differential data with a keyword', async () => {
    const result = await caller.knowledge.searchKnowledge({ keyword: '肺' });
    expect(result).toHaveProperty('diseaseStaging');
    expect(result).toHaveProperty('symptomDifferential');
    expect(Array.isArray(result.diseaseStaging)).toBe(true);
    expect(Array.isArray(result.symptomDifferential)).toBe(true);
  });
});

describe('Knowledge Router - D8 Departments (Reserve)', () => {
  it('should return empty array if d8_department_mapping.json does not exist', async () => {
    // We temporarily rename the file to simulate non-existence
    const realPath = path.resolve(process.cwd(), 'data/d8_department_mapping.json');
    const tempPath = path.resolve(process.cwd(), 'data/d8_department_mapping.json.bak');
    
    const exists = fs.existsSync(realPath);
    if (exists) fs.renameSync(realPath, tempPath);
    
    try {
      const result = await caller.knowledge.getDepartments({});
      expect(result).toEqual([]);
    } finally {
      if (exists) fs.renameSync(tempPath, realPath);
    }
  });

  it('should return department list if file exists', async () => {
    const result = await caller.knowledge.getDepartments({});
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('departmentName');
      expect(result[0]).toHaveProperty('departmentCode');
    }
  });

  it('should get department by code', async () => {
    const departments = await caller.knowledge.getDepartments({});
    if (departments.length > 0) {
      const code = departments[0].departmentCode;
      const result = await caller.knowledge.getDepartmentByCode({ code });
      expect(result).not.toBeNull();
      expect(result?.departmentCode).toBe(code);
    }
  });
});

describe('Knowledge Router - D9 Scoring Templates (Reserve)', () => {
  it('should return empty array if d9_scoring_templates.json does not exist', async () => {
    const realPath = path.resolve(process.cwd(), 'data/d9_scoring_templates.json');
    const tempPath = path.resolve(process.cwd(), 'data/d9_scoring_templates.json.bak');
    
    const exists = fs.existsSync(realPath);
    if (exists) fs.renameSync(realPath, tempPath);
    
    try {
      const result = await caller.knowledge.getScoringTemplates({});
      expect(result).toEqual([]);
    } finally {
      if (exists) fs.renameSync(tempPath, realPath);
    }
  });

  it('should filter scoring templates by documentType', async () => {
    const result = await caller.knowledge.getScoringTemplates({ documentType: 'admission_record' });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0].documentType).toBe('admission_record');
    }
  });

  it('should get scoring template by type', async () => {
    const result = await caller.knowledge.getScoringTemplateByType({ documentType: 'admission_record' });
    if (result) {
      expect(result.documentType).toBe('admission_record');
      expect(result).toHaveProperty('sections');
    }
  });
});
