/**
 * D5 TypoChecker + D2 SOAP Template Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { typoChecker } from './services/qc/checkers/typoChecker';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

// Mock context for tRPC
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

describe('D5: TypoChecker Service', () => {
  it('should correctly match typos from the mapping library', () => {
    const text = '患者近期出现心肌梗塞，且伴有糖尿并。';
    const issues = typoChecker.check(text);
    
    expect(issues.length).toBeGreaterThanOrEqual(2);
    
    const infarction = issues.find(i => i.wrong === '心肌梗塞');
    expect(infarction).toBeDefined();
    expect(infarction?.correct).toBe('心肌梗死');
    
    const diabetes = issues.find(i => i.wrong === '糖尿并');
    expect(diabetes).toBeDefined();
    expect(diabetes?.correct).toBe('糖尿病');
  });

  it('should return empty array when no typos are present', () => {
    const text = '患者身体健康，各项指标正常。';
    const issues = typoChecker.check(text);
    expect(issues).toHaveLength(0);
  });

  it('should handle multiple occurrences of the same typo', () => {
    const text = '心肌梗塞是一种严重的疾病，心肌梗塞需要及时治疗。';
    const issues = typoChecker.check(text);
    const infarctionIssues = issues.filter(i => i.wrong === '心肌梗塞');
    expect(infarctionIssues).toHaveLength(2);
    expect(infarctionIssues[0].position).not.toBe(infarctionIssues[1].position);
  });
});

describe('D2: SOAP Template Router', () => {
  it('should query SOAP template by exact disease name', async () => {
    const result = await caller.templates.getByDisease({ disease: '高血压' });
    expect(result).not.toBeNull();
    expect(result?.disease).toBe('高血压');
    expect(result?.subjective).toContain('高血压');
  });

  it('should fuzzy match the most relevant SOAP template', async () => {
    // '原发性高血压' 应该能匹配到 '高血压'
    const result = await caller.templates.match({ diagnosis: '原发性高血压' });
    expect(result).not.toBeNull();
    expect(result?.disease).toBe('高血压');
  });

  it('should return null for non-existent disease', async () => {
    const result = await caller.templates.getByDisease({ disease: '某种不存在的疾病' });
    expect(result).toBeNull();
    
    const matchResult = await caller.templates.match({ diagnosis: '某种不存在的疾病' });
    expect(matchResult).toBeNull();
  });

  it('should list all templates', async () => {
    const results = await caller.templates.list();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });
});
