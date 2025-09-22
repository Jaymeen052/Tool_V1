'use client';
import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
};

export default function ScrollableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className = ''
}: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        className="w-full border rounded p-2 text-left bg-white"
        onClick={() => setOpen(o => !o)}
      >
        {value || <span className="text-slate-500">{placeholder}</span>}
      </button>

      {open && (
        <div
          ref={popRef}
          className="absolute z-50 mt-1 w-full border rounded bg-white shadow"
          style={{ maxHeight: 240, overflowY: 'auto' }}
        >
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer hover:bg-slate-50 ${
                opt === value ? 'bg-slate-100 font-medium' : ''
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
