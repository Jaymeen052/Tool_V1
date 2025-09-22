// lib/calc.ts — AU disease parameters + helpers
// p0 = annual baseline risk (probability per person per year)
// RRR = relative risk reduction when meeting ~150 min/week PA

export type DiseaseParam = {
  key: string;
  label: string;
  p0: number | null;
  rrr: number | null;
};

export const DISEASES: DiseaseParam[] = [
  // Keep/adjust these placeholders if you’ve got better AU-local values elsewhere:
  { key: 't2d',    label: 'Type 2 Diabetes',                  p0: 0.0040,  rrr: 0.30 },
  { key: 'chd',    label: 'Coronary Heart Disease',           p0: 0.0035,  rrr: 0.25 },
  { key: 'stroke', label: 'Cerebrovascular disease (Stroke)', p0: 0.0013,  rrr: 0.20 },
  { key: 'hipfx',  label: 'Hip fracture',                     p0: 0.0050,  rrr: 0.15 },

  // Filled with AU-focused evidence / best estimates:
  {
    key: 'breast',
    label: 'Breast Cancer',
    p0: 0.00078,  // ~78 per 100,000 persons
    rrr: 0.20,    // ~20% lower risk with regular PA
  },
  {
    key: 'crc',
    label: 'Colorectal Cancer',
    p0: 0.00057,  // ~57 per 100,000 persons
    rrr: 0.29,    // HR ~0.71 (≈29% reduction) at higher recreational PA
  },
  {
    key: 'dementia',
    label: 'Dementia (65+)',
    p0: 0.0168,   // ~16.8 per 1,000 PY among ≥65
    rrr: 0.20,    // pooled estimate
  },
  {
    key: 'depress',
    label: 'Depression (Depressive Episode)',
    p0: 0.049,    // 12-month prevalence used as proxy
    rrr: 0.25,    // ~25% lower incident depression near guideline volume
  },
];

// --- helpers used by the UI ---

export function meets150(sessionsPerWeek: number, minutesPerSession: number): boolean {
  return Number(sessionsPerWeek) > 0 &&
         Number(minutesPerSession) > 0 &&
         sessionsPerWeek * minutesPerSession >= 150;
}

export function nntPerYear(p0: number | null, rrr: number | null): number | null {
  if (!p0 || !rrr || p0 <= 0 || rrr <= 0) return null;
  return 1 / (p0 * rrr);
}

export function casesPreventedPerYear(
  participantsActive: number,
  p0: number | null,
  rrr: number | null,
  adherence = 1,
): number {
  if (!participantsActive || !p0 || !rrr || p0 <= 0 || rrr <= 0) return 0;
  return participantsActive * p0 * rrr * (adherence ?? 1);
}
