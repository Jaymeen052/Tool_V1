'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DISEASES,
  meets150,
  nntPerYear,
  casesPreventedPerYear,
  qalysGainedPerYear_fromParams,
  dalysAvoidedPerYear_fromParams,
} from '@/lib/calc';

type ProgramsState = {
  sportsEnabled: boolean;
  sports: Array<{ participants: number; sessionsPerWeek: number; minutesPerSession: number; }>;
  paEnabled: boolean;
  pa: Array<{ mode: ''|'Group'|'1 on 1'; participants: number; sessionsPerWeek: number; minutesPerSession: number; }>;
  inclusiveEnabled: boolean;
  schoolParticipantsDisability: number;
  specialNeedsParticipants: number;
};

const fmt = (x: number | null | undefined, digits = 2) => {
  if (x === null || x === undefined || Number.isNaN(x)) return 'TBD';
  if (!isFinite(x)) return '—';
  const d = Math.abs(x - Math.round(x)) < 1e-9 ? 0 : digits;
  return x.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
};

export default function OutputPage() {
  const router = useRouter();
  const [prog, setProg] = useState<ProgramsState | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('programsPage');
      if (saved) setProg(JSON.parse(saved));
    } catch { setProg(null); }
  }, []);

  // Compute enrolled and active
  const { enrolledParticipants, activeParticipants } = useMemo(() => {
    if (!prog) return { enrolledParticipants: 0, activeParticipants: 0 };

    const sportsEnrolled = prog.sportsEnabled
      ? prog.sports.reduce((t, p) => t + (p.participants || 0), 0)
      : 0;

    const paEnrolled = prog.paEnabled
      ? prog.pa.reduce((t, p) => t + (p.mode === '1 on 1' ? 1 : (p.participants || 0)), 0)
      : 0;

    const sportsActive = prog.sportsEnabled
      ? prog.sports.reduce((t, p) => t + (meets150(p.sessionsPerWeek, p.minutesPerSession) ? (p.participants || 0) : 0), 0)
      : 0;

    const paActive = prog.paEnabled
      ? prog.pa.reduce((t, p) => {
          if (!meets150(p.sessionsPerWeek, p.minutesPerSession)) return t;
          return t + (p.mode === '1 on 1' ? 1 : (p.participants || 0));
        }, 0)
      : 0;

    return {
      enrolledParticipants: sportsEnrolled + paEnrolled,
      activeParticipants: sportsActive + paActive,
    };
  }, [prog]);

  // Totals (sum across diseases)
  const totals = useMemo(() => {
    let totalPrevented = 0;
    let totalQALY = 0;
    let totalDALY = 0;

    for (const d of DISEASES) {
      const prevented = casesPreventedPerYear(activeParticipants, d.p0, d.rrr);
      const qaly = qalysGainedPerYear_fromParams(activeParticipants, d.p0, d.rrr, d /* discountRate=0 */);
      const daly = dalysAvoidedPerYear_fromParams(activeParticipants, d.p0, d.rrr, d /* discountRate=0 */);
      totalPrevented += prevented || 0;
      totalQALY += qaly || 0;
      totalDALY += daly || 0;
    }
    return { totalPrevented, totalQALY, totalDALY };
  }, [activeParticipants]);

  return (
    <div className="space-y-6">
      {/* Header with back button (client-side; preserves values) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/programs')}
            className="px-3 py-2 rounded-lg border hover:bg-slate-50"
            title="Back to Programs (values are preserved)"
          >
            ← Back to Programs
          </button>
          <h1 className="text-xl font-semibold">Results — Annual Impact</h1>
        </div>
        <div className="text-sm text-slate-600">
          Enrolled: <b>{enrolledParticipants}</b> &nbsp;|&nbsp; Active (≥150): <b>{activeParticipants}</b>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Disease</th>
              <th className="text-right px-4 py-3">NNT (clinical)</th>
              <th className="text-right px-4 py-3">Program NNT</th>
              <th className="text-right px-4 py-3">Cases prevented / yr</th>
              <th className="text-right px-4 py-3">QALYs gained / yr</th>
              <th className="text-right px-4 py-3">DALYs avoided / yr</th>
            </tr>
          </thead>
          <tbody>
            {DISEASES.map(d => {
              const clinicalNNT = nntPerYear(d.p0, d.rrr);
              const prevented = casesPreventedPerYear(activeParticipants, d.p0, d.rrr);
              const programNNT = prevented && prevented > 0 ? enrolledParticipants / prevented : null;
              const qalys = qalysGainedPerYear_fromParams(activeParticipants, d.p0, d.rrr, d);
              const dalys = dalysAvoidedPerYear_fromParams(activeParticipants, d.p0, d.rrr, d);
              return (
                <tr key={d.key} className="border-t">
                  <td className="px-4 py-3">{d.label}</td>
                  <td className="px-4 py-3 text-right">{fmt(clinicalNNT, 1)}</td>
                  <td className="px-4 py-3 text-right">{fmt(programNNT, 1)}</td>
                  <td className="px-4 py-3 text-right">{fmt(prevented, 2)}</td>
                  <td className="px-4 py-3 text-right">{fmt(qalys, 2)}</td>
                  <td className="px-4 py-3 text-right">{fmt(dalys, 2)}</td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr className="border-t bg-slate-50 font-medium">
              <td className="px-4 py-3 text-right">Total</td>
              <td className="px-4 py-3 text-right">—</td>
              <td className="px-4 py-3 text-right">—</td>
              <td className="px-4 py-3 text-right">{fmt(totals.totalPrevented, 2)}</td>
              <td className="px-4 py-3 text-right">{fmt(totals.totalQALY, 2)}</td>
              <td className="px-4 py-3 text-right">{fmt(totals.totalDALY, 2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        NNT (clinical) = 1 / (p0 × RRR). Program NNT = Enrolled / CasesPrevented.
        CasesPrevented = Active × p0 × RRR. QALYs/DALYs are computed from standard burden parameters
        (DW, duration, case fatality, life-years lost). Set those in <code>lib/calc.ts</code>.
      </p>
    </div>
  );
}
