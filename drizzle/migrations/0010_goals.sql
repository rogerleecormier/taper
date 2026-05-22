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
	CONSTRAINT `goal_transfers_positive_amount` CHECK(`goal_transfers`.`amount_cents` > 0),
	CONSTRAINT `goal_transfers_valid_direction` CHECK((`goal_transfers`.`from_goal_id` is not null and `goal_transfers`.`to_goal_id` is null)
          or (`goal_transfers`.`from_goal_id` is null and `goal_transfers`.`to_goal_id` is not null)
          or (`goal_transfers`.`from_goal_id` is not null and `goal_transfers`.`to_goal_id` is not null and `goal_transfers`.`from_goal_id` != `goal_transfers`.`to_goal_id`))
);
