import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, RiskPredictionResponse } from '../services/api';
import { 
  CheckCircle2, 
  AlertCircle,
  Compass
} from 'lucide-react';

export const RiskPrediction: React.FC = () => {
  const { activeProject } = useProject();
  const [prediction, setPrediction] = useState<RiskPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRisk = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.ai.riskPredict(activeProject.id);
      setPrediction(res);
    } catch (err: any) {
      console.error(err);
      setError("AI Risk prediction pipeline encountered an error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisk();
  }, [activeProject]);

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-slate-400">Please select an active project to analyze site risk metrics.</p>
      </div>
    );
  }

  // Get color style based on risk level
  const getRiskColors = (level: string) => {
    if (level === 'High') {
      return {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/10 border-red-500/20',
        glow: 'shadow-red-500/10 border-red-500/30',
        badge: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
        bar: 'bg-red-500'
      };
    } else if (level === 'Medium') {
      return {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        glow: 'shadow-amber-500/10 border-amber-500/30',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
        bar: 'bg-amber-500'
      };
    } else {
      return {
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-500/10 border-green-500/20',
        glow: 'shadow-green-500/10 border-green-500/30',
        badge: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
        bar: 'bg-green-500'
      };
    }
  };

  const colors = prediction ? getRiskColors(prediction.risk_level) : null;

  return (
    <div className="space-y-6">
      
      {loading && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-lg animate-pulse">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Running Risk Predictor models...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {prediction && colors ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Circular overall gauge panel */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col items-center justify-between min-h-[380px]">
            <div className="text-center w-full">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                AI Composite Health Score
              </span>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Overall Project Risk</h4>
            </div>

            {/* Glowing circle gauge */}
            <div className="relative my-6 flex h-44 w-44 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 shadow-inner">
              
              {/* Spinning background halo border */}
              <div 
                className={`absolute inset-0 rounded-full border-[10px] border-slate-200 dark:border-slate-800`}
              />
              <div 
                className={`absolute inset-0 rounded-full border-[10px] border-transparent border-t-brand-600 border-r-brand-500 animate-spin`}
                style={{ animationDuration: '6s' }}
              />

              <div className="text-center z-10">
                <span className={`text-4xl font-extrabold font-display block ${colors.text}`}>
                  {prediction.overall_risk_score}%
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1.5 ${colors.badge}`}>
                  {prediction.risk_level} Risk
                </span>
              </div>
            </div>

            <div className="text-center text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-semibold block mb-0.5">Model Certainty index</span>
              <div className="flex items-center justify-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                <Compass size={14} className="text-slate-400" />
                <span>{(prediction.confidence * 100).toFixed(0)}% Confidence level</span>
              </div>
            </div>
          </div>

          {/* Sub-risks breakdown panel */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Schedule & Financial Risk Vectors</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Probability rates generated by the active neural network</p>
              
              <div className="space-y-4 text-xs">
                
                {/* 1. Schedule delay */}
                <div>
                  <div className="flex justify-between items-center mb-1.5 font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Schedule Delay Risk</span>
                    <span className="text-slate-900 dark:text-white">{prediction.breakdown.schedule_delay_risk}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${prediction.breakdown.schedule_delay_risk > 75 ? 'bg-red-500' : prediction.breakdown.schedule_delay_risk > 40 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${prediction.breakdown.schedule_delay_risk}%` }}
                    />
                  </div>
                </div>

                {/* 2. Budget overrun */}
                <div>
                  <div className="flex justify-between items-center mb-1.5 font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Budget Overrun Risk</span>
                    <span className="text-slate-900 dark:text-white">{prediction.breakdown.budget_overrun_risk}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${prediction.breakdown.budget_overrun_risk > 75 ? 'bg-red-500' : prediction.breakdown.budget_overrun_risk > 40 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${prediction.breakdown.budget_overrun_risk}%` }}
                    />
                  </div>
                </div>

                {/* 3. Material shortage */}
                <div>
                  <div className="flex justify-between items-center mb-1.5 font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Material Shortage Risk</span>
                    <span className="text-slate-900 dark:text-white">{prediction.breakdown.material_shortage_risk}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${prediction.breakdown.material_shortage_risk > 75 ? 'bg-red-500' : prediction.breakdown.material_shortage_risk > 40 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${prediction.breakdown.material_shortage_risk}%` }}
                    />
                  </div>
                </div>

                {/* 4. Equipment failure */}
                <div>
                  <div className="flex justify-between items-center mb-1.5 font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Equipment Failure Risk</span>
                    <span className="text-slate-900 dark:text-white">{prediction.breakdown.equipment_failure_risk}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${prediction.breakdown.equipment_failure_risk > 75 ? 'bg-red-500' : prediction.breakdown.equipment_failure_risk > 40 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${prediction.breakdown.equipment_failure_risk}%` }}
                    />
                  </div>
                </div>

              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 font-medium">
              * Risk assessments are refreshed dynamically upon change of site inventory quantities, task completions, and machinery schedules.
            </div>
          </div>

          {/* AI Recommendations panel */}
          <div className="col-span-full glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="text-green-500" size={18} />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Diagnostics & Corrective Recommendations</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prediction.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-2.5 items-start p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      )}

    </div>
  );
};
