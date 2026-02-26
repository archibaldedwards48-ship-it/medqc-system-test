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

## Phase 3: Router Layer (Pending)
- [ ] 11 router files integration
- [ ] Replace monolithic routers.ts

## Frontend
- [ ] Replace Mock data with tRPC calls (after backend migration)
- [ ] AI Advisor page with AIChatBox
- [ ] UI polish (animations, empty states, responsive)

## Phase 2: Business Logic Layer Integration (Detailed)
- [x] Copy 14 files to server/services/nlp/ and server/services/qc/
- [x] Fix import paths (../../types/, ../../db)
- [x] Fix SQLite→MySQL type mismatches in checkers
- [x] Fix QcResult/MedicalRecord/MedicalValidationResult type gaps
- [x] Fix JSON.parse for json() columns (contraindications, interactions)
- [x] TypeScript compilation passes (0 errors)
- [x] Write vitest tests - 53 tests all passing
- [ ] Save Phase 2 checkpoint (pending)

## Data Enrichment (B tasks)
- [x] B2: D5 lab fullname supplement (614 items) - Accepted
- [x] B3: D1 rules structured (63 rules) - Accepted
- [ ] B1: D3 lab expansion to 200+ - Needs fix (field format mismatch)
- [ ] A1: Data format alignment for DB import (6 datasets) - In progress
