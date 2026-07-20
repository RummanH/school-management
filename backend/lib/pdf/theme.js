// Matches frontend/src/index.css --brand / --brand-strong so generated PDFs
// look like the same product as the in-app print preview, not a different tool.
export const THEME = {
  brand: '#201b46',
  brandStrong: '#161233',
  brandSoft: '#eeecf6',
  ink: '#1e293b',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  paper: '#ffffff',
  success: '#059669',
  successSoft: '#ecfdf5',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  warning: '#b45309',
  warningSoft: '#fffbeb',
};

export const FONT = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  oblique: 'Helvetica-Oblique',
};

export function gradeColor(grade) {
  if (['A+', 'A', 'A-'].includes(grade)) return THEME.success;
  if (['B', 'C'].includes(grade)) return THEME.warning;
  if (['D', 'F'].includes(grade)) return THEME.danger;
  return THEME.ink;
}
