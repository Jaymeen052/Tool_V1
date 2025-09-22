'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/** your SPORT dropdown options */
const SPORT_OPTIONS = [
  'Paralympic sports',
  'Para-archery',
  'Para-athletics',
  'Para-badminton',
  'Blind football',
  'Boccia',
  'Para-canoe',
  'Para-cycling',
  'Para-equestrian',
  'Goalball',
  'Para-judo',
  'Para-powerlifting',
  'Para-rowing',
  'Para-shooting',
  'Para-swimming',
  'Para-table tennis',
  'Para-taekwondo',
  'Para-triathlon',
  'Sitting volleyball',
  'Wheelchair basketball',
  'Wheelchair fencing',
  'Wheelchair rugby',
  'Wheelchair tennis',
  'Para-alpine skiing',
  'Para-biathlon',
  'Para-cross-country skiing',
  'Para-ice hockey',
  'Para-snowboard',
  'Wheelchair curling',
  'Para-bowls',
  'Other'
];

/** your LOCATION dropdown options */
const LOCATION_OPTIONS = [
  'Brisbane','Gold Coast','Moreton Bay','Logan','Sunshine Coast','Ipswich','Townsville','Toowoomba','Cairns','Redland','Mackay','Fraser Coast','Bundaberg','Rockhampton','Gladstone','Noosa','Gympie','Scenic Rim','Lockyer Valley','Livingstone','Southern Downs','Whitsunday','Western Downs','South Burnett','Cassowary Coast','Central Highlands','Tablelands','Somerset','Mareeba','Isaac','Mount Isa','Burdekin','Banana','Maranoa','Charters Towers','Douglas','Hinchinbrook','Goondiwindi','North Burnett','Torres Strait Island','Balonne','Murweh','Cook','Weipa','Longreach','Torres','Cloncurry','Barcaldine','Northern Peninsula Area','Yarrabah','Palm Island','Carpentaria','Blackall-Tambo','Paroo','Flinders','Doomadgee','Aurukun','Cherbourg','Mornington','Winton','Woorabinda','Napranum','Kowanyama','Hope Vale','Quilpie','Etheridge','McKinlay','Richmond','Pormpuraaw','Lockhart River','Boulia','Bulloo','Burke','Mapoon','Croydon','Diamantina','Wujal Wujal','Barcoo'
];

export default function Sheet1Page() {
  const router = useRouter();
  const [state, setState] = useState({
    orgName1: '', orgName2: '',
    sport: '',
    location: '',
    participants: 0,
    programs: 0,
    juniorPrograms: 0,
    sessionsPerWeek: 0,
    minutesPerSession: 0,
    pctDisability: 1.0,   // 0–1
    runsProgram: true
  });

  useEffect(() => {
    const org = localStorage.getItem('orgInfo');
    if (org) {
      const o = JSON.parse(org);
      setState(s => ({ ...s, orgName1: o.orgName1 || '', orgName2: o.orgName2 || '' }));
    }
    const saved = localStorage.getItem('sheet1');
    if (saved) setState(s => ({ ...s, ...JSON.parse(saved) }));
  }, []);

  const update = (k: string, v: any) => setState(s => ({ ...s, [k]: v }));
  const next = () => { localStorage.setItem('sheet1', JSON.stringify(state)); router.push('/sheet2'); };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Step 1 — Sheet 1 inputs</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Sport (dropdown) */}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Sport</span>
          <select value={state.sport} onChange={e=>update('sport', e.target.value)} className="border rounded p-2">
            <option value="">Select a sport…</option>
            {SPORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        {/* Location (dropdown) */}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Location (LGA)</span>
          <select value={state.location} onChange={e=>update('location', e.target.value)} className="border rounded p-2">
            <option value="">Select…</option>
            {LOCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>

        {/* Numeric fields */}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">No. of participants</span>
          <input type="number" min={0} value={state.participants}
                 onChange={e=>update('participants', Number(e.target.value))} className="border rounded p-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">No. of sports programs conducted</span>
          <input type="number" min={0} value={state.programs}
                 onChange={e=>update('programs', Number(e.target.value))} className="border rounded p-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">No. of junior/school programmes</span>
          <input type="number" min={0} value={state.juniorPrograms}
                 onChange={e=>update('juniorPrograms', Number(e.target.value))} className="border rounded p-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Sessions per week</span>
          <input type="number" min={0} value={state.sessionsPerWeek}
                 onChange={e=>update('sessionsPerWeek', Number(e.target.value))} className="border rounded p-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Minutes per session</span>
          <input type="number" min={0} value={state.minutesPerSession}
                 onChange={e=>update('minutesPerSession', Number(e.target.value))} className="border rounded p-2" />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={state.runsProgram}
                 onChange={e=>update('runsProgram', e.target.checked)} />
          <span className="text-sm text-slate-600">Does the organisation run a program?</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">% of participants with disability (0–1)</span>
          <input type="number" min={0} max={1} step={0.01} value={state.pctDisability}
                 onChange={e=>update('pctDisability', Number(e.target.value))} className="border rounded p-2" />
        </label>
      </div>

      <div className="flex justify-end">
        <button onClick={next} className="px-4 py-2 rounded-xl bg-[#008A4E] text-white">Next</button>
      </div>
    </div>
  );
}
