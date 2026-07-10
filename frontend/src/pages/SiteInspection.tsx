import React, { useState } from 'react';
import { api, SiteInspectionResponse } from '../services/api';
import { 
  Camera, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle
} from 'lucide-react';

export const SiteInspection: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<SiteInspectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setInspection(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.vision.inspectSite(formData);
      setInspection(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze site photograph. Try a standard JPG/PNG image.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColors = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="space-y-6">
      
      {/* File Uploader Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400">
          <Camera size={20} />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upload Site Photograph</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
          Supports PNG and JPG work zone photos to run real-time PPE & hazard checks.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-all border border-slate-200 dark:border-slate-800">
            {selectedFile ? selectedFile.name : 'Choose Photo'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              {loading ? 'Analyzing PPE & Hazards...' : 'Run Safety Scan'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex h-60 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-xs text-slate-400 font-semibold animate-pulse">Running contour inspections & PPE object filters...</p>
          </div>
        </div>
      )}

      {inspection && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Annotated image frame */}
          <div className="lg:col-span-2 glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col justify-between overflow-hidden">
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Annotated Safety Scan</h4>
              
              <div className="relative border border-slate-100 dark:border-slate-900 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
                <img 
                  src={inspection.image_url} 
                  alt="Site Inspection Output" 
                  className="max-h-[450px] object-contain w-full"
                />
              </div>
            </div>
            
            <div className="flex gap-4 text-[10px] text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4 font-semibold uppercase">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span> Compliant</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500"></span> Violation</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Concrete Crack</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500"></span> Water Leak</span>
            </div>
          </div>

          {/* Compliance scoring details */}
          <div className="space-y-6">
            
            {/* Health Score */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Compliance Rating
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {inspection.safety_score}%
                </h3>
              </div>
              
              <div className={`rounded-xl p-3 border ${getScoreColors(inspection.safety_score)}`}>
                {inspection.safety_score >= 80 ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
              </div>
            </div>

            {/* Findings list */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Inspection Audit Log</h4>
              
              <div className="space-y-3">
                {inspection.findings.map((f, idx) => {
                  const isCompliance = f.type === 'compliance';
                  return (
                    <div key={idx} className="flex gap-2.5 items-start p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
                        ${isCompliance ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
                      `}>
                        {isCompliance ? '✓' : '!'}
                      </span>
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{f.label}</span>
                        <span className={`text-[10px] font-semibold ${isCompliance ? 'text-green-500' : 'text-red-500'}`}>{f.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Advisory Notice</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                {inspection.inspection_summary}
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
