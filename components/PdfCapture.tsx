'use client';
const html2canvasP = () => import('html2canvas');
const jsPDFP = () => import('jspdf');
import { useRef } from 'react';

export default function PdfCapture({ children, filename = 'NNT_Results.pdf' }:{
  children: (ref: React.RefObject<HTMLDivElement>) => React.ReactNode;
  filename?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const download = async () => {
    if (!ref.current) return;
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([html2canvasP(), jsPDFP()]);
    const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const ratio = pageWidth / canvas.width;
    const height = canvas.height * ratio;
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, height);
    pdf.save(filename);
  };

  return (
    <div className="space-y-4">
      <div ref={ref}>{children(ref)}</div>
      <button onClick={download} className="no-print px-4 py-2 rounded-xl bg-[#008A4E] text-white hover:opacity-90">
        Download PDF
      </button>
    </div>
  );
}
