import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Ticket, Shield, Bot, ClipboardList, AlertCircle } from 'lucide-react';

// Spanish azulejo tile SVG pattern
const TilePattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="azulejo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        {/* Outer frame */}
        <rect x="2" y="2" width="76" height="76" fill="none" stroke="#C4A044" strokeWidth="1.5"/>
        {/* Inner diamond */}
        <polygon points="40,8 72,40 40,72 8,40" fill="none" stroke="#C4A044" strokeWidth="1"/>
        {/* Corner petals */}
        <circle cx="2"  cy="2"  r="6" fill="none" stroke="#C4A044" strokeWidth="1"/>
        <circle cx="78" cy="2"  r="6" fill="none" stroke="#C4A044" strokeWidth="1"/>
        <circle cx="2"  cy="78" r="6" fill="none" stroke="#C4A044" strokeWidth="1"/>
        <circle cx="78" cy="78" r="6" fill="none" stroke="#C4A044" strokeWidth="1"/>
        {/* Center cross */}
        <line x1="40" y1="20" x2="40" y2="60" stroke="#C4A044" strokeWidth="0.75"/>
        <line x1="20" y1="40" x2="60" y2="40" stroke="#C4A044" strokeWidth="0.75"/>
        {/* Center dot */}
        <circle cx="40" cy="40" r="3" fill="#C4A044"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#azulejo)"/>
  </svg>
);

export default function Login() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (!isLoading && user) void navigate('/', { replace: true });
  }, [user, isLoading, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL as string}/auth/google`;
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left brand panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-14"
        style={{ background: 'linear-gradient(150deg, #3D0008 0%, #92000A 55%, #6B0009 100%)' }}
      >
        {/* Gold top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(90deg, #C4A044, #D4B84A, #C4A044)' }} />

        {/* Tile background pattern */}
        <TilePattern />

        {/* Gold vertical accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: 'linear-gradient(180deg, #C4A044 0%, transparent 40%, transparent 60%, #C4A044 100%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: '#C4A044' }}
          >
            <Ticket className="h-6 w-6" style={{ color: '#3D0008' }} />
          </div>
          <span className="text-white font-black text-xl tracking-tight">TIX4SMB</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-8 w-fit"
            style={{ background: 'rgba(245,184,0,0.15)', color: '#C4A044', border: '1px solid rgba(245,184,0,0.3)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#C4A044] animate-pulse" />
            Ticket Intelligence Platform
          </div>

          <h2 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            Smarter tickets.<br />
            <span style={{ color: '#C4A044' }}>Cleaner ops.</span>
          </h2>

          <p className="text-white/60 text-lg leading-relaxed max-w-sm">
            AI-powered ticket management built for cleaning services. Coordinate vendors, delight clients, resolve issues fast.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 mt-12">
            {[
              { value: 'AI', label: 'Powered analysis' },
              { value: '24/7', label: 'Always on' },
              { value: 'SMB', label: 'Purpose-built' },
            ].map(({ value, label }) => (
              <div key={value}>
                <div className="text-2xl font-black" style={{ color: '#C4A044' }}>{value}</div>
                <div className="text-white/50 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'rgba(245,184,0,0.3)' }} />
          <p className="text-white/40 text-xs tracking-wider uppercase">Jobber integrated · GoHighLevel integrated</p>
          <div className="h-px flex-1" style={{ background: 'rgba(245,184,0,0.3)' }} />
        </div>

        {/* Gold bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(90deg, #C4A044, #D4B84A, #C4A044)' }} />
      </div>

      {/* ── Right login panel ────────────────────────────────────── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center bg-neutral-50 p-8 relative">

        {/* Subtle background texture */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #92000A 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative w-full max-w-md">

          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-10">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #92000A, #3D0008)' }}
            >
              <Ticket className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#92000A' }}>TIX4SMB</h1>
            <p className="text-sm text-neutral-500 mt-1">Ticket tracking for cleaning services</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-neutral-200/80 border border-neutral-100 p-8 space-y-7">

            {/* Header */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Welcome back</h1>
              <p className="text-neutral-500 text-sm">Sign in to access your workspace</p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#92000A' }}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                Sign in failed. Please try again.
              </div>
            )}

            {/* Google button */}
            <button
              onClick={handleGoogleLogin}
              className="group w-full relative flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-neutral-200 bg-white text-neutral-700 font-semibold text-sm transition-all duration-200 hover:border-[#92000A] hover:shadow-lg hover:shadow-[#92000A]/10 hover:-translate-y-0.5 active:translate-y-0"
            >
              {/* Google icon */}
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>

              <span className="flex-1 text-left">Continue with Google</span>

              {/* Arrow */}
              <svg
                className="h-4 w-4 text-neutral-300 group-hover:text-[#92000A] group-hover:translate-x-0.5 transition-all duration-200"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-100" />
              <span className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium">Secure · Private</span>
              <div className="flex-1 h-px bg-neutral-100" />
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-5">
              {[
                { icon: Shield, text: 'Google OAuth' },
                { icon: Bot, text: 'AI-powered' },
                { icon: ClipboardList, text: 'Jobber sync' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1.5">
                  <Icon className="h-5 w-5 text-neutral-500" />
                  <span className="text-[11px] text-neutral-500 font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-neutral-500 mt-6">
            By signing in you agree to the terms of service
          </p>
          <p className="text-center text-[10px] text-neutral-400 mt-2 tracking-wide">
            Developed by Aragrow, LLC
          </p>
        </div>
      </div>
    </div>
  );
}
