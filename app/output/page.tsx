'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DISEASES, meets150, nntPerYear, casesPreventedPerYear,
  qalyLossPerIncidentCase, dalyPerIncidentCase,
  QALY_VALUE_AUD, QALY_VALUE_AUD_RANGE, monetisedBenefitFromQALYs,
} from '@/lib/calc';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell, PieChart, Pie
} from '@/components/RechartsClient';

import PdfCapture from '@/components/PdfCapture'; // (kept import; not used)
import Image from 'next/image';
import { readJSON } from '@/lib/browserStorage';

export const dynamic = 'force-dynamic';

/* ---------------- Methods/Definitions (as images) ---------------- */
const METHODS_IMAGES: string[] = ['/docs/Information-and-Defination-table.png'];

/* ---------------- helpers / formatters ---------------- */
const fmtNum = (v: number | null | undefined, d = 2) =>
  v == null || !isFinite(v) ? '—' :
  v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtInt = (v: number | null | undefined) =>
  v == null || !isFinite(v) ? '—' : Math.round(v).toLocaleString();
const fmtMoney = (v: number | null | undefined) =>
  v == null || !isFinite(v) ? '—' :
  v.toLocaleString(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
const moneyTick = (v: number) =>
  v.toLocaleString(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
const fmtMoneyShort = (v: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD', notation: 'compact', maximumFractionDigits: 2 }).format(v);
const toNum = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// palettes
const palette  = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#14b8a6', '#f97316', '#a78bfa', '#84cc16', '#eab308'];
const palette2 = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#86efac', '#5eead4', '#fb923c', '#c4b5fd', '#a3e635', '#fde047'];

const PIE_LABEL_MARGIN = 160;

// group & sum
const groupSum = <T,>(items: T[], keyFn: (t: T) => string, valueFn: (t: T) => number) => {
  const m = new Map<string, number>();
  for (const it of items || []) {
    const k = (keyFn(it) || 'Unknown').trim() || 'Unknown';
    const v = Math.max(0, valueFn(it) || 0);
    if (v > 0) m.set(k, (m.get(k) || 0) + v);
  }
  return Array.from(m, ([name, value]) => ({ name, value }));
};

const renderOutsideLabel =
  (minPct = 0.08, maxNameLen = 18, offset = 16) =>
  (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent, name } = props;
    const p = Number(percent ?? 0);
    if (p < minPct) return null;
    const RAD = Math.PI / 180;
    const r = (outerRadius ?? 0) + offset;
    let x = (cx ?? 0) + r * Math.cos(-midAngle * RAD);
    let y = (cy ?? 0) + r * Math.sin(-midAngle * RAD);
    const MIN_X = 10;
    if (x < MIN_X) x = MIN_X;
    const anchor = x > (cx ?? 0) ? 'start' : 'end';
    const label = String(name ?? '');
    const short = label.length > maxNameLen ? label.slice(0, maxNameLen - 1) + '…' : label;
    return (
      <text x={x} y={y} fill="#0891b2" fontSize={12} textAnchor={anchor} dominantBaseline="central">
        {`${short} ${Math.round(p * 100)}%`}
      </text>
    );
  };

/* Small inline illustration so we don’t rely on external images */
function InclusionArt() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full">
      <defs>
        <linearGradient id="g1" x1="0" x2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#dcfce7" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="160" height="120" fill="url(#g1)" />
      {/* school */}
      <rect x="12" y="50" width="44" height="32" rx="3" fill="#38bdf8" opacity=".25" />
      <polygon points="12,50 34,36 56,50" fill="#38bdf8" opacity=".3" />
      <rect x="24" y="60" width="8" height="10" fill="#38bdf8" opacity=".5" />
      <rect x="40" y="60" width="8" height="10" fill="#38bdf8" opacity=".5" />
      {/* people */}
      <circle cx="92" cy="54" r="8" fill="#10b981" />
      <rect x="84" y="64" width="16" height="18" rx="3" fill="#10b981" opacity=".7" />
      <circle cx="120" cy="56" r="7" fill="#f59e0b" />
      <rect x="113" y="64" width="14" height="18" rx="3" fill="#f59e0b" opacity=".7" />
      {/* simple wheelchair */}
      <circle cx="136" cy="86" r="10" stroke="#64748b" strokeWidth="3" fill="none" />
      <line x1="128" y1="75" x2="136" y2="86" stroke="#64748b" strokeWidth="3" />
      <line x1="122" y1="88" x2="132" y2="88" stroke="#64748b" strokeWidth="3" />
    </svg>
  );
}

