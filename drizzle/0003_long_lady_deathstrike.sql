CREATE TABLE `qc_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int NOT NULL,
	`checker_type` varchar(64) NOT NULL,
	`issue_id` varchar(128) NOT NULL,
	`feedback_type` enum('false_positive','confirmed','suggestion') NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`note` text,
	CONSTRAINT `qc_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `qc_messages` ADD CONSTRAINT `qc_messages_record_id_medical_records_id_fk` FOREIGN KEY (`record_id`) REFERENCES `medical_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qc_messages` ADD CONSTRAINT `qc_messages_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;