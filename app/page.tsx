'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const [orgName, setOrgName] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [errors, setErrors] = useState<{ org?: string; fy?: string }>({});

  // Load saved org info (optional convenience)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('orgInfo');
      if (saved) {
        const parsed = JSON.parse(saved);
        setOrgName(parsed?.orgName ?? '');
        setFinancialYear(parsed?.financialYear ?? '');
      }
    } catch { /* ignore malformed storage */ }
  }, []);

  const canContinue = orgName.trim() !== '' && financialYear.trim() !== '';

  const saveAndNext = () => {
    const e: { org?: string; fy?: string } = {};
    if (!orgName.trim()) e.org = 'Please enter your organisation name.';
    if (!financialYear.trim()) e.fy = 'Please enter a financial year.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    // Save org info (exactly two fields)
    localStorage.setItem(
      'orgInfo',
      JSON.stringify({ orgName: orgName.trim(), financialYear: financialYear.trim() })
    );

    // Clear all program data for a fresh start each time you begin
    localStorage.removeItem('programsPage');

    // Go to Programs (client-side; no refresh)
    router.push('/programs');
  };

  return (
    <div className="grid place-items-center">
      <div className="max-w-xl w-full space-y-6">
        <div className="rounded-2xl border bg-white p-6 text-center">
          <h1 className="text-2xl font-semibold mb-2">NNT &amp; Cases Prevented Tool</h1>
          <p className="text-slate-600">Enter your organisation and financial year to begin.</p>
        </div>

        <div className="rounded-2xl border bg-white p-6 space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Organisation name</span>
            <input
              className="border rounded-lg p-2"
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value);
                if (errors.org) setErrors((prev) => ({ ...prev, org: undefined }));
              }}
              placeholder="e.g., Sporting Wheelies"
            />
            {errors.org && <span className="text-sm text-red-600">{errors.org}</span>}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Financial year</span>
            <input
              className="border rounded-lg p-2"
              value={financialYear}
              onChange={(e) => {
                setFinancialYear(e.target.value);
                if (errors.fy) setErrors((prev) => ({ ...prev, fy: undefined }));
              }}
              placeholder="e.g., 2024–25"
            />
            {errors.fy && <span className="text-sm text-red-600">{errors.fy}</span>}
          </label>

          <button
            type="button"
            onClick={saveAndNext}
            disabled={!canContinue}
            className="w-full mt-2 px-4 py-2 rounded-xl bg-[#008A4E] text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Go to Programs
          </button>
        </div>
      </div>
    </div>
  );
}
