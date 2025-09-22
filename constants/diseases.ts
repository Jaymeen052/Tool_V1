import { DiseaseRow } from '../lib/calc';

export const DISEASES: DiseaseRow[] = [
  { name: 'Coronary heart disease',      incidence_disability: 0.0035, rr_at_150: 0.75, confidence: 'high' },
  { name: 'Stroke',                       incidence_disability: 0.0013, rr_at_150: 0.80, confidence: 'high' },
  { name: 'Type 2 diabetes',              incidence_disability: 0.0040, rr_at_150: 0.70, confidence: 'high' },
  { name: 'Arthritis & related disorders',incidence_disability: 0.0100, rr_at_150: 0.85, confidence: 'low'  },
  { name: 'Back pain & problems',         incidence_disability: 0.0500, rr_at_150: 0.85, confidence: 'low'  },
  { name: 'Osteoporosis (fracture proxy)',incidence_disability: 0.0050, rr_at_150: 0.85, confidence: 'low'  },
  { name: 'Asthma',                       incidence_disability: 0.0100, rr_at_150: 0.90, confidence: 'low'  },
  { name: 'Emphysema (COPD)',             incidence_disability: 0.0030, rr_at_150: 0.90, confidence: 'low'  },
];
