import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<'admin' | 'staff' | null>(null);
  const navigate = useNavigate();

  // Signup fields
  const [orgName, setOrgName] = useState('');
  const [userName, setUserName] = useState('');

  const fillDemoAccount = (role: 'admin' | 'staff') => {
    setIsLogin(true);
    setSelectedPersona(role);
    setOrgSlug('apex-logistics');
    setPassword('Password123!');
    if (role === 'admin') {
      setEmail('admin@apex.com');
    } else {
      setEmail('marcus.warehouse@apex.com');
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { data } = await api.post('/auth/login', { email, password, orgSlug });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      } else {
        const { data } = await api.post('/auth/signup', {
          orgName,
          orgSlug,
          userName,
          email,
          password,
        });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0C] text-zinc-100 flex flex-col lg:flex-row relative selection:bg-amber-500 selection:text-zinc-950 font-sans antialiased">
      {/* LEFT COLUMN: Industrial Brand & Architecture Showcase (visible on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0E1014] p-12 xl:p-16 flex-col justify-between border-r border-[#232730] relative overflow-hidden">
        {/* Subtle grid accent background */}
        <div className="absolute inset-0 bg-[radial-gradient(#262B35_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

        {/* Brand header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#14171E] border border-amber-500/40 text-amber-400 font-mono font-black flex items-center justify-center shadow-xs">
              TL
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-zinc-100 block">TALLY</span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400/90 font-bold block">
                WAREHOUSE OS // v2.4
              </span>
            </div>
          </div>
        </div>

        {/* Hero Value Content */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono bg-[#14171E] border border-amber-500/30 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 led-pulse-emerald animate-pulse" />
            <span>ENTERPRISE_ARCHITECTURE_ACTIVE</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-zinc-100 tracking-tight leading-tight">
            Autonomous stock ledger & high-velocity fulfillment.
          </h1>

          <p className="text-zinc-400 text-sm leading-relaxed">
            Eliminate inventory discrepancies forever with strict append-only ledger transactions, multi-zone bin tracking, and live WebSocket telemetry.
          </p>

          {/* Architecture telemetry card */}
          <div className="p-5 rounded-xl bg-[#12141A] border border-[#232730] shadow-lg space-y-3.5">
            <div className="flex items-center justify-between text-xs border-b border-[#232730] pb-2.5">
              <span className="font-semibold text-zinc-300">System Telemetry & Guarantees</span>
              <span className="text-emerald-400 font-mono text-[11px] font-bold">ALL SYSTEMS NOMINAL</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#0E1014] border border-[#1F232B]">
                <span className="text-zinc-500 text-[10px] block uppercase">Stock Mutability</span>
                <span className="font-bold text-zinc-200 block mt-0.5">Append-Only Ledger</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0E1014] border border-[#1F232B]">
                <span className="text-zinc-500 text-[10px] block uppercase">Isolation Level</span>
                <span className="font-bold text-zinc-200 block mt-0.5">Snapshot Transaction</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0E1014] border border-[#1F232B]">
                <span className="text-zinc-500 text-[10px] block uppercase">Live Telemetry</span>
                <span className="font-bold text-zinc-200 block mt-0.5">WebSocket Broadcast</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0E1014] border border-[#1F232B]">
                <span className="text-zinc-500 text-[10px] block uppercase">Queue Engine</span>
                <span className="font-bold text-zinc-200 block mt-0.5">BullMQ + Redis 6</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs font-mono text-zinc-500 border-t border-[#232730] pt-6">
          <span>TALLY LOGISTICS CORE // ENTERPRISE</span>
          <span>SECURITY VERIFIED ISO/IEC 27001</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Authentication Terminal */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative">
        {/* Subtle mobile brand header */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#14171E] border border-amber-500/40 text-amber-400 mb-3 font-mono font-bold text-base">
            TL
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Tally</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Warehouse & Order Fulfillment OS</p>
        </div>

        <div className="w-full max-w-md">
          {/* Header text */}
          <div className="mb-6 text-left">
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
              {isLogin ? 'Sign In to Terminal' : 'Register Organization Workspace'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {isLogin
                ? 'Enter organization credentials to access real-time inventory ledger'
                : 'Set up your company tenant, initial warehouse, and administrator'}
            </p>
          </div>

          {/* Quick Demo Personas (1-Click Fill) */}
          <div className="mb-6 p-4 rounded-xl bg-[#0E1014] border border-[#232730] shadow-md">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                1-Click Demo Accounts
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-semibold">CLICK TO POPULATE</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                className={`p-3 rounded-lg border text-left transition-all relative ${
                  selectedPersona === 'admin'
                    ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                    : 'bg-[#14171E] border-[#232730] hover:border-zinc-600 hover:bg-[#181C25]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-zinc-200">Alex Mercer</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    OWNER
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 truncate font-mono">admin@apex.com</div>
                <div className="text-[10px] text-zinc-500 mt-1">Full Org & PO Approval</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('staff')}
                className={`p-3 rounded-lg border text-left transition-all relative ${
                  selectedPersona === 'staff'
                    ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                    : 'bg-[#14171E] border-[#232730] hover:border-zinc-600 hover:bg-[#181C25]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-zinc-200">Marcus Vance</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    STAFF
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 truncate font-mono">marcus.warehouse@...</div>
                <div className="text-[10px] text-zinc-500 mt-1">Pick, Pack & Ship Flow</div>
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-1 mb-5 p-1 bg-[#0E1014] rounded-lg border border-[#232730]">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                isLogin
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                !isLogin
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Register Organization
            </button>
          </div>

          {/* Main Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Apex Global Logistics"
                    className="w-full px-3.5 py-2.5 bg-[#12141A] border border-[#262B35] rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full px-3.5 py-2.5 bg-[#12141A] border border-[#262B35] rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Organization Slug (Tenant ID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
                  placeholder="apex-logistics"
                  className="w-full px-3.5 py-2.5 bg-[#12141A] border border-[#262B35] rounded-lg text-sm text-zinc-100 placeholder-zinc-600 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 bg-[#12141A] border border-[#262B35] rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#12141A] border border-[#262B35] rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg flex items-center gap-2.5 text-rose-300 text-xs font-mono">
                <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold py-2.5 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2 btn-tactile tracking-tight"
            >
              {loading && (
                <svg className="animate-spin w-4 h-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span>{loading ? 'Authenticating...' : isLogin ? 'Access Warehouse Workspace' : 'Create Organization Workspace'}</span>
            </button>
          </form>

          {/* Security badge footer */}
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-500 mt-8">
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Immutable Append-Only Ledger • Real-time Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
