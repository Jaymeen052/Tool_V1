'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [orgName1, setOrgName1] = useState('');
  const [orgName2, setOrgName2] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('orgInfo');
    if (saved) {
      const { orgName1, orgName2 } = JSON.parse(saved);
      setOrgName1(orgName1 || '');
      setOrgName2(orgName2 || '');
    }
  }, []);

  const saveAndNext = () => {
    localStorage.setItem('orgInfo', JSON.stringify({ orgName1, orgName2 }));
    router.push('/programs'); // ⬅ go to input first
  };

  return (
    <div className="grid place-items-center">
      <div className="max-w-xl w-full space-y-6">
        <div className="rounded-2xl border bg-white p-6 text-center">
          <h1 className="text-2xl font-semibold mb-2">NNT & Cases Prevented Tool</h1>
          <p className="text-slate-600">
            Estimate annual Number Needed to Treat (NNT) and Cases Prevented from achieving
            ≥150 min/week of sport-based MVPA. This pilot runs entirely in your browser.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Organisation name (line 1)</span>
            <input value={orgName1} onChange={e=>setOrgName1(e.target.value)} className="border rounded-lg p-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Organisation name (line 2, optional)</span>
            <input value={orgName2} onChange={e=>setOrgName2(e.target.value)} className="border rounded-lg p-2" />
          </label>
          <button onClick={saveAndNext} className="w-full mt-2 px-4 py-2 rounded-xl bg-[#008A4E] text-white">
            Go to Programs
          </button>
        </div>
      </div>
    </div>
  );
}
