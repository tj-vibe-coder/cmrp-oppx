UPDATE dashboard_snapshots
SET
  total_opportunities = 437,
  submitted_count = 277,
  submitted_amount = 1137314289.02,
  op100_count = 43,
  op100_amount = 60762645.78,
  op90_count = 31,
  op90_amount = 76234908.35,
  op60_count = 38,
  op60_amount = 152787417.97,
  op30_count = 118,
  op30_amount = 792470660.04,
  lost_count = 33,
  lost_amount = 59680431.10,
  inactive_count = 10,
  ongoing_count = 18,
  pending_count = 27,
  declined_count = 109,
  revised_count = 227
WHERE snapshot_type = 'weekly'; 