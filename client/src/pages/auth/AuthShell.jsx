import { STAGES, STATUS_META } from '../../utils/constants';

/**
 * Split layout for login/register. The left side shows what the product does
 * in its own vocabulary: one complaint travelling through its stages.
 */
export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#ffffff" />
            <path d="M9 17.5l4.5 4.5L23 11" fill="none" stroke="#13294b" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xl font-extrabold">CampusFix</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-[40px] font-extrabold leading-[1.1]" style={{ color: '#fff' }}>
            Report a campus problem once. Watch it get fixed.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Broken fans, Wi-Fi drops, leaking taps — every complaint gets an ID, an owner and a visible trail from the
            moment you submit it to the moment it's resolved.
          </p>

          <ol className="mt-10 list-none space-y-0 p-0">
            {STAGES.map((stage, i) => (
              <li key={stage} className="flex items-stretch gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2"
                    style={{ borderColor: STATUS_META[stage].color, background: i === STAGES.length - 1 ? STATUS_META[stage].color : 'transparent' }}
                  />
                  {i < STAGES.length - 1 && <span className="w-px flex-1 bg-white/20" />}
                </div>
                <div className="pb-5">
                  <p className="text-sm font-bold">{stage}</p>
                  <p className="text-xs text-white/60">{STATUS_META[stage].hint}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-white/40">Smart Campus Complaint &amp; Issue Management System</p>
      </aside>

      <main className="flex items-center justify-center bg-white px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
