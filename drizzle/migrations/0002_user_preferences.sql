CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`tracker_default_mode` text DEFAULT 'board' NOT NULL,
	`tracker_default_scope` text DEFAULT 'month' NOT NULL,
	`tracker_default_month_interval` text DEFAULT 'week' NOT NULL,
	`tracker_default_year_interval` text DEFAULT 'month' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
