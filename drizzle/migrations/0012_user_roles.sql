ALTER TABLE `user` ADD `role` text DEFAULT 'user';
--> statement-breakpoint
ALTER TABLE `user` ADD `banned` integer DEFAULT false;
--> statement-breakpoint
ALTER TABLE `user` ADD `ban_reason` text;
--> statement-breakpoint
ALTER TABLE `user` ADD `ban_expires` integer;
--> statement-breakpoint
ALTER TABLE `session` ADD `impersonated_by` text;
--> statement-breakpoint
UPDATE `user` SET `role` = 'admin' WHERE `email` = 'rogerleecormier@gmail.com';
