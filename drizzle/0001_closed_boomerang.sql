CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(64) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`changes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drug_knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`drugName` varchar(255) NOT NULL,
	`genericName` varchar(255),
	`category` varchar(128),
	`maxDailyDose` varchar(64),
	`unit` varchar(32),
	`contraindications` json,
	`interactions` json,
	`sideEffects` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drug_knowledge_base_id` PRIMARY KEY(`id`),
	CONSTRAINT `drug_knowledge_base_drugName_unique` UNIQUE(`drugName`)
);
--> statement-breakpoint
CREATE TABLE `medical_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientName` varchar(255) NOT NULL,
	`recordType` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`parsedContent` text,
	`fileName` varchar(512),
	`doctorId` int,
	`departmentId` int,
	`admissionDate` timestamp,
	`dischargeDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medical_terminology` (
	`id` int AUTO_INCREMENT NOT NULL,
	`term` varchar(255) NOT NULL,
	`standardName` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`description` text,
	`synonyms` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medical_terminology_id` PRIMARY KEY(`id`),
	CONSTRAINT `medical_terminology_term_unique` UNIQUE(`term`)
);
--> statement-breakpoint
CREATE TABLE `qc_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configType` varchar(64) NOT NULL,
	`configKey` varchar(128) NOT NULL,
	`configValue` text NOT NULL,
	`description` text,
	`status` varchar(32) DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qc_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qc_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`qcResultId` int,
	`type` varchar(64) NOT NULL,
	`severity` varchar(32) NOT NULL,
	`message` text NOT NULL,
	`suggestion` text,
	`ruleId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qc_issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qc_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`medicalRecordId` int,
	`qcStaffId` int,
	`qcMode` varchar(32) NOT NULL,
	`totalScore` varchar(32),
	`isQualified` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qc_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qc_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL,
	`severity` varchar(32) NOT NULL,
	`condition` text NOT NULL,
	`status` varchar(32) DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qc_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `qc_rules_ruleId_unique` UNIQUE(`ruleId`)
);
--> statement-breakpoint
CREATE TABLE `spot_check_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`medicalRecordId` int,
	`qcStaffId` int,
	`qcMode` varchar(32) NOT NULL,
	`totalScore` varchar(32),
	`isQualified` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spot_check_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp,
	`totalRecords` int DEFAULT 0,
	`qualifiedRecords` int DEFAULT 0,
	`averageScore` double DEFAULT 0,
	`departmentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terminology_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`abbreviation` varchar(255) NOT NULL,
	`fullName` varchar(512) NOT NULL,
	`category` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `terminology_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','doctor','qc_staff') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_doctorId_users_id_fk` FOREIGN KEY (`doctorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qc_issues` ADD CONSTRAINT `qc_issues_qcResultId_qc_results_id_fk` FOREIGN KEY (`qcResultId`) REFERENCES `qc_results`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qc_results` ADD CONSTRAINT `qc_results_medicalRecordId_medical_records_id_fk` FOREIGN KEY (`medicalRecordId`) REFERENCES `medical_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qc_results` ADD CONSTRAINT `qc_results_qcStaffId_users_id_fk` FOREIGN KEY (`qcStaffId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spot_check_records` ADD CONSTRAINT `spot_check_records_medicalRecordId_medical_records_id_fk` FOREIGN KEY (`medicalRecordId`) REFERENCES `medical_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spot_check_records` ADD CONSTRAINT `spot_check_records_qcStaffId_users_id_fk` FOREIGN KEY (`qcStaffId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;