function LegendBlock({
  title, items, colors,
}: { title: string; items: { name: string; value: number }[]; colors: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="text-xs">
      <div className="font-medium mb-1">{title}</div>
      <div className="flex flex-wrap gap-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
            <span>{it.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
// ------- flexible numeric pickers for inclusive-programs -------
const isNum = (v: any) => Number.isFinite(Number(v));
const asNum = (v: any) => Number(v);

const deepGet = (obj: any, path: string) =>
  path.split('.').reduce((o, k) => (o ? (o as any)[k] : undefined), obj);

const pickNumber = (obj: any, ...paths: string[]) => {
  for (const p of paths) {
    const v = deepGet(obj, p);
    if (isNum(v)) return asNum(v);
  }
  return undefined;
};

/** breadth-first scan by token(s) in key names (case-insensitive) */
const scanFor = (obj: any, tokens: string[]) => {
  if (!obj) return undefined;
  const want = tokens.map((t) => t.toLowerCase());
  const q: any[] = [obj];
  while (q.length) {
    const cur = q.shift();
    if (Array.isArray(cur)) { q.push(...cur); continue; }
    if (cur && typeof cur === 'object') {
      for (const [k, v] of Object.entries(cur)) {
        const key = k.toLowerCase();
        const hit = want.every((t) => key.includes(t));
        if (hit && isNum(v)) return asNum(v);
        if (v && typeof v === 'object') q.push(v);
      }
    }
  }
  return undefined;
};

const firstNum = (...vals: (number | undefined)[]) => {
  for (const v of vals) if (isNum(v)) return asNum(v);
  return 0;
};


export default function OutputPage() {
  const router = useRouter();

  const [program, setProgram] = useState<any>(null);
  const [showDoc, setShowDoc] = useState(false);

  // image viewer state
  const [page, setPage] = useState(0);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const effectiveScale = baseScale * zoom;

  useEffect(() => {
    const keys = ['programsPage', 'programForm', 'programs'];
    for (const k of keys) {
      const obj = readJSON(k);
      if (obj) { setProgram(obj); return; }
    }
  }, []);

  useEffect(() => {
    if (!showDoc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDoc(false);
      if (e.key === 'ArrowRight') setPage(p => Math.min(p + 1, METHODS_IMAGES.length - 1));
      if (e.key === 'ArrowLeft')  setPage(p => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDoc]);

  const computeFitScale = () => {
    const box = viewerRef.current;
    const img = imgRef.current;
    if (!box || !img) return;
    const fit = Math.min((box.clientWidth || 1) / (img.naturalWidth || 1), (box.clientHeight || 1) / (img.naturalHeight || 1));
    setBaseScale(fit);
    setZoom(1);
  };

  useEffect(() => {
    if (!showDoc) return;
    requestAnimationFrame(() => computeFitScale());
    const onResize = () => computeFitScale();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [showDoc, page]);

  // enrolled & active
  const { enrolledParticipants, activeParticipants } = useMemo(() => {
    let enrolled = 0, active = 0;
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
    // --- fallback if nothing counted above ---
    if (!enrolled) enrolled = toNum(program?.enrolledParticipants) || toNum(program?.participantsEnrolled) || 0;
    if (!active)   active   = toNum(program?.participantsMeeting150) || toNum(program?.activeParticipants) || 0;

    return { enrolledParticipants: enrolled, activeParticipants: active };
  }, [program]);

  /* ---------- Inclusive programs (schools / special needs) ---------- */
  const inclusion = useMemo(() => {
    // Try explicit paths first, then fuzzy scans as a fallback.
    const school = firstNum(
      pickNumber(program,
        'inclusive.school',
        'inclusiveSchool',
        'inclusion.school',
        'inclusivePrograms.school',
        'inclusive.schoolParticipants',
        'schoolDisabilityParticipants'
      ),
      scanFor(program, ['school', 'disab']),
      scanFor(program, ['school'])
    );

    const special = firstNum(
      pickNumber(program,
        'inclusive.specialNeeds',
        'inclusiveSpecialNeeds',
        'inclusion.specialNeeds',
        'inclusivePrograms.specialNeeds',
        'inclusive.specialNeedsParticipants',
        'specialNeedsParticipants'
      ),
      scanFor(program, ['special', 'needs']),
      scanFor(program, ['special'])
    );

    const total = school + special;
    const enabled = total > 0 || Boolean(
      program?.inclusiveEnabled ?? program?.inclusion?.enabled ?? program?.inclusiveProgramsEnabled
    );
    return { enabled, school, special, total };
  }, [program]);

  const pct = (n: number) =>
    enrolledParticipants > 0 ? Math.min(100, Math.max(0, (n / enrolledParticipants) * 100)) : 0;

  // disease rows
  const rows = useMemo(() => DISEASES.map((d) => {
    const prevented = casesPreventedPerYear(activeParticipants, d.p0, d.rrr);
    const nntClin = nntPerYear(d.p0, d.rrr);
    const qalyPerCase = qalyLossPerIncidentCase(d) ?? 0;
    const dalyPerCase = dalyPerIncidentCase(d) ?? 0;
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
  }), [activeParticipants, enrolledParticipants]);

  const totals = useMemo(() =>
    rows.reduce((acc, r) => {
      acc.prevented += r.prevented;
      acc.qalys += r.qalys;
      acc.dalys += r.dalys;
      acc.baselineCases += r.baselineCases;
      return acc;
    }, { prevented: 0, qalys: 0, dalys: 0, baselineCases: 0 }),
  [rows]);

  const qalyValue = QALY_VALUE_AUD;
  const [qalyValLo, qalyValHi] = QALY_VALUE_AUD_RANGE;
  const dollarsFromQALYs = monetisedBenefitFromQALYs(totals.qalys, qalyValue);
  const dollarsFromDALYs = monetisedBenefitFromQALYs(totals.dalys, qalyValue);

  const sportsList = program?.sportsEnabled && Array.isArray(program?.sports) ? program.sports : [];
  const paList     = program?.paEnabled     && Array.isArray(program?.pa)     ? program.pa     : [];
  const sportsByType = useMemo(() =>
    groupSum(sportsList, (s: any) => s?.typeOfSport || s?.sport || s?.type || 'Sport', (s: any) => toNum(s?.participants)), [sportsList]);
  const sportsByLoc = useMemo(() =>
    groupSum(sportsList, (s: any) => s?.location || 'Unknown', (s: any) => toNum(s?.participants)), [sportsList]);
  const paByName = useMemo(() =>
    groupSum(paList, (p: any) => p?.programName || p?.name || 'Program', (p: any) => (p?.mode === '1 on 1' ? 1 : toNum(p?.participants))), [paList]);
  const paByLoc = useMemo(() =>
    groupSum(paList, (p: any) => p?.location || 'Unknown', (p: any) => (p?.mode === '1 on 1' ? 1 : toNum(p?.participants))), [paList]);

  const monetisedBars = [
    { name: 'QALY $ saved', value: Math.max(0, dollarsFromQALYs) },
    { name: 'DALY $ saved', value: Math.max(0, dollarsFromDALYs) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 lg:px-6 py-4 space-y-4 print:bg-white">

      {/* PRINT-ONLY COVER HEADER */}
      <div className="hidden print:block text-center mb-4">
        {/* If you have /public/logo.png, this works. Otherwise use <img> */}
        <img src="/logo.png" alt="Logo" className="mx-auto h-16 w-auto" />
        <div className="text-xl font-semibold mt-2">disport</div>
        <div className="text-sm text-slate-600 mt-1">Annual Impact Report</div>
      </div>

      {/* Header (interactive buttons hidden in print) */}
      <div className="print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: back + title + counts */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push('/programs')}
              className="px-3 py-2 rounded-lg border hover:bg-slate-50 shrink-0"
            >
              ← Back to Programs
            </button>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-tight truncate">
                Results — Annual Impact
              </h1>
              <div className="mt-1 text-sm text-slate-600 tabular-nums">
                Enrolled: <b>{fmtInt(enrolledParticipants)}</b>
                <span className="mx-2">·</span>
                Active (≥150): <b>{fmtInt(activeParticipants)}</b>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => { setShowDoc(true); setPage(0); }}
              className="h-10 px-4 rounded-full bg-emerald-600 text-white shadow-sm
                        hover:bg-emerald-700 active:bg-emerald-800 transition shrink-0"
              title="Open methods & definitions"
            >
              Methods &amp; Definitions
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-10 px-4 rounded-full border bg-white hover:bg-slate-50 shrink-0"
              title="Download PDF"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>


      {/* 1) Disease table */}
      <div className="rounded-2xl border bg-white overflow-hidden print:break-inside-avoid">
        <div className="px-4 py-2 bg-slate-50 border-b text-[13px] font-medium">Annual impact by disease</div>
        <div className="max-h-[70vh] overflow-auto print:overflow-visible">
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
                <th className="align-top text-left px-4 py-2">Disease</th>
                <th className="align-top text-right px-3 py-2">NNT (clinical)</th>
                <th className="align-top text-right px-3 py-2">Program NNT</th>
                <th className="align-top text-right px-3 py-2">Cases prevented / yr</th>
                <th className="align-top text-right px-3 py-2">QALYs gained / yr</th>
                <th className="align-top text-right px-3 py-2">DALYs avoided / yr</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b">
                  <td className="align-top px-4 py-2 truncate">{r.label}</td>
                  <td className="align-top px-3 py-2 text-right">{fmtNum(r.nntClin, 1)}</td>
                  <td className="align-top px-3 py-2 text-right">{fmtNum(r.programNNT, 1)}</td>
                  <td className="align-top px-3 py-2 text-right">{fmtNum(r.prevented, 2)}</td>
                  <td className="align-top px-3 py-2 text-right">{fmtNum(r.qalys, 2)}</td>
                  <td className="align-top px-3 py-2 text-right">{fmtNum(r.dalys, 2)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-medium border-t">
                <td className="align-top px-4 py-2 text-right">Total</td>
                <td className="align-top px-3 py-2 text-right">—</td>
                <td className="align-top px-3 py-2 text-right">—</td>
                <td className="align-top px-3 py-2 text-right">{fmtNum(totals.prevented, 2)}</td>
                <td className="align-top px-3 py-2 text-right">{fmtNum(totals.qalys, 2)}</td>
                <td className="align-top px-3 py-2 text-right">{fmtNum(totals.dalys, 2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2) Monetised health benefit */}
      <div className="rounded-2xl border bg-white p-4 space-y-4 print:break-inside-avoid">
        <div className="space-y-1">
          <h2 className="font-semibold">Monetised health benefit</h2>
          <p className="text-sm text-slate-600">
            Dollars saved are computed as <b>QALYs gained × {fmtMoney(QALY_VALUE_AUD)}</b>. (We show the same monetisation for DALYs avoided.)
          </p>
        </div>

        <div className="rounded-xl border">
          <div className="bg-slate-50 px-4 py-2 font-medium">Totals</div>
          <table className="w-full text-sm tabular-nums">
            <tbody>
              <tr className="border-t"><td className="align-top px-4 py-2">QALYs gained (total)</td><td className="align-top px-4 py-2 text-right">{fmtNum(totals.qalys, 2)}</td></tr>
              <tr className="border-t">
                <td className="align-top px-4 py-2">Value per QALY (AUD)</td>
                <td className="align-top px-4 py-2 text-right">
                  {fmtMoney(QALY_VALUE_AUD)}
                  <div className="text-xs text-slate-500">Range {fmtMoney(qalyValLo)}–{fmtMoney(qalyValHi)}</div>
                </td>
              </tr>
              <tr className="border-t bg-slate-50 font-medium"><td className="align-top px-4 py-2">Dollars saved (from QALYs)</td><td className="align-top px-4 py-2 text-right">{fmtMoney(dollarsFromQALYs)}</td></tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          Uses Australia’s reference ICER (opportunity-cost estimate) ≈ A$28k per QALY (95% CI A$20.8k–A$37.7k). For monetisation, one DALY avoided is treated as ≈ one QALY gained.
        </p>
      </div>

      {/* 3) Program composition */}
      <div className="rounded-2xl border bg-white p-4 space-y-4 print:break-inside-avoid">
        <h2 className="font-semibold">Program composition (participants)</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border p-3">
            <div className="text-sm font-medium mb-2">Sports Programs:</div>
            <div className="h-64 overflow-visible">
              {(sportsByType.length || sportsByLoc.length) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ left: PIE_LABEL_MARGIN, right: PIE_LABEL_MARGIN, top: 8, bottom: 8 }}>
                    <Tooltip formatter={(v: any) => v.toLocaleString()} />
                    <Pie data={sportsByType} dataKey="value" nameKey="name" cx="54%" cy="50%" innerRadius={28} outerRadius={70} labelLine={false} isAnimationActive={false}>
                      {sportsByType.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                    </Pie>
                    <Pie data={sportsByLoc} dataKey="value" nameKey="name" cx="54%" cy="50%" innerRadius={78} outerRadius={108} labelLine={false} label={renderOutsideLabel(0.08, 18, 16)} isAnimationActive={false}>
                      {sportsByLoc.map((_, i) => <Cell key={i} fill={palette2[i % palette2.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-full grid place-items-center text-slate-500 text-sm">No data yet</div>}
            </div>
            <div className="grid gap-2 md:grid-cols-2 mt-2">
              <LegendBlock title="Type of sport (inner)" items={sportsByType} colors={palette} />
              <LegendBlock title="Location (outer)" items={sportsByLoc}  colors={palette2} />
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-sm font-medium mb-2">Physical Activity Programs:</div>
            <div className="h-64 overflow-visible">
              {(paByName.length || paByLoc.length) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ left: PIE_LABEL_MARGIN, right: PIE_LABEL_MARGIN, top: 8, bottom: 8 }}>
                    <Tooltip formatter={(v: any) => v.toLocaleString()} />
                    <Pie data={paByName} dataKey="value" nameKey="name" cx="54%" cy="50%" innerRadius={28} outerRadius={70} labelLine={false} isAnimationActive={false}>
                      {paByName.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                    </Pie>
                    <Pie data={paByLoc} dataKey="value" nameKey="name" cx="54%" cy="50%" innerRadius={78} outerRadius={108} labelLine={false} label={renderOutsideLabel(0.08, 18, 16)} isAnimationActive={false}>
                      {paByLoc.map((_, i) => <Cell key={i} fill={palette2[i % palette2.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-full grid place-items-center text-slate-500 text-sm">No data yet</div>}
            </div>
            <div className="grid gap-2 md:grid-cols-2 mt-2">
              <LegendBlock title="Program name (inner)" items={paByName} colors={palette} />
              <LegendBlock title="Location (outer)"  items={paByLoc}  colors={palette2} />
            </div>
          </div>
        </div>
      </div>

      {/* 4) Inclusive programs (moved to the end & percent text removed) */}
      {!!inclusion.enabled && (
        <div className="rounded-2xl border bg-white p-4 print:break-inside-avoid">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Inclusive programs (schools / special needs)</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Participation highlight
            </span>
          </div>

          <div className="grid md:grid-cols-[220px,1fr] gap-6 items-center">
            <div className="overflow-hidden bg-slate-50 h-48 md:h-56">
              <InclusionArt />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-slate-600">School (participants with disability)</div>
                <div className="text-2xl font-semibold mt-1">{fmtInt(inclusion.school)}</div>
                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-sky-400" style={{ width: `${pct(inclusion.school)}%` }} />
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-slate-600">Special needs (participants)</div>
                <div className="text-2xl font-semibold mt-1">{fmtInt(inclusion.special)}</div>
                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct(inclusion.special)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Methods & Definitions (Image viewer) */}
      {showDoc && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-3"
          onClick={() => setShowDoc(false)}
        >
          <div
            className="w-[min(1000px,96vw)] h-[min(88vh,900px)] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Methods & Definitions"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Methods &amp; Definitions</h3>
                {METHODS_IMAGES.length > 1 && (
                  <span className="text-xs text-slate-500">
                    Page {page + 1} / {METHODS_IMAGES.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {METHODS_IMAGES.length > 1 && (
                  <>
                    <button
                      className="px-2 py-1 rounded border text-sm disabled:opacity-40"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      ‹ Prev
                    </button>
                    <button
                      className="px-2 py-1 rounded border text-sm disabled:opacity-40"
                      onClick={() => setPage(p => Math.min(METHODS_IMAGES.length - 1, p + 1))}
                      disabled={page === METHODS_IMAGES.length - 1}
                    >
                      Next ›
                    </button>
                  </>
                )}

                <button className="px-2 py-1 rounded border text-sm" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}>−</button>
                <button className="px-2 py-1 rounded border text-sm" onClick={() => computeFitScale()}>Fit</button>
                <button className="px-2 py-1 rounded border text-sm" onClick={() => setZoom(1)}>100%</button>
                <button className="px-2 py-1 rounded border text-sm" onClick={() => setZoom(z => Math.min(4, +(z + 0.1).toFixed(2)))}>+</button>

                <button
                  onClick={() => setShowDoc(false)}
                  className="ml-2 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50" ref={viewerRef}>
              <div className="w-full h-full flex items-center justify-center">
                <img
                  ref={imgRef}
                  src={METHODS_IMAGES[page]}
                  alt="Methods & Definitions"
                  className="max-w-none select-none"
                  style={{
                    width: imgRef.current?.naturalWidth
                      ? imgRef.current.naturalWidth * effectiveScale
                      : 'auto',
                    height: imgRef.current?.naturalHeight
                      ? imgRef.current.naturalHeight * effectiveScale
                      : 'auto',
                  }}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onLoad={computeFitScale}
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
