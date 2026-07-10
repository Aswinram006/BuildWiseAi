import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect target after successful login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }
    
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
      {/* Premium background glowing circles */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-brand-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white font-bold text-2xl shadow-xl shadow-brand-500/20">
            W
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
            BuildWise <span className="text-brand-500">AI</span>
          </h2>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            Enterprise Construction Intelligence Platform
          </p>
        </div>

        {/* Login Form Container */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md glow-card">
          <h3 className="text-xl font-bold text-white mb-6">Sign In</h3>

          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:bg-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <a href="#forgot" className="text-xs text-brand-400 hover:text-brand-300 hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-11 pr-11 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:bg-slate-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 py-3.5 px-4 text-sm font-bold text-white transition-all shadow-lg shadow-brand-600/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Authenticate'
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
            <p className="text-xs text-slate-400">
              New to BuildWise AI?{' '}
              <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 hover:underline">
                Create an Enterprise Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
