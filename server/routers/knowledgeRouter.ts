/**
 * Knowledge Base Router
 * Handles D6 (Disease Staging & Symptom Differential), D8 (Department Mapping), and D9 (Scoring Templates)
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// --- Types ---

interface DiseaseStaging {
  disease: string;
  category: string;
  stagingSystem: string;
  stages: Array<{ stage: string; description: string; criteria: string }>;
}

interface SymptomDifferential {
  symptom: string;
  category: string;
  differentialDiagnosis: Array<{ disease: string; features: string; urgency: string }>;
  keyQuestions: string[];
}

interface DepartmentMapping {
  departmentCode: string;
  departmentName: string;
  aliases: string[];
  category: string;
  wards: string[];
  bedCount: number;
}

interface ScoringTemplate {
  templateName: string;
  documentType: string;
  totalScore: number;
  sections: any[];
}

// --- Helper: Load JSON Data ---

const loadJsonData = <T>(filename: string): T[] => {
  try {
    const dataPath = path.resolve(process.cwd(), 'data', filename);
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(rawData);
    }
  } catch (error) {
    console.error(`Failed to load data from ${filename}:`, error);
  }
  return [];
};

export const knowledgeRouter = router({
  /**
   * D6: Get Disease Staging
   */
  getDiseaseStaging: protectedProcedure
    .input(z.object({
      disease: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const data = loadJsonData<DiseaseStaging>('d6_disease_staging.json');
      return data.filter(item => {
        const matchDisease = !input.disease || item.disease.includes(input.disease);
        const matchCategory = !input.category || item.category === input.category;
        return matchDisease && matchCategory;
      });
    }),

  /**
   * D6: Get Symptom Differential
   */
  getSymptomDifferential: protectedProcedure
    .input(z.object({
      symptom: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const data = loadJsonData<SymptomDifferential>('d6_symptom_differential.json');
      return data.filter(item => {
        const matchSymptom = !input.symptom || item.symptom.includes(input.symptom);
        const matchCategory = !input.category || item.category === input.category;
        return matchSymptom && matchCategory;
      });
    }),

  /**
   * D6: Search Knowledge (Staging + Differential)
   */
  searchKnowledge: protectedProcedure
    .input(z.object({ keyword: z.string() }))
    .query(async ({ input }) => {
      const stagingData = loadJsonData<DiseaseStaging>('d6_disease_staging.json');
      const differentialData = loadJsonData<SymptomDifferential>('d6_symptom_differential.json');

      const stagingResults = stagingData.filter(item => 
        item.disease.includes(input.keyword) || item.category.includes(input.keyword)
      );
      
      const differentialResults = differentialData.filter(item => 
        item.symptom.includes(input.keyword) || item.category.includes(input.keyword)
      );

      return {
        diseaseStaging: stagingResults,
        symptomDifferential: differentialResults,
      };
    }),

  /**
   * D8: Get Departments (Reserve)
   */
  getDepartments: protectedProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ input }) => {
      const data = loadJsonData<DepartmentMapping>('d8_department_mapping.json');
      if (input.category) {
        return data.filter(item => item.category === input.category);
      }
      return data;
    }),

  /**
   * D8: Get Department By Code
   */
  getDepartmentByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const data = loadJsonData<DepartmentMapping>('d8_department_mapping.json');
      return data.find(item => item.departmentCode === input.code) ?? null;
    }),

  /**
   * D9: Get Scoring Templates (Reserve)
   */
  getScoringTemplates: protectedProcedure
    .input(z.object({ documentType: z.string().optional() }))
    .query(async ({ input }) => {
      const data = loadJsonData<ScoringTemplate>('d9_scoring_templates.json');
      if (input.documentType) {
        return data.filter(item => item.documentType === input.documentType);
      }
      return data;
    }),

  /**
   * D9: Get Scoring Template By Type
   */
  getScoringTemplateByType: protectedProcedure
    .input(z.object({ documentType: z.string() }))
    .query(async ({ input }) => {
      const data = loadJsonData<ScoringTemplate>('d9_scoring_templates.json');
      return data.find(item => item.documentType === input.documentType) ?? null;
    }),
});
