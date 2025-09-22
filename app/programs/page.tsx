'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScrollableSelect from '@/components/ScrollableSelect';

type SportProgram = {
  typeOfSport: string;
  participants: number;
  location: string;
  sessionsPerWeekOpt: string; // "", "1".."5","More"
  sessionsPerWeek: number;    // 0,1..6
  minutesPerSession: number;  // 0..180
};

type PAProgram = {
  name: string;
  mode: '' | 'Group' | '1 on 1';
  participants: number;       // 1 if mode === '1 on 1'
  location: string;
  sessionsPerWeekOpt: string;
  sessionsPerWeek: number;
  minutesPerSession: number;
};

type FieldErrors = {
  global?: string;
  sports?: string;
  pa?: string;
  inclusive?: string;
};

const SESSION_OPTIONS = ['1', '2', '3', '4', '5', 'More'];
const toSessionsNum = (opt: string) => (opt === 'More' ? 6 : Number(opt || 0));
// Minutes up to 180 (15-min steps)
const MINUTES_OPTIONS = Array.from({ length: 12 }, (_, i) => 15 * (i + 1));

const SPORT_OPTIONS = [
  'Paralympic sports','Para-archery','Para-athletics','Para-badminton','Blind football','Boccia','Para-canoe','Para-cycling',
  'Para-equestrian','Goalball','Para-judo','Para-powerlifting','Para-rowing','Para-shooting','Para-swimming','Para-table tennis',
  'Para-taekwondo','Para-triathlon','Sitting volleyball','Wheelchair basketball','Wheelchair fencing','Wheelchair rugby',
  'Wheelchair tennis','Para-bowls','Other'
];

const LOCATION_OPTIONS = [
  'Brisbane','Gold Coast','Moreton Bay','Logan','Sunshine Coast','Ipswich','Townsville','Toowoomba','Cairns','Redland',
  'Mackay','Fraser Coast','Bundaberg','Rockhampton','Gladstone','Noosa','Gympie','Scenic Rim','Livingstone'
];

