'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { clearKeys } from '@/lib/browserStorage';;

export const dynamic = 'force-dynamic';
const CLEAR_KEYS = ['programsPage', 'programForm', 'programs', 'ceInputs_v2', 'orgInfo'];

export default function HomePage() {
  const router = useRouter();
  const [orgName, setOrgName] = React.useState('');
  const [fy, setFy] = React.useState('');
  const [errors, setErrors] = React.useState<{ org?: boolean; fy?: boolean }>({});

  const canStart = orgName.trim().length > 0 && fy.trim().length > 0;

  React.useEffect(() => {
    clearKeys(CLEAR_KEYS);
  }, []);

  const startNewRun = () => {
    // validate
    const e: { org?: boolean; fy?: boolean } = {};
    if (!orgName.trim()) e.org = true;
    if (!fy.trim()) e.fy = true;
    setErrors(e);
    if (e.org || e.fy) return; // stop if invalid

    // clear all old state
    try {
      CLEAR_KEYS.forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      sessionStorage.clear();
    } catch {}

    // persist org/year for this run (session-scoped)
    try {
      sessionStorage.setItem('orgInfo', JSON.stringify({ orgName, fy }));
    } catch {}

    router.push('/programs');
  };

  return (
    <div className="relative">
      {/* soft glows */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 -z-10 flex justify-center">
        <div className="h-56 w-[48rem] bg-gradient-to-r from-emerald-500/45 via-teal-500/45 to-sky-500/45 blur-3xl" />
      </div>
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 -z-10">
        <div className="h-64 w-64 rounded-full bg-gradient-to-br from-sky-500/35 to-emerald-500/35 blur-3xl" />
      </div>

      <div className="space-y-6">
        {/* HERO */}
        <section className="card-muted gradient-border-dark p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">The tool estimates the health and economical impact of your organisation.</h1>
              <p className="subtle mt-1">
                A lightweight decision-intelligence tool that turns sport participation data into annual health and economical impact for your organisation.
                Uses Australia-anchored baseline risks and relative risk reductions to estimate cases prevented across CHD, stroke, diabetes, arthritis, back pain, osteoporosis, asthma and emphysema.
                Quantifies QALYs gained and DALYs avoided, then converts benefits into A$ saved using a reference value per QALY—transparent, disease-by-disease.
              </p>
              <p className="text-slate-600 text-sm mt-1">
                Part of <span className="font-semibold">D.I.S.P.O.R.T</span> — Disability-Inclusive Sport Program Outcomes & Returns Toolkit
              </p>
            </div>
            <div className="hidden md:block text-4xl">✨</div>
          </div>
        </section>

        {/* HOW TO */}
        <section className="card gradient-border-dark p-6">
          <h2 className="section-title mb-4">How to use</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                n: '1',
                title: 'Start a run',
                text: 'Enter your organisation and financial year below. Each run is unique to this tab.',
              },
              {
                n: '2',
                title: 'Add programs',
                text: 'Provide participants, sessions/week, and minutes/session for sports & PA programs.',
              },
              {
                n: '3',
                title: 'View results',
                text: 'See disease-level impact, dollars saved (reference value per QALY), and composition charts.',
              },
            ].map((s, i) => (
              <div
                key={i}
                className="relative rounded-xl bg-white ring-1 ring-slate-300 hover:ring-slate-400 transition shadow-sm hover:shadow-md p-4"
              >
                <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-sky-700" />
                <div className="badge">{s.n}</div>
                <div className="font-medium mt-2">{s.title}</div>
                <p className="text-slate-700 text-sm mt-1">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* START FORM */}
        <section className="max-w-xl mx-auto card gradient-border-dark p-6 space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm subtle">Organisation name</span>
            <input
              required
              aria-invalid={errors.org ? 'true' : 'false'}
              className={[
                'input border-slate-400 text-slate-800',
                errors.org ? 'ring-2 ring-red-500/40 border-red-500' : '',
              ].join(' ')}
              placeholder="e.g., Sporting Wheelies"
              value={orgName}
              onChange={(e) => {
                setErrors((prev) => ({ ...prev, org: false }));
                setOrgName(e.target.value);
              }}
            />
            {errors.org && <span className="text-xs text-red-600">Organisation name is required.</span>}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm subtle">Financial year</span>
            <input
              required
              aria-invalid={errors.fy ? 'true' : 'false'}
              className={[
                'input border-slate-400 text-slate-800',
                errors.fy ? 'ring-2 ring-red-500/40 border-red-500' : '',
              ].join(' ')}
              placeholder="e.g., 2024–25"
              value={fy}
              onChange={(e) => {
                setErrors((prev) => ({ ...prev, fy: false }));
                setFy(e.target.value);
              }}
            />
            {errors.fy && <span className="text-xs text-red-600">Financial year is required.</span>}
          </label>

          <button
            onClick={startNewRun}
            disabled={!canStart}
            title={canStart ? 'Go to Programs' : 'Enter organisation & financial year first'}
            className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go to Programs
          </button>
        </section>
      </div>
    </div>
  );
}
