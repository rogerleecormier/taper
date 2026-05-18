ALTER TABLE `income_sources` ADD COLUMN `source_type` text DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
CREATE TABLE `paystubs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`income_source_id` text NOT NULL,
	`income_occurrence_id` text,
	`pay_period_start` text,
	`pay_period_end` text,
	`pay_date` text,
	`r2_key` text,
	`file_name` text,
	`gross_pay_cents` integer,
	`net_pay_cents` integer,
	`regular_pay_cents` integer,
	`overtime_pay_cents` integer,
	`other_pay_cents` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`income_source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`income_occurrence_id`) REFERENCES `income_occurrences`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `paystub_deductions` (
	`id` text PRIMARY KEY NOT NULL,
	`paystub_id` text NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`amount_cents` integer NOT NULL,
	`is_pretax` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`paystub_id`) REFERENCES `paystubs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `paystubs_source_idx` ON `paystubs` (`income_source_id`, `pay_period_start`);
