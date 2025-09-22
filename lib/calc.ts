// lib/calc.ts — Standard QALY/DALY + NNT helpers (AU-anchored defaults)
// NNT/Cases: p0 = annual baseline risk; rrr = risk reduction at ≥150 min/wk.
// DALY per case = YLL + YLD = (caseFatality × lifeYearsLostIfDeath) + (dw × durationYears)
// QALY loss per case = (dw × durationYears) + (caseFatality × backgroundUtility × lifeYearsLostIfDeath)

export type DiseaseParam = {
  key: string;
  label: string;

  // Risk & effect (for NNT / cases prevented)
  p0: number | null;   // annual risk per person
  rrr: number | null;  // relative risk reduction at ≥150 min/wk

  // Burden inputs
  dw: number | null;                 // disability weight
  durationYears: number | null;      // average years with disability
  caseFatality: number | null;       // probability an incident case is fatal (over the horizon above)
  lifeYearsLostIfDeath: number | null; // remaining LE if fatal (years)
  backgroundUtility?: number | null; // average QoL for remaining life (≈0.85–0.90)
};

// AU-oriented defaults so outputs are populated now (can refine later)
export const DISEASES: DiseaseParam[] = [
  { key: 't2d',    label: 'Type 2 Diabetes',                  p0: 0.0040, rrr: 0.30, dw: 0.07,  durationYears: 10.0, caseFatality: 0.00, lifeYearsLostIfDeath: 0,  backgroundUtility: 0.88 },
  { key: 'chd',    label: 'Coronary Heart Disease (acute coronary event)', p0: 0.0035, rrr: 0.25, dw: 0.073, durationYears: 1.0,  caseFatality: 0.12, lifeYearsLostIfDeath: 10, backgroundUtility: 0.88 },
  { key: 'stroke', label: 'Cerebrovascular disease (Stroke)',  p0: 0.0013, rrr: 0.20, dw: 0.266, durationYears: 5.0,  caseFatality: 0.20, lifeYearsLostIfDeath: 8,  backgroundUtility: 0.88 },
  { key: 'hipfx',  label: 'Hip fracture (45+)',                p0: 0.0050, rrr: 0.15, dw: 0.30,  durationYears: 1.0,  caseFatality: 0.25, lifeYearsLostIfDeath: 5,  backgroundUtility: 0.88 },
  { key: 'breast', label: 'Breast Cancer',                     p0: 0.00078,rrr: 0.20, dw: 0.288, durationYears: 1.0,  caseFatality: 0.077,lifeYearsLostIfDeath: 12, backgroundUtility: 0.88 },
  { key: 'crc',    label: 'Colorectal Cancer',                 p0: 0.00057,rrr: 0.29, dw: 0.288, durationYears: 1.0,  caseFatality: 0.296,lifeYearsLostIfDeath: 12, backgroundUtility: 0.88 },
  { key: 'dementia', label: 'Dementia (65+)',                  p0: 0.0168, rrr: 0.20, dw: 0.40,  durationYears: 5.0,  caseFatality: 0.60, lifeYearsLostIfDeath: 5,  backgroundUtility: 0.88 },
  { key: 'depress', label: 'Depression (episode, adult)',      p0: 0.049,  rrr: 0.25, dw: 0.20,  durationYears: 0.5,  caseFatality: 0.00, lifeYearsLostIfDeath: 0,  backgroundUtility: 0.88 },
];

// --------- helpers used by the UI (unchanged for your table layout) ---------

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

// ---- per-case burden (no discounting; ABDS/GBD base case) ----

export function dalyPerIncidentCase(d: DiseaseParam): number | null {
  if (d.dw == null || d.durationYears == null) return null;
  const yld = d.dw * d.durationYears;
  const yll = (d.caseFatality ?? 0) * (d.lifeYearsLostIfDeath ?? 0);
  return yld + yll;
}

export function qalyLossPerIncidentCase(d: DiseaseParam): number | null {
  if (d.dw == null || d.durationYears == null) return null;
  const U = d.backgroundUtility ?? 0.88;
  const morbidity = d.dw * d.durationYears;
  const fatal = (d.caseFatality ?? 0) * (d.lifeYearsLostIfDeath ?? 0) * U;
  return morbidity + fatal;
}

// ---- annual totals from active participants ----

export function qalysGainedPerYear_fromParams(
  active: number,
  p0: number | null,
  rrr: number | null,
  d: DiseaseParam
): number {
  const prevented = casesPreventedPerYear(active, p0, rrr);
  const perCase = qalyLossPerIncidentCase(d) ?? 0;
  return prevented * perCase;
}

export function dalysAvoidedPerYear_fromParams(
  active: number,
  p0: number | null,
  rrr: number | null,
  d: DiseaseParam
): number {
  const prevented = casesPreventedPerYear(active, p0, rrr);
  const perCase = dalyPerIncidentCase(d) ?? 0;
  return prevented * perCase;
}
