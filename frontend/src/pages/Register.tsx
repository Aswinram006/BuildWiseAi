import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, Lock, Building, AlertCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Client'); // Default
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'Administrator', label: 'System Administrator' },
    { value: 'Company Owner', label: 'Company Owner / Executive' },
    { value: 'Project Manager', label: 'Project Manager (PM)' },
    { value: 'Site Engineer', label: 'Site Engineer' },
    { value: 'Contractor', label: 'Sub-Contractor' },
    { value: 'Client', label: 'Project Client / Stakeholder' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !role) {
      setError('Please complete all required fields.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register(fullName, email, password, role, companyName || undefined);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Ensure email is unique and try again.');
    } finally {
      setLoading(false);
    }
  };

  const showCompanyField = ['Administrator', 'Company Owner', 'Project Manager'].includes(role);

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
      {/* Background glowing circles */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-brand-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white font-bold text-2xl shadow-xl shadow-brand-500/20">
            W
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
            Create Account
          </h2>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            Join BuildWise AI Enterprise Construction Network
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-8 shadow-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md glow-card">
          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Diana Prince"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:bg-slate-900"
                  required
                />
              </div>
            </div>

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
                  placeholder="diana@company.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:bg-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Role in Construction
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:bg-slate-900 cursor-pointer"
                required
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value} className="bg-slate-900 text-white">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {showCompanyField && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Company / Organization Name
                </label>
                <div className="relative">
                  <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Apex Construction Group"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:bg-slate-900"
                    required={showCompanyField}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:bg-slate-900"
                  required
                />
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
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
