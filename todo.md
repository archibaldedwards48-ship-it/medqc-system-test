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
- [ ] Save checkpoint (pending)

## Data Deliverables
- [x] D1 QC Rules Library - Accepted
- [x] D2 Clinical Guidelines (178 items) - Accepted
- [x] D3 Lab Test Reference Ranges (114 items) - Accepted
- [x] D4 Medical Terminology Synonyms (500 items v2) - Accepted
- [ ] D5 Terminology Mapping Synonyms - Work pack ready
- [x] D6 Clinical Guidelines Full (353 items) - Accepted
- [x] Medication Knowledge Base V3 (19,190 items) - Accepted

## Phase 2: Business Logic Layer (Pending)
- [ ] NLP Pipeline integration
- [ ] QcEngineService + 7 Checkers integration

## Phase 3: Router Layer (Pending)
- [ ] 11 router files integration
- [ ] Replace monolithic routers.ts

## Frontend
- [ ] Replace Mock data with tRPC calls (after backend migration)
- [ ] AI Advisor page with AIChatBox
- [ ] UI polish (animations, empty states, responsive)
