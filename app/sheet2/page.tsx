'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// You said you don't have dropdowns here. We'll keep intensity simple, and Baseline PA as free text.
// If you later want a dropdown for intensity, edit INTENSITY_OPTIONS.
const INTENSITY_OPTIONS = ['Moderate', 'Vigorous'];

export default function Sheet2Page() {
  const router = useRouter();
  const [state, setState] = useState({
    dropoutPct: 0.20,       // 0–1
    maintainPct12m: 0.60,   // 0–1
    intensity: '',
    baselinePALevel: ''     // free text
  });

  useEffect(() => {
    const saved = localStorage.getItem('sheet2');
    if (saved) setState(s => ({ ...s, ...JSON.parse(saved) }));
  }, []);

  const update = (k: string, v: any) => setState(s => ({ ...s, [k]: v }));
  const generate = () => { localStorage.setItem('sheet2', JSON.stringify(state)); router.push('/output'); };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Step 2 — Sheet 2 inputs</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Expected/Actual Drop-outs (0–1)</span>
          <input type="number" min={0} max={1} step={0.01} value={state.dropoutPct}
                 onChange={e=>update('dropoutPct', Number(e.target.value))} className="border rounded p-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Annual % maintaining ≥150 min/wk (0–1)</span>
          <input type="number" min={0} max={1} step={0.01} value={state.maintainPct12m}
                 onChange={e=>update('maintainPct12m', Number(e.target.value))} className="border rounded p-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Activity intensity level</span>
          <select value={state.intensity} onChange={e=>update('intensity', e.target.value)} className="border rounded p-2">
            <option value="">Select…</option>
            {INTENSITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Baseline physical activity level (free text)</span>
          <input value={state.baselinePALevel} onChange={e=>update('baselinePALevel', e.target.value)}
                 className="border rounded p-2" placeholder="e.g., % already meeting guidelines" />
        </label>
      </div>

      <div className="flex justify-end">
        <button onClick={generate} className="px-4 py-2 rounded-xl bg-[#008A4E] text-white">Generate Output</button>
      </div>
    </div>
  );
}
