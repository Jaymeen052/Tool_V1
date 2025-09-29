'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DISEASES,
  meets150,
  nntPerYear,
  casesPreventedPerYear,
  qalyLossPerIncidentCase,
  dalyPerIncidentCase,
} from '@/lib/calc';

// Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

// ---------- formatters ----------
const fmtNum = (v: number | null | undefined, d = 2) => {
  if (v == null || !isFinite(v)) return '—';
  return v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
};
const fmtInt = (v: number | null | undefined) => {
  if (v == null || !isFinite(v)) return '—';
  return Math.round(v).toLocaleString();
};
const fmtMoney = (v: number | null | undefined) => {
  if (v == null || !isFinite(v)) return '—';
  return v.toLocaleString(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
};
const moneyTick = (v: number) =>
  v.toLocaleString(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

// compact money for on-bar labels (e.g., A$1.48M)
const fmtMoneyShort = (v: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'AUD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(v);

const ICER_THRESHOLD_AUD = 50000;

// small helpers
const toNum = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// palettes (inner ring / outer ring)
const palette = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#22c55e', '#14b8a6', '#f97316', '#a78bfa', '#84cc16', '#eab308',
];
const palette2 = [
  '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#86efac', '#5eead4', '#fb923c', '#c4b5fd', '#a3e635', '#fde047',
];

// group & sum helper
const groupSum = <T,>(items: T[], keyFn: (t: T) => string, valueFn: (t: T) => number) => {
  const m = new Map<string, number>();
  for (const it of items || []) {
    const k = (keyFn(it) || 'Unknown').trim() || 'Unknown';
    const v = Math.max(0, valueFn(it) || 0);
    if (v > 0) m.set(k, (m.get(k) || 0) + v);
  }
  return Array.from(m, ([name, value]) => ({ name, value }));
};

// tiny legend for ring labels
function LegendBlock({
  title,
  items,
  colors,
}: {
  title: string;
  items: { name: string; value: number }[];
  colors: string[];
}) {
  if (!items?.length) return null;
  return (
    <div className="text-xs">
      <div className="font-medium mb-1">{title}</div>
      <div className="flex flex-wrap gap-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span>{it.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OutputPage() {
  const router = useRouter();

  // program + cost inputs
  const [program, setProgram] = useState<any>(null);
  const [programCost, setProgramCost] = useState<string>(''); // AUD / year (total)
  const [costPerCase, setCostPerCase] = useState<string>(''); // AUD per incident case

  // load saved state
  useEffect(() => {
    try {
      const keys = ['programsPage', 'programForm', 'programs'];
      for (const k of keys) {
        const s = localStorage.getItem(k);
        if (s) { setProgram(JSON.parse(s)); break; }
      }
      const ce = localStorage.getItem('ceInputs_v2');
      if (ce) {
        const { programCost, costPerCase } = JSON.parse(ce);
        if (programCost != null) setProgramCost(String(programCost));
        if (costPerCase != null) setCostPerCase(String(costPerCase));
      }
    } catch { /* ignore */ }
  }, []);

  // enrolled & active calc (robust across shapes)
  const { enrolledParticipants, activeParticipants } = useMemo(() => {
    let enrolled = 0;
    let active = 0;

    if (!program) return { enrolledParticipants: 0, activeParticipants: 0 };

    if (program?.sportsEnabled && Array.isArray(program?.sports)) {
      for (const p of program.sports) {
        enrolled += toNum(p?.participants);
        if (meets150(toNum(p?.sessionsPerWeek), toNum(p?.minutesPerSession))) {
          active += toNum(p?.participants);
        }
      }
    }
    if (program?.paEnabled && Array.isArray(program?.pa)) {
      for (const p of program.pa) {
        const part = p?.mode === '1 on 1' ? 1 : toNum(p?.participants);
        enrolled += part;
        if (meets150(toNum(p?.sessionsPerWeek), toNum(p?.minutesPerSession))) {
          active += part;
        }
      }
    }

    // fallbacks
    enrolled = Math.max(enrolled, toNum(program?.enrolledParticipants), toNum(program?.participantsEnrolled));
    active   = Math.max(active,   toNum(program?.participantsMeeting150), toNum(program?.activeParticipants));

    return { enrolledParticipants: enrolled, activeParticipants: active };
  }, [program]);

  // per-disease rows
  const rows = useMemo(() => {
    return DISEASES.map((d) => {
      const prevented = casesPreventedPerYear(activeParticipants, d.p0, d.rrr);
      const nntClin = nntPerYear(d.p0, d.rrr);
      const qalyPerCase = (qalyLossPerIncidentCase(d) ?? 0);
      const dalyPerCase = (dalyPerIncidentCase(d) ?? 0);
      return {
        key: d.key,
        label: d.label,
        nntClin,
        programNNT: prevented > 0 ? enrolledParticipants / prevented : null,
        prevented,
        qalys: prevented * qalyPerCase,
        dalys: prevented * dalyPerCase,
        baselineCases: enrolledParticipants * (d.p0 ?? 0),
      };
    });
  }, [activeParticipants, enrolledParticipants]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.prevented += r.prevented;
        acc.qalys += r.qalys;
        acc.dalys += r.dalys;
        acc.baselineCases += r.baselineCases;
        return acc;
      },
      { prevented: 0, qalys: 0, dalys: 0, baselineCases: 0 }
    );
  }, [rows]);

  // CE math
  const withCasesTotal = Math.max(0, totals.baselineCases - totals.prevented);
  const progCostNum = Number(programCost) > 0 ? Number(programCost) : 0;
  const costPerCaseNum = Number(costPerCase) > 0 ? Number(costPerCase) : 0;

  const costWithout = totals.baselineCases * costPerCaseNum;
  const costWith    = withCasesTotal * costPerCaseNum + progCostNum;
  const deltaCost   = costWith - costWithout; // <0 ⇒ cost saving

  const icerQALY = totals.qalys > 0 ? deltaCost / totals.qalys : null;
  const icerDALY = totals.dalys > 0 ? deltaCost / totals.dalys : null;

  // --- Charts data (costs/ICER) ---
  const costCompareData = [
    { name: 'Without', value: Math.max(0, costWithout), color: '#94a3b8' }, // slate-400
    { name: 'With',    value: Math.max(0, costWith),    color: '#10b981' }, // emerald-500
  ];
  const icerBars = [
    ...(icerQALY != null ? [{ name: 'ICER $/QALY', value: icerQALY }] : []),
    ...(icerDALY != null ? [{ name: 'ICER $/DALY', value: icerDALY }] : []),
  ];

  // ensure threshold is visible on ICER chart
  const icerDomainMax = useMemo(() => {
    const dataMax = Math.max(0, ...icerBars.map(b => b.value || 0));
    return Math.max(ICER_THRESHOLD_AUD, dataMax) * 1.15; // add headroom
  }, [icerBars]);

  // --- Composition pies ---
  const sportsList = (program?.sportsEnabled && Array.isArray(program?.sports)) ? program.sports : [];
  const paList     = (program?.paEnabled     && Array.isArray(program?.pa))     ? program.pa     : [];

  const sportsByType = useMemo(
    () => groupSum(sportsList, (s: any) => s?.typeOfSport || s?.sport || s?.type || 'Sport', (s: any) => toNum(s?.participants)),
    [sportsList]
  );
  const sportsByLoc = useMemo(
    () => groupSum(sportsList, (s: any) => s?.location || 'Unknown', (s: any) => toNum(s?.participants)),
    [sportsList]
  );
  const paByName = useMemo(
    () => groupSum(paList, (p: any) => p?.programName || p?.name || 'Program',
                   (p: any) => (p?.mode === '1 on 1' ? 1 : toNum(p?.participants))),
    [paList]
  );
  const paByLoc = useMemo(
    () => groupSum(paList, (p: any) => p?.location || 'Unknown',
                   (p: any) => (p?.mode === '1 on 1' ? 1 : toNum(p?.participants))),
    [paList]
  );

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-[100vw] px-3 lg:px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/programs')}
            className="px-3 py-2 rounded-lg border hover:bg-slate-50"
          >
            ← Back to Programs
          </button>
          <h1 className="text-xl font-semibold">Results — Annual Impact</h1>
        </div>
        <div className="text-sm text-slate-600 tabular-nums">
          Enrolled: <b>{fmtInt(enrolledParticipants)}</b> &nbsp;|&nbsp; Active (≥150): <b>{fmtInt(activeParticipants)}</b>
        </div>
      </div>

      {/* Two-column layout: left stacks table + composition; right is sticky cost panel */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] items-start">
        {/* LEFT column */}
        <div className="flex flex-col gap-4">
          {/* Disease table */}
          <div className="rounded-2xl border bg-white overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b text-[13px] font-medium">
              Annual impact by disease
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full table-fixed text-[13px] tabular-nums">
                <colgroup>
                  <col className="w-[32%]" />
                  <col className="w-[13.6%]" />
                  <col className="w-[13.6%]" />
                  <col className="w-[13.6%]" />
                  <col className="w-[13.6%]" />
                  <col className="w-[13.6%]" />
                </colgroup>

                <thead className="text-slate-600">
                  <tr className="border-b">
                    <th className="text-left px-4 py-2">Disease</th>
                    <th className="text-right px-3 py-2">NNT (clinical)</th>
                    <th className="text-right px-3 py-2">Program NNT</th>
                    <th className="text-right px-3 py-2">Cases prevented / yr</th>
                    <th className="text-right px-3 py-2">QALYs gained / yr</th>
                    <th className="text-right px-3 py-2">DALYs avoided / yr</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-b">
                      <td className="px-4 py-2 truncate">{r.label}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(r.nntClin, 1)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(r.programNNT, 1)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(r.prevented, 2)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(r.qalys, 2)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(r.dalys, 2)}</td>
                    </tr>
                  ))}

                  <tr className="bg-slate-50 font-medium border-t">
                    <td className="px-4 py-2 text-right">Total</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">{fmtNum(totals.prevented, 2)}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(totals.qalys, 2)}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(totals.dalys, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Program composition (participants) with concentric donuts */}
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <h2 className="font-semibold">Program composition (participants)</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* SPORTS: inner = type, outer = location */}
              <div className="rounded-xl border p-3">
                <div className="text-sm font-medium mb-2">
                  Sports — <span className="text-slate-600">inner: type of sport</span>,{' '}
                  <span className="text-slate-600">outer: location</span>
                </div>
                <div className="h-64">
                  {(sportsByType.length || sportsByLoc.length) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip formatter={(v: any) => v.toLocaleString()} />
                        {/* Inner ring: type of sport */}
                        <Pie
                          data={sportsByType}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={70}
                          labelLine={false}
                          isAnimationActive={false}
                        >
                          {sportsByType.map((_, i) => (
                            <Cell key={i} fill={palette[i % palette.length]} />
                          ))}
                        </Pie>
                        {/* Outer ring: location */}
                        <Pie
                          data={sportsByLoc}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={78}
                          outerRadius={110}
                          labelLine={false}
                          // ******* FIX: coerce percent to number *******
                          label={({ name, percent }: any) =>
                            `${name} ${Math.round(Number(percent ?? 0) * 100)}%`
                          }
                          isAnimationActive={false}
                        >
                          {sportsByLoc.map((_, i) => (
                            <Cell key={i} fill={palette2[i % palette2.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full grid place-items-center text-slate-500 text-sm">No data yet</div>
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-2 mt-2">
                  <LegendBlock title="Type of sport (inner)" items={sportsByType} colors={palette} />
                  <LegendBlock title="Location (outer)" items={sportsByLoc} colors={palette2} />
                </div>
              </div>

              {/* PA: inner = program name, outer = location */}
              <div className="rounded-xl border p-3">
                <div className="text-sm font-medium mb-2">
                  PA — <span className="text-slate-600">inner: program name</span>,{' '}
                  <span className="text-slate-600">outer: location</span>
                </div>
                <div className="h-64">
                  {(paByName.length || paByLoc.length) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip formatter={(v: any) => v.toLocaleString()} />
                        {/* Inner ring: program name */}
                        <Pie
                          data={paByName}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={70}
                          labelLine={false}
                          isAnimationActive={false}
                        >
                          {paByName.map((_, i) => (
                            <Cell key={i} fill={palette[i % palette.length]} />
                          ))}
                        </Pie>
                        {/* Outer ring: location */}
                        <Pie
                          data={paByLoc}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={78}
                          outerRadius={110}
                          labelLine={false}
                          // ******* FIX: coerce percent to number *******
                          label={({ name, percent }: any) =>
                            `${name} ${Math.round(Number(percent ?? 0) * 100)}%`
                          }
                          isAnimationActive={false}
                        >
                          {paByLoc.map((_, i) => (
                            <Cell key={i} fill={palette2[i % palette2.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full grid place-items-center text-slate-500 text-sm">No data yet</div>
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-2 mt-2">
                  <LegendBlock title="Program name (inner)" items={paByName} colors={palette} />
                  <LegendBlock title="Location (outer)" items={paByLoc} colors={palette2} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: cost-effectiveness (charts) */}
        <div className="rounded-2xl border bg-white p-4 space-y-4 lg:sticky lg:top-4 h-fit">
          <div className="space-y-1">
            <h2 className="font-semibold">Cost & ICER (annual)</h2>
            <p className="text-sm text-slate-600">
              Enter <b>program cost</b> and <b>treatment cost per incident case</b>.
              Charts compare <i>Without</i> vs <i>With</i> and show ICERs for QALY/DALY.
            </p>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Program cost (AUD / year)</span>
              <input
                className="border rounded-lg p-2"
                placeholder="e.g., 250000"
                inputMode="decimal"
                value={programCost}
                onChange={(e) => setProgramCost(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Treatment cost per case (AUD)</span>
              <input
                className="border rounded-lg p-2"
                placeholder="e.g., 1500"
                inputMode="decimal"
                value={costPerCase}
                onChange={(e) => setCostPerCase(e.target.value)}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() =>
                  localStorage.setItem('ceInputs_v2', JSON.stringify({
                    programCost: Number(programCost) || 0,
                    costPerCase: Number(costPerCase) || 0
                  }))
                }
                className="px-4 py-2 rounded-lg border hover:bg-slate-50"
                title="Save inputs locally"
              >
                Save cost inputs
              </button>
            </div>
          </div>

          {/* Quick counters */}
          <div className="grid grid-cols-2 gap-3 text-sm tabular-nums">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-slate-500">Baseline cases (without)</div>
              <div className="font-semibold">{fmtNum(totals.baselineCases, 2)}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-slate-500">Cases with program</div>
              <div className="font-semibold">{fmtNum(Math.max(0, totals.baselineCases - totals.prevented), 2)}</div>
            </div>
          </div>

          {/* COST COMPARISON BAR CHART */}
          <div className="rounded-xl border overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 font-medium">Costs — Without vs With</div>
            <div className="h-56 px-2 pb-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={costCompareData}
                  margin={{ top: 8, right: 48, left: 12, bottom: 8 }}  // more right margin
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={moneyTick} />
                  <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                  <ReferenceLine y={0} stroke="#9ca3af" />
                  <Bar dataKey="value">
                    {costCompareData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="top"
                      offset={8}
                      formatter={(v: any) => fmtMoneyShort(Number(v))} // compact labels
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ICER BARS */}
          <div className="rounded-xl border overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 font-medium">ICER ($/QALY & $/DALY)</div>
            <div className="h-44 px-2 pb-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={icerBars}
                  layout="vertical"
                  margin={{ top: 8, right: 56, left: 12, bottom: 8 }} // more right margin
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={moneyTick}
                    domain={[0, icerDomainMax]} // ensure threshold visible
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={88} // a little more space for category labels
                  />
                  <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                  <ReferenceLine x={0} stroke="#9ca3af" />
                  <ReferenceLine
                    x={ICER_THRESHOLD_AUD}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                  />
                  <Bar dataKey="value" fill="#3b82f6">
                    <LabelList
                      dataKey="value"
                      position="right"
                      offset={10}
                      formatter={(v: any) => fmtMoney(Number(v))}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-xs text-slate-500">Threshold line marks {fmtMoney(ICER_THRESHOLD_AUD)}.</p>
        </div>
      </div>
    </div>
  );
}
