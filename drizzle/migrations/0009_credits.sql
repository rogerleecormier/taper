-- Credits feature: three-table model mirroring bills/occurrences/payments
-- credits = the series, credit_occurrences = individual instances,
-- credit_receipts = partial receipt records per occurrence

CREATE TABLE `credits` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `vendor_id` text REFERENCES `vendors`(`id`) ON DELETE SET NULL,
  `category_id` text REFERENCES `categories`(`id`) ON DELETE SET NULL,
  `name` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `interval` text NOT NULL,
  `start_date` text NOT NULL,
  `end_date` text,
  `day_of_month` integer,
  `day_of_week` integer,
  `is_active` integer NOT NULL DEFAULT 1,
  `notes` text,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE `credit_occurrences` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `credit_id` text NOT NULL REFERENCES `credits`(`id`) ON DELETE CASCADE,
  `due_date` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `received_date` text,
  `received_amount_cents` integer,
  `carried_from_id` text,
  `notes` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE `credit_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `occurrence_id` text NOT NULL REFERENCES `credit_occurrences`(`id`) ON DELETE CASCADE,
  `amount_cents` integer NOT NULL,
  `received_date` text NOT NULL,
  `notes` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