export default function ProgramsPage() {
  const router = useRouter();

  // Sports
  const [sportsEnabled, setSportsEnabled] = useState(false);
  const [sportsCount, setSportsCount] = useState(0);
  const [sports, setSports] = useState<SportProgram[]>([]);

  // PA
  const [paEnabled, setPaEnabled] = useState(false);
  const [paCount, setPaCount] = useState(0);
  const [pa, setPa] = useState<PAProgram[]>([]);

  // Inclusive
  const [inclusiveEnabled, setInclusiveEnabled] = useState(false);
  const [schoolParticipantsDisability, setSchoolParticipantsDisability] = useState(0);
  const [specialNeedsParticipants, setSpecialNeedsParticipants] = useState(0);

  // Errors
  const [errors, setErrors] = useState<FieldErrors>({});

  // --- clear error helpers ---
  const clearSectionError = (k: keyof FieldErrors) =>
    setErrors(prev => ({ ...prev, [k]: undefined, global: undefined }));
  const clearAllErrors = () => setErrors({});

  // Restore saved state (on first load)
  useEffect(() => {
    const saved = localStorage.getItem('programsPage');
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      setSportsEnabled(!!s.sportsEnabled);
      setSportsCount(Number(s.sportsCount || 0));
      setSports(Array.isArray(s.sports) ? s.sports : []);

      setPaEnabled(!!s.paEnabled);
      setPaCount(Number(s.paCount || 0));
      setPa(Array.isArray(s.pa) ? s.pa : []);

      setInclusiveEnabled(!!s.inclusiveEnabled);
      setSchoolParticipantsDisability(Number(s.schoolParticipantsDisability || 0));
      setSpecialNeedsParticipants(Number(s.specialNeedsParticipants || 0));
    } catch {}
  }, []);

  // EMPTY rows (no defaults)
  const makeEmptySport = (): SportProgram => ({
    typeOfSport: '', participants: 0, location: '',
    sessionsPerWeekOpt: '', sessionsPerWeek: 0, minutesPerSession: 0,
  });

  const makeEmptyPA = (): PAProgram => ({
    name: '', mode: '', participants: 0, location: '',
    sessionsPerWeekOpt: '', sessionsPerWeek: 0, minutesPerSession: 0,
  });

  // Keep arrays in sync — SPORTS
  useEffect(() => {
    if (!sportsEnabled) return;
    setSports(prev => {
      const next = [...prev];
      while (next.length < sportsCount) next.push(makeEmptySport());
      if (sportsCount < next.length) next.length = sportsCount;
      return next;
    });
  }, [sportsEnabled, sportsCount]);

  // Keep arrays in sync — PA
  useEffect(() => {
    if (!paEnabled) return;
    setPa(prev => {
      const next = [...prev];
      while (next.length < paCount) next.push(makeEmptyPA());
      if (paCount < next.length) next.length = paCount;
      return next;
    });
  }, [paEnabled, paCount]);

  // Updaters (clear errors on change)
  const updSport = (i: number, patch: Partial<SportProgram>) => {
    clearSectionError('sports');
    setSports(prev => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const updPa = (i: number, patch: Partial<PAProgram>) => {
    clearSectionError('pa');
    setPa(prev => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  // Totals
  const totalParticipants = useMemo(() => {
    const sportsSum = sportsEnabled ? sports.reduce((t, p) => t + (p.participants || 0), 0) : 0;
    const paSum = paEnabled ? pa.reduce((t, p) => t + (p.mode === '1 on 1' ? 1 : (p.participants || 0)), 0) : 0;
    const inclusiveSum = inclusiveEnabled
      ? (Number(schoolParticipantsDisability) || 0) + (Number(specialNeedsParticipants) || 0)
      : 0;
    return sportsSum + paSum + inclusiveSum;
  }, [sportsEnabled, sports, paEnabled, pa, inclusiveEnabled, schoolParticipantsDisability, specialNeedsParticipants]);

  // Storage helpers
  const persist = (data: any) => localStorage.setItem('programsPage', JSON.stringify(data));
  const getSnapshot = () => {
    const paNormalized = pa.map(p => ({
      ...p,
      participants: p.mode === '1 on 1' ? 1 : (p.participants || 0),
    }));
    return {
      sportsEnabled, sportsCount, sports,
      paEnabled, paCount, pa: paNormalized,
      inclusiveEnabled, schoolParticipantsDisability, specialNeedsParticipants
    };
  };

  const clearSports = () => {
    setSportsCount(0); setSports([]); clearSectionError('sports');
    const snap = getSnapshot();
    snap.sportsEnabled = false; snap.sportsCount = 0; snap.sports = [];
    persist(snap);
  };

  const clearPA = () => {
    setPaCount(0); setPa([]); clearSectionError('pa');
    const snap = getSnapshot();
    snap.paEnabled = false; snap.paCount = 0; snap.pa = [];
    persist(snap);
  };

  const clearInclusive = () => {
    setSchoolParticipantsDisability(0); setSpecialNeedsParticipants(0); clearSectionError('inclusive');
    const snap = getSnapshot();
    snap.inclusiveEnabled = false; snap.schoolParticipantsDisability = 0; snap.specialNeedsParticipants = 0;
    persist(snap);
  };

  // Any data at all?
  const hasAnyData = useMemo(() => {
    const hasSports = sportsEnabled && sportsCount > 0;
    const hasPA = paEnabled && paCount > 0;
    const hasInclusive = inclusiveEnabled && (
      (Number(schoolParticipantsDisability) || 0) > 0 ||
      (Number(specialNeedsParticipants) || 0) > 0
    );
    return hasSports || hasPA || hasInclusive;
  }, [
    sportsEnabled, sportsCount,
    paEnabled, paCount,
    inclusiveEnabled, schoolParticipantsDisability, specialNeedsParticipants
  ]);

  // Validation
  const validate = () => {
    const e: FieldErrors = {};

    if (!hasAnyData) {
      e.global = 'Please enter at least one program or inclusive participant before viewing results.';
      setErrors(e);
      return false;
    }

    if (sportsEnabled) {
      if (!sportsCount || sportsCount < 1) {
        e.sports = 'Please enter values: add at least one sport program.';
      } else {
        const invalid = sports.some(p =>
          !p.typeOfSport ||
          !(p.participants && p.participants > 0) ||
          !p.location ||
          !(p.sessionsPerWeek && p.sessionsPerWeek > 0) ||
          !(p.minutesPerSession && p.minutesPerSession > 0)
        );
        if (invalid) e.sports = 'Please enter values for all sport program fields.';
      }
    }

    if (paEnabled) {
      if (!paCount || paCount < 1) {
        e.pa = 'Please enter values: add at least one physical activity program.';
      } else {
        const invalid = pa.some(p =>
          !p.name ||
          !p.mode ||
          !p.location ||
          !(p.sessionsPerWeek && p.sessionsPerWeek > 0) ||
          !(p.minutesPerSession && p.minutesPerSession > 0) ||
          (p.mode !== '1 on 1' && !(p.participants && p.participants > 0))
        );
        if (invalid) e.pa = 'Please enter values for all physical activity program fields.';
      }
    }

    if (inclusiveEnabled) {
      const totalInc = (Number(schoolParticipantsDisability) || 0) + (Number(specialNeedsParticipants) || 0);
      if (totalInc <= 0) e.inclusive = 'Please enter values for school/special needs participants.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goBackToStart = () => {
    // Persist current progress so it’s not lost on nav
    clearAllErrors();
    persist(getSnapshot());
    router.push('/'); // client-side; no refresh
  };

  const saveAndGo = () => {
    if (validate()) {
      persist(getSnapshot());
      router.push('/output');
    } else {
      setTimeout(() => {
        const el = document.querySelector('[data-error="true"]') as HTMLElement | null;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global error */}
      {errors.global && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm" data-error="true">
          {errors.global}
        </div>
      )}

      <div className="flex items-end justify-between">
        <h1 className="text-xl font-semibold">Programs (QLD/Brisbane focused)</h1>
        <div className="text-sm text-slate-600">
          Total participants (all sections): <b>{totalParticipants}</b>
        </div>
      </div>

      {/* SPORTS */}
      <section className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={sportsEnabled}
              onChange={e => {
                const checked = e.target.checked;
                setSportsEnabled(checked);
                clearSectionError('sports'); clearSectionError('global');
                if (!checked) clearSports();
              }}
            />
            <h2 className="font-medium">Sports programs</h2>
          </div>

          {sportsEnabled && (
            <label className="flex items-center gap-2">
              <span className="text-sm text-slate-600">No. of sport programs</span>
              <input
                type="number" min={0} className="border rounded p-2 w-24"
                value={sportsCount}
                onChange={e => { setSportsCount(Number(e.target.value)); clearSectionError('sports'); }}
              />
            </label>
          )}
        </div>

        {sportsEnabled && errors.sports && (
          <p className="text-red-600 text-sm" data-error="true">{errors.sports}</p>
        )}

        {sportsEnabled && sports.map((p, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-3 border-t pt-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Type of sport</span>
              <ScrollableSelect
                value={p.typeOfSport}
                onChange={(val) => updSport(i, { typeOfSport: val })}
                options={SPORT_OPTIONS}
                placeholder="Select…"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">No. of participants</span>
              <input
                type="number" min={0} className="border rounded p-2"
                value={p.participants || ''}
                onChange={e => updSport(i, { participants: Number(e.target.value) || 0 })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Location</span>
              <ScrollableSelect
                value={p.location}
                onChange={(val) => updSport(i, { location: val })}
                options={LOCATION_OPTIONS}
                placeholder="Select…"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Sessions / week</span>
              <select
                className="border rounded p-2"
                value={p.sessionsPerWeekOpt}
                onChange={e => {
                  const opt = e.target.value;
                  updSport(i, { sessionsPerWeekOpt: opt, sessionsPerWeek: toSessionsNum(opt) });
                }}
              >
                <option value="">Select…</option>
                {SESSION_OPTIONS.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Minutes / session</span>
              <select
                className="border rounded p-2"
                value={p.minutesPerSession || ''}
                onChange={e => updSport(i, { minutesPerSession: Number(e.target.value) || 0 })}
              >
                <option value="">Select…</option>
                {MINUTES_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
        ))}
      </section>

      {/* PA */}
      <section className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={paEnabled}
              onChange={e => {
                const checked = e.target.checked;
                setPaEnabled(checked);
                clearSectionError('pa'); clearSectionError('global');
                if (!checked) clearPA();
              }}
            />
            <h2 className="font-medium">Physical activity (PA) programs</h2>
          </div>

          {paEnabled && (
            <label className="flex items-center gap-2">
              <span className="text-sm text-slate-600">No. of PA programs</span>
              <input
                type="number" min={0} className="border rounded p-2 w-24"
                value={paCount}
                onChange={e => { setPaCount(Number(e.target.value)); clearSectionError('pa'); }}
              />
            </label>
          )}
        </div>

        {paEnabled && errors.pa && (
          <p className="text-red-600 text-sm" data-error="true">{errors.pa}</p>
        )}

        {paEnabled && pa.map((p, i) => {
          const isOneOnOne = p.mode === '1 on 1';
          return (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-3 border-t pt-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Program name</span>
                <input
                  className="border rounded p-2"
                  value={p.name}
                  onChange={e => updPa(i, { name: e.target.value })}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Group or 1 on 1</span>
                <select
                  className="border rounded p-2"
                  value={p.mode}
                  onChange={e => {
                    const mode = e.target.value as PAProgram['mode'];
                    clearSectionError('pa');
                    updPa(i, { mode, participants: mode === '1 on 1' ? 1 : p.participants });
                  }}
                >
                  <option value="">Select…</option>
                  <option>Group</option>
                  <option>1 on 1</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">No. of participants</span>
                <input
                  type="number" min={0} className="border rounded p-2"
                  value={isOneOnOne ? 1 : (p.participants || '')}
                  disabled={isOneOnOne}
                  onChange={e => !isOneOnOne && updPa(i, { participants: Number(e.target.value) || 0 })}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Location</span>
                <ScrollableSelect
                  value={p.location}
                  onChange={(val) => updPa(i, { location: val })}
                  options={LOCATION_OPTIONS}
                  placeholder="Select…"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Sessions / week</span>
                <select
                  className="border rounded p-2"
                  value={p.sessionsPerWeekOpt}
                  onChange={e => {
                    const opt = e.target.value;
                    updPa(i, { sessionsPerWeekOpt: opt, sessionsPerWeek: toSessionsNum(opt) });
                  }}
                >
                  <option value="">Select…</option>
                  {SESSION_OPTIONS.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Minutes / session</span>
                <select
                  className="border rounded p-2"
                  value={p.minutesPerSession || ''}
                  onChange={e => updPa(i, { minutesPerSession: Number(e.target.value) || 0 })}
                >
                  <option value="">Select…</option>
                  {MINUTES_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            </div>
          );
        })}
      </section>

      {/* Inclusive */}
      <section className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={inclusiveEnabled}
            onChange={e => {
              const checked = e.target.checked;
              setInclusiveEnabled(checked);
              clearSectionError('inclusive'); clearSectionError('global');
              if (!checked) clearInclusive();
            }}
          />
          <h2 className="font-medium">Inclusive programs (schools / special needs)</h2>
        </div>

        {inclusiveEnabled && errors.inclusive && (
          <p className="text-red-600 text-sm" data-error="true">{errors.inclusive}</p>
        )}

        {inclusiveEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">School (participants with disability)</span>
              <input
                type="number" min={0} className="border rounded p-2"
                value={schoolParticipantsDisability || ''}
                onChange={e => { setSchoolParticipantsDisability(Number(e.target.value) || 0); clearSectionError('inclusive'); }}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Special needs (participants)</span>
              <input
                type="number" min={0} className="border rounded p-2"
                value={specialNeedsParticipants || ''}
                onChange={e => { setSpecialNeedsParticipants(Number(e.target.value) || 0); clearSectionError('inclusive'); }}
              />
            </label>
          </div>
        )}
      </section>

      {/* Footer actions */}
      <div className="flex justify-between gap-3">
        <button
          onClick={goBackToStart}
          className="px-4 py-2 rounded-xl border"
          type="button"
          title="Back to start"
        >
          ← Back to Start
        </button>

        <button
          onClick={saveAndGo}
          className="px-4 py-2 rounded-xl bg-[#008A4E] text-white disabled:opacity-60 disabled:cursor-not-allowed"
          type="button"
          disabled={!hasAnyData}
          title={hasAnyData ? 'View Results' : 'Enter some data first'}
        >
          View Results
        </button>
      </div>
    </div>
  );
}
