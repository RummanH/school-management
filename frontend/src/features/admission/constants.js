export const STATUS_LABELS = {
  submitted:      'Submitted',
  under_review:   'Under Review',
  test_scheduled: 'Test Scheduled',
  accepted:       'Accepted',
  rejected:       'Rejected',
};

export const STATUS_COLORS = {
  submitted:      'bg-slate-100 text-slate-600',
  under_review:   'bg-amber-100 text-amber-700',
  test_scheduled: 'bg-blue-100 text-blue-700',
  accepted:       'bg-emerald-100 text-emerald-700',
  rejected:       'bg-red-100 text-red-600',
};

export const STATUS_VALUES = Object.keys(STATUS_LABELS);
