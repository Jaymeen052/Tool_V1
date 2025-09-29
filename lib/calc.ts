// lib/calc.ts — NNT, Cases, QALY, DALY for the manager’s 8-disease list (AU-anchored defaults)
//
// Formulas (annual):
//  - NNT (clinical) = 1 / (p0 × rrr)
//  - Cases prevented = Active × p0 × rrr
//  - DALY per case = YLL + YLD = (caseFatality × lifeYearsLostIfDeath) + (dw × durationYears)
//  - QALY loss per case = (dw × durationYears) + (caseFatality × backgroundUtility × lifeYearsLostIfDeath)
// Notes:
//  - p0 are annual baseline risks (per person)
//  - rrr is the relative risk reduction at ≥150 min/wk
//  - Defaults below are conservative, Australia-anchored (GBD DWs + AIHW/registry patterns)

export type DiseaseParam = {
  key: string;
  label: string;

  // For NNT / cases prevented
  p0: number | null;   // annual risk per person
  rrr: number | null;  // relative risk reduction at ≥150 min/wk

  // For QALY/DALY per incident case
  dw: number | null;                 // disability weight (GBD-style)
  durationYears: number | null;      // average years with disability
  caseFatality: number | null;       // probability incident case is fatal (over the above horizon)
  lifeYearsLostIfDeath: number | null; // expected remaining life-years if fatal
  backgroundUtility?: number | null; // population utility for remaining life (≈0.85–0.90)
};

// ---------------- Manager’s disease list ----------------
export const DISEASES: DiseaseParam[] = [
  // 1) Coronary heart disease
  { key: 'chd', label: 'Coronary heart disease',
    p0: 0.0035, rrr: 0.25,
    dw: 0.073, durationYears: 1.0, caseFatality: 0.12, lifeYearsLostIfDeath: 10, backgroundUtility: 0.88,
  },

  // 2) Stroke
  { key: 'stroke', label: 'Stroke',
    p0: 0.0013, rrr: 0.20,
    dw: 0.266, durationYears: 5.0, caseFatality: 0.20, lifeYearsLostIfDeath: 8, backgroundUtility: 0.88,
  },

  // 3) Diabetes (predominantly Type 2)
  { key: 'diabetes', label: 'Diabetes',
    p0: 0.0040, rrr: 0.30,
    dw: 0.07, durationYears: 10.0, caseFatality: 0.00, lifeYearsLostIfDeath: 0, backgroundUtility: 0.88,
  },

  // 4) Arthritis & related disorders (chronic, non-fatal)
  { key: 'arthritis', label: 'Arthritis and related disorders',
    p0: 0.0100, rrr: 0.15,
    dw: 0.079, durationYears: 5.0, caseFatality: 0.00, lifeYearsLostIfDeath: 0, backgroundUtility: 0.88,
  },

  // 5) Back pain & problems (episodic)
  { key: 'backpain', label: 'Back pain and problems',
    p0: 0.0500, rrr: 0.15,
    dw: 0.114, durationYears: 0.5, caseFatality: 0.00, lifeYearsLostIfDeath: 0, backgroundUtility: 0.88,
  },

  // 6) Osteoporosis (fracture proxy)
  { key: 'osteoporosis', label: 'Osteoporosis',
    p0: 0.0050, rrr: 0.15,
    dw: 0.30, durationYears: 1.0, caseFatality: 0.15, lifeYearsLostIfDeath: 5, backgroundUtility: 0.88,
  },

  // 7) Asthma (chronic, mostly non-fatal improvement)
  { key: 'asthma', label: 'Asthma',
    p0: 0.0100, rrr: 0.10,
    dw: 0.050, durationYears: 1.0, caseFatality: 0.00, lifeYearsLostIfDeath: 0, backgroundUtility: 0.88,
  },

  // 8) Emphysema (COPD)
  { key: 'emphysema', label: 'Emphysema',
    p0: 0.0030, rrr: 0.10,
    dw: 0.168, durationYears: 5.0, caseFatality: 0.05, lifeYearsLostIfDeath: 5, backgroundUtility: 0.88,
  },
];

// ---------------- Core helpers used by the UI ----------------

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
  return participantsActive * (p0 ?? 0) * (rrr ?? 0) * (adherence ?? 1);
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
