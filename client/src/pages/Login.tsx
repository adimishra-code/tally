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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row relative selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* LEFT COLUMN: Modern Brand & Telemetry Showcase (visible on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-12 xl:p-16 flex-col justify-between border-r border-slate-800/80 relative overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">Tally</span>
              <span className="text-[11px] uppercase tracking-widest text-blue-400 font-semibold block">Warehouse OS</span>
            </div>
          </div>
        </div>

        {/* Hero Value Content */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>v2.4 Enterprise Architecture Active</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Autonomous stock ledger & high-velocity fulfillment.
          </h2>

          <p className="text-slate-400 text-base leading-relaxed">
            Eliminate inventory discrepancies forever with strict append-only ledger transactions, multi-zone bin tracking, and live WebSocket telemetry.
          </p>

          {/* Architecture telemetry card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2.5">
              <span className="font-semibold text-slate-300">System Telemetry & Guarantees</span>
              <span className="text-emerald-400 font-mono text-[11px]">ALL SYSTEMS NOMINAL</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-500 text-[11px] block">Stock Mutability</span>
                <span className="font-semibold text-slate-200 block mt-0.5">Append-Only Ledger</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-500 text-[11px] block">Isolation Level</span>
                <span className="font-semibold text-slate-200 block mt-0.5">Snapshot Transaction</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-500 text-[11px] block">Live Telemetry</span>
                <span className="font-semibold text-slate-200 block mt-0.5">WebSocket Broadcast</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-500 text-[11px] block">Queue Engine</span>
                <span className="font-semibold text-slate-200 block mt-0.5">BullMQ + Redis 6</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 pt-6">
          <span>Tally Logistics Core • Enterprise Tier</span>
          <span>Security Verified ISO/IEC 27001</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Authentication Terminal */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative">
        {/* Subtle mobile brand header */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white mb-3 shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tally</h1>
          <p className="text-xs text-slate-400 mt-0.5">Warehouse & Order Fulfillment OS</p>
        </div>

        <div className="w-full max-w-md">
          {/* Header text */}
          <div className="mb-6 text-left">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isLogin ? 'Sign In to Workspace' : 'Create Organization Workspace'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isLogin
                ? 'Enter your company credentials to access real-time inventory'
                : 'Set up your company tenant, initial warehouse, and administrator'}
            </p>
          </div>

          {/* Quick Demo Personas (1-Click Fill) */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pre-configured Demo Accounts
              </span>
              <span className="text-[10px] text-blue-400 font-medium">Click to populate</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  selectedPersona === 'admin'
                    ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">Alex Mercer</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    OWNER
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">admin@apex.com</div>
                <div className="text-[10px] text-slate-500 mt-1">Full Org & PO Approval</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('staff')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  selectedPersona === 'staff'
                    ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">Marcus Vance</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-700/60 text-slate-300 border border-slate-600/60">
                    STAFF
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">marcus.warehouse@apex.com</div>
                <div className="text-[10px] text-slate-500 mt-1">Pick, Pack & Ship Flow</div>
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-1 mb-5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                isLogin
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
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
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                !isLogin
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
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
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Apex Global Logistics"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Organization Slug (Tenant ID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
                  placeholder="apex-logistics"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400 text-xs">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading && (
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span>{loading ? 'Authenticating...' : isLogin ? 'Access Workspace' : 'Create Organization & Join'}</span>
            </button>
          </form>

          {/* Security badge footer */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-8">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Immutable Append-Only Ledger • Real-time Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
