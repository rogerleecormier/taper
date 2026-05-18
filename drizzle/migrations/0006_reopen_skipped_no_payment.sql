-- Reset occurrences that were skipped with no payments back to overdue/pending
-- so they can be carried forward from the UI.
UPDATE bill_occurrences
SET
  status = CASE
    WHEN due_date < date('now') THEN 'overdue'
    ELSE 'pending'
  END
WHERE status = 'skipped'
  AND (paid_amount_cents IS NULL OR paid_amount_cents = 0);
