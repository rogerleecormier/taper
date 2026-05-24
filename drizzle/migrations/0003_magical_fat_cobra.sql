CREATE TABLE `bill_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`occurrence_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`paid_date` text NOT NULL,
	`notes` text,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`occurrence_id`) REFERENCES `bill_occurrences`(`id`) ON UPDATE no action ON DELETE cascade
);
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
CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`tracker_default_mode` text DEFAULT 'board' NOT NULL,
	`tracker_default_scope` text DEFAULT 'month' NOT NULL,
	`tracker_default_month_interval` text DEFAULT 'week' NOT NULL,
	`tracker_default_year_interval` text DEFAULT 'month' NOT NULL,
	`payday_interval` text DEFAULT 'biweekly' NOT NULL,
	`payday_anchor_date` text,
	`dashboard_period_mode` text DEFAULT 'month' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `credits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`vendor_id` text,
	`category_id` text,
	`name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`interval` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`day_of_month` integer,
	`day_of_week` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `credit_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`credit_id` text NOT NULL,
	`due_date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`received_date` text,
	`received_amount_cents` integer,
	`carried_from_id` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`credit_id`) REFERENCES `credits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `credit_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`occurrence_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`received_date` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`occurrence_id`) REFERENCES `credit_occurrences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_amount_cents` integer NOT NULL,
	`allocated_cents` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `goal_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`from_goal_id` text,
	`to_goal_id` text,
	`amount_cents` integer NOT NULL,
	`transfer_date` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "goal_transfers_positive_amount" CHECK("goal_transfers"."amount_cents" > 0),
	CONSTRAINT "goal_transfers_valid_direction" CHECK(("goal_transfers"."from_goal_id" is not null and "goal_transfers"."to_goal_id" is null)
          or ("goal_transfers"."from_goal_id" is null and "goal_transfers"."to_goal_id" is not null)
          or ("goal_transfers"."from_goal_id" is not null and "goal_transfers"."to_goal_id" is not null and "goal_transfers"."from_goal_id" != "goal_transfers"."to_goal_id"))
);
--> statement-breakpoint
DROP INDEX `bill_occurrences_bill_date_idx`;--> statement-breakpoint
ALTER TABLE `bill_occurrences` ADD `carried_from_id` text;--> statement-breakpoint
ALTER TABLE `bill_occurrences` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD `impersonated_by` text;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `user` ADD `banned` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_reason` text;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_expires` integer;--> statement-breakpoint
ALTER TABLE `bills` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `income_sources` ADD `source_type` text DEFAULT 'standard' NOT NULL;