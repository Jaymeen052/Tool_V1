// constants/diseases.ts
// Adapter: align to lib/calc schema so TypeScript & build pass.

import type { DiseaseParam } from '../lib/calc';

// If other files previously imported a type called DiseaseRow,
// provide a compatible alias so they don't break:
export type DiseaseRow = DiseaseParam;

export const DISEASES: DiseaseParam[] = [
  { key: 'chd',      label: 'Coronary heart disease',               p0: 0.0035, rrr: 0.25 }, // rr 0.75 -> rrr 0.25
  { key: 'stroke',   label: 'Stroke',                                p0: 0.0013, rrr: 0.20 }, // rr 0.80 -> rrr 0.20
  { key: 't2d',      label: 'Type 2 diabetes',                       p0: 0.0040, rrr: 0.30 }, // rr 0.70 -> rrr 0.30
  { key: 'arthritis',label: 'Arthritis & related disorders',         p0: 0.0100, rrr: 0.15 }, // rr 0.85 -> rrr 0.15
  { key: 'backpain', label: 'Back pain & problems',                  p0: 0.0500, rrr: 0.15 }, // rr 0.85 -> rrr 0.15
  { key: 'hipfx',    label: 'Osteoporosis (fracture proxy)',         p0: 0.0050, rrr: 0.15 }, // rr 0.85 -> rrr 0.15
  { key: 'asthma',   label: 'Asthma',                                p0: 0.0100, rrr: 0.10 }, // rr 0.90 -> rrr 0.10
  { key: 'copd',     label: 'Emphysema (COPD)',                      p0: 0.0030, rrr: 0.10 }, // rr 0.90 -> rrr 0.10
];
