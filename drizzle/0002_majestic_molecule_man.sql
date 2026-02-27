CREATE TABLE `content_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_type` varchar(50) NOT NULL,
	`section` varchar(50) NOT NULL,
	`check_type` varchar(50) NOT NULL,
	`condition` text NOT NULL,
	`error_message` varchar(200) NOT NULL,
	`severity` varchar(20) DEFAULT 'major',
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `symptom_terms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`aliases` text,
	`body_part` varchar(50),
	`nature` varchar(100),
	`duration_required` boolean DEFAULT true,
	`associated_symptoms` text,
	`related_diseases` text,
	`category` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `symptom_terms_id` PRIMARY KEY(`id`)
);
