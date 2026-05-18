UPDATE bill_occurrences
SET status = 'carried'
WHERE status = 'skipped'
  AND paid_amount_cents > 0;
