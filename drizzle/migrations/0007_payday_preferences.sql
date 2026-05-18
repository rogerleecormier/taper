ALTER TABLE user_preferences ADD COLUMN payday_interval TEXT NOT NULL DEFAULT 'biweekly';
ALTER TABLE user_preferences ADD COLUMN payday_anchor_date TEXT;
