// app/layout.tsx
import './globals.css'
import Image from 'next/image'

export const metadata = {
  title: 'Sporting Wheelies — NNT Tool (Pilot)',
  description: 'Estimate NNT & cases prevented from sport-based MVPA.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#F8FAFC] text-[#0F172A]">
      <body className="min-h-screen flex flex-col">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
            <a href="/" className="inline-flex items-center gap-2">
              <Image src="/logo.png" alt="Sporting Wheelies" width={150} height={40} />
            </a>

            <div className="mx-auto text-center text-2xl sm:text-3xl font-extrabold tracking-wide text-emerald-700">
              D.I.S.P.O.R.T
            </div>

            <nav className="ml-auto flex items-center gap-4 text-sm">
              <a
                href="/"
                className="px-4 py-1.5 rounded-full bg-emerald-600 text-white shadow-sm
                          hover:bg-emerald-700 active:bg-emerald-800 transition
                          focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              >
                Home
              </a>
            </nav>
          </div>
        </header>

        {/* ⬇️ apply site-wide background */}
        <main className="mx-auto max-w-5xl p-4 flex-1 app-bg bg-grid-slate-100">
          {children}
        </main>

        <footer className="text-center text-sm sm:text-base text-slate-600 py-8 border-t bg-white">
          <div>© {new Date().getFullYear()} Sporting Wheelies</div>
          
          <div>
            Admin contact:{' '}
            <a className="underline" href="mailto:sport@sportingwheelies.org.au">
              sport@sportingwheelies.org.au
            </a>
          </div>
          <div>
            <b>Feedback:{' '}
            <a
              className="underline"
              href="https://forms.office.com/r/pkdy97d8dC"
              target="_blank"
              rel="noopener noreferrer"
            >
              Provide feedback here
            </a></b>
          </div>
        </footer>
      </body>
    </html>
  );
}
