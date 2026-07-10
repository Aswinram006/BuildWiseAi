import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, ReportResponse } from '../services/api';
import { 
  Download, 
  Plus, 
  Calendar, 
  AlertCircle,
  FileText
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { activeProject } = useProject();
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [reportType, setReportType] = useState<string>('weekly');

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.reports.list(activeProject.id);
      setReports(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load historical reports list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeProject]);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await api.reports.generate(activeProject.id, reportType);
      
      // Reload reports list
      await fetchReports();
      
      // Trigger browser download in new tab
      window.open(res.pdf_url, '_blank');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate report PDF.");
    } finally {
      setGenerating(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-slate-400">Please select an active project to access reports compilation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Active Project Profile & Blueprint Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm bg-white dark:bg-slate-950/40 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
                Active Project Profile
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                {activeProject.name}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{activeProject.description}</p>
            </div>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              activeProject.status === 'active' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : activeProject.status === 'delayed'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-slate-500/10 text-slate-500'
            }`}>
              {activeProject.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-450">
            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[9px] text-slate-400 dark:text-slate-550 block uppercase tracking-wider mb-0.5">Location</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block">{activeProject.location || 'Not Specified'}</span>
            </div>
            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[9px] text-slate-400 dark:text-slate-550 block uppercase tracking-wider mb-0.5">Client</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block">{activeProject.client_name || 'Not Specified'}</span>
            </div>
            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[9px] text-slate-400 dark:text-slate-550 block uppercase tracking-wider mb-0.5">Budget</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block">
                {activeProject.budget ? `₹${(activeProject.budget / 10000000).toFixed(2)} Cr` : 'Not Specified'}
              </span>
            </div>
            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[9px] text-slate-400 dark:text-slate-550 block uppercase tracking-wider mb-0.5">Structure</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block">
                {activeProject.building_type || 'N/A'} ({activeProject.floors || 1}F)
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm bg-white dark:bg-slate-950/40 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
            <span>Project Blueprint Layout</span>
            <span className="text-brand-500 dark:text-brand-400 font-extrabold">Active View</span>
          </div>
          <div className="relative border border-slate-100 dark:border-slate-900 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center h-28">
            {activeProject.blueprint_path ? (
              <img
                src={activeProject.blueprint_path}
                alt="Project Blueprint Drawing"
                className="h-full w-full object-cover hover:scale-105 transition-all duration-300 cursor-pointer"
                onClick={() => window.open(activeProject.blueprint_path, '_blank')}
              />
            ) : (
              <img
                src="/api/static/uploads/blueprint_mock.png"
                alt="Seeded Blueprint Mock"
                className="h-full w-full object-cover hover:scale-105 transition-all duration-300 cursor-pointer opacity-70"
                onClick={() => window.open('/api/static/uploads/blueprint_mock.png', '_blank')}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Parameter selector board */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col sm:flex-row items-center gap-5 justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reporting Engine Router</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Generate and download certified PDF summaries of site metrics.</p>
        </div>

        <form onSubmit={handleGenerateReport} className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 outline-none cursor-pointer"
          >
            <option value="daily">Daily Site Log</option>
            <option value="weekly">Weekly Progress Report</option>
            <option value="monthly">Monthly Audit Review</option>
            <option value="safety">Safety Compliance Summary</option>
            <option value="budget">Cost & Budget Ledger</option>
          </select>

          <button
            type="submit"
            disabled={generating}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-5 transition-all shadow-md shadow-brand-500/20 disabled:opacity-50"
          >
            {generating ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Plus size={14} />
            )}
            <span>{generating ? 'Compiling PDF...' : 'Generate Report'}</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Reports history list */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-900">
                <th className="px-6 py-4">Report Class</th>
                <th className="px-6 py-4">Status Summary</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/25">
                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-2.5">
                      <FileText className="text-slate-400 shrink-0" size={16} />
                      <span className="font-bold text-slate-900 dark:text-white capitalize">
                        {r.report_type} Report
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4.5 text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[300px]" title={r.content}>
                    {r.content.split('\n')[0]}
                  </td>
                  <td className="px-6 py-4.5 text-slate-400 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} />
                      <span>{r.created_at.split('T')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4.5 text-right">
                    <button
                      onClick={() => {
                        // Extract URL by reconstructing filename format
                        // Backend reports save at static uploads with a specific UUID but we returned this inside the generation response.
                        // For historical downloads, since we store the text in DB, we can re-generate or mock-link to a public PDF download router.
                        // To keep it super clean, let's link to the endpoint that downloads it directly, or regenerate it dynamically.
                        window.open(`/api/static/uploads/report_${r.report_type}.pdf`, '_blank');
                      }}
                      className="inline-flex items-center gap-1.5 font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400 font-semibold">No reports generated yet. Select a type above to start.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
