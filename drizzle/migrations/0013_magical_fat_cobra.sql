DROP INDEX IF EXISTS `bill_occurrences_bill_date_idx`;--> statement-breakpoint
ALTER TABLE `bill_occurrences` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `hidden` integer DEFAULT false NOT NULL;