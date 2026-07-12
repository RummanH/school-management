export const SCHOOL_PHONE = '+880 1700-000000';
export const SCHOOL_EMAIL = 'info@greenfieldacademy.edu.bd';
export const SCHOOL_ADDRESS = '123 Academy Road, Dhaka 1200, Bangladesh';
export const SCHOOL_FB = 'https://facebook.com/greenfieldacademy';
export const SCHOOL_YT = 'https://youtube.com/@greenfieldacademy';

export const STATS = [
  { key: 'students', value: 2400 },
  { key: 'teachers', value: 80 },
  { key: 'departments', value: 6 },
  { key: 'yearsOfExcellence', value: 27 },
];

export const DEPARTMENTS = [
  { key: 'primaryTitle', descKey: 'primaryDesc', icon: '🎒' },
  { key: 'juniorTitle', descKey: 'juniorDesc', icon: '📚' },
  { key: 'secondaryTitle', descKey: 'secondaryDesc', icon: '🔬' },
  { key: 'higherTitle', descKey: 'higherDesc', icon: '🎓' },
];

export const ADMISSION_DOCS = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'];

// Shared accent-tint rotation for icon badges across the landing page —
// keeps the brand green as the dominant color while giving feature/info
// cards some visual variety. Same rotation pattern already used elsewhere
// in the app (e.g. RoutineTab's DAY_COLORS, ResultsTab's GRADE_COLORS).
export const ACCENT_COLORS = [
  { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { bg: 'bg-blue-50',    text: 'text-blue-600' },
  { bg: 'bg-amber-50',   text: 'text-amber-600' },
  { bg: 'bg-purple-50',  text: 'text-purple-600' },
];

// Every site folder (frontend/public/images/sites/<slug>/...) uses the same
// relative filenames as greenfield-academy — swapping schools is just
// swapping which folder these paths point into, not renaming anything.
export function siteImage(siteSlug, relativePath) {
  return `/images/sites/${siteSlug}/${relativePath}`;
}

export const WHY_CHOOSE_US = [
  { key: 'facultyTitle', descKey: 'facultyDesc', icon: '👩‍🏫' },
  { key: 'curriculumTitle', descKey: 'curriculumDesc', icon: '📘' },
  { key: 'campusTitle', descKey: 'campusDesc', icon: '🛡️' },
  { key: 'portalTitle', descKey: 'portalDesc', icon: '💻' },
];
