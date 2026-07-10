import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, CostEstimateResponse } from '../services/api';
import { formatINR } from '../utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Calculator, 
  Sparkles, 
  CheckCircle2, 
  Coins, 
  AlertCircle,
  TrendingDown
} from 'lucide-react';

export const CostEstimation: React.FC = () => {
  const { activeProject, refreshProjects } = useProject();
  
  // Input fields
  const [landArea, setLandArea] = useState<number>(2400);
  const [area, setArea] = useState<number>(1500); // built-up area
  const [finish, setFinish] = useState<'economy' | 'standard' | 'luxury'>('standard');
  const [laborCostPerDay, setLaborCostPerDay] = useState<number>(650);
  const [additionalCosts, setAdditionalCosts] = useState<number>(120000);
  
  const [estimate, setEstimate] = useState<CostEstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing cost estimate when activeProject changes
  useEffect(() => {
    const loadEstimate = async () => {
      if (!activeProject) {
        setEstimate(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await api.ai.getCostEstimate(activeProject.id);
        setEstimate(res);
        // Also update form inputs if estimate results are present
        if (res) {
          const data = await api.projects.getBlueprintAnalysis(activeProject.id).catch(() => null);
          if (data) {
            setArea(data.built_up_area_sqft || 1500);
            if (data.material_quality) {
              const q = data.material_quality.toLowerCase();
              if (q === 'luxury' || q === 'standard' || q === 'economy') {
                setFinish(q as 'luxury' | 'standard' | 'economy');
              }
            }
          }
        }
      } catch (err: any) {
        console.error("No existing estimate found:", err);
        setEstimate(null);
      } finally {
        setLoading(false);
      }
    };
    loadEstimate();
  }, [activeProject]);

  const handleRunEstimation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    
    setLoading(true);
    setError(null);
    try {
      // Standard local labor index relative to ₹650 standard wage
      const localLaborIndex = laborCostPerDay / 650.0;
      const res = await api.ai.costEstimate({
        project_id: activeProject.id,
        building_area_sqft: Number(area),
        standard_of_finish: finish,
        local_labor_index: Number(localLaborIndex)
      });
      
      // Inject additional costs into total predicted cost dynamically if entered!
      res.total_estimated_cost = res.total_estimated_cost + additionalCosts;
      
      setEstimate(res);
      await refreshProjects(activeProject.id);
    } catch (err: any) {
      console.error(err);
      setError("AI Cost estimation service failed. Check backend components.");
    } finally {
      setLoading(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-slate-400">Please select an active project to run cost estimates.</p>
      </div>
    );
  }

  // Format Recharts data
  const chartData = estimate ? [
    { name: 'Materials', amount: estimate.material_estimate, fill: '#3b82f6' },
    { name: 'Labor', amount: estimate.labor_estimate, fill: '#10b981' },
    { name: 'Equipment', amount: estimate.equipment_estimate, fill: '#8b5cf6' },
    { name: 'Overhead & Permits', amount: estimate.permits_and_overhead, fill: '#f59e0b' }
  ] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Parameter Selection panel */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="text-brand-500" size={20} />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Estimate Parameters</h3>
        </div>

        <form onSubmit={handleRunEstimation} className="space-y-5 text-xs">
          
          {/* Land Area */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Land Area (Sq Ft)
              </label>
              <span className="font-bold text-brand-600 dark:text-brand-400">{landArea.toLocaleString()} Sq Ft</span>
            </div>
            <input
              type="number"
              value={landArea}
              onChange={(e) => setLandArea(Number(e.target.value))}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 outline-none text-slate-850 dark:text-slate-200"
            />
          </div>

          {/* Built-up Area */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Built-up Area (Sq Ft)
              </label>
              <span className="font-bold text-brand-600 dark:text-brand-400">{area.toLocaleString()} Sq Ft</span>
            </div>
            <input
              type="range"
              min="500"
              max="50000"
              step="100"
              value={area}
              onChange={(e) => setArea(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
          </div>

          {/* Material standard level */}
          <div>
            <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Material Quality Class
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['economy', 'standard', 'luxury'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFinish(opt)}
                  className={`
                    py-2.5 px-3 rounded-xl border text-center font-bold capitalize transition-all
                    ${finish === opt 
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-500/10' 
                      : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/50'}
                  `}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Local labor index */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Local Labor Cost (₹ / Day)
              </label>
              <span className="font-bold text-brand-600 dark:text-brand-400">₹{laborCostPerDay}</span>
            </div>
            <input
              type="range"
              min="300"
              max="2000"
              step="50"
              value={laborCostPerDay}
              onChange={(e) => setLaborCostPerDay(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
          </div>

          {/* Additional Costs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Additional / Site Costs (₹)
              </label>
              <span className="font-bold text-brand-600 dark:text-brand-400">{formatINR(additionalCosts)}</span>
            </div>
            <input
              type="number"
              value={additionalCosts}
              onChange={(e) => setAdditionalCosts(Number(e.target.value))}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 outline-none text-slate-850 dark:text-slate-200"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 px-4 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Sparkles size={14} />
                <span>Estimate Project Cost</span>
              </>
            )}
          </button>

        </form>
      </div>

      {/* Results details */}
      <div className="lg:col-span-2 space-y-6">
        
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {estimate ? (
          <div className="space-y-6">
            
            {/* KPI overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="glass-panel p-5 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Total Estimated Cost
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {formatINR(estimate.total_estimated_cost)}
                  </h3>
                </div>
                <div className="rounded-xl bg-brand-50 dark:bg-brand-950/30 p-3 text-brand-600 dark:text-brand-400">
                  <Coins size={22} />
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Contract Variance
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {formatINR(activeProject.budget - estimate.total_estimated_cost)}
                  </h3>
                </div>
                <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-3 text-green-600 dark:text-green-400">
                  <TrendingDown size={22} />
                </div>
              </div>
            </div>

            {/* Recharts Bar chart */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6">Estimate Cost Breakdowns</h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b15" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => formatINR(val)} />
                    <Tooltip 
                      formatter={(val: number) => [formatINR(val), 'Amount']}
                      contentStyle={{ borderRadius: '12px' }}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Material Sizing Breakdown List */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Estimated Material Sizing Ledger</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-900 text-[10px] uppercase font-bold text-slate-400">
                      <th className="py-2.5">Material Class</th>
                      <th className="py-2.5">Calculated Quantity</th>
                      <th className="py-2.5 text-right">Cost (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50 dark:divide-slate-900/50 text-slate-600 dark:text-slate-300">
                    <tr>
                      <td className="py-2.5 font-semibold">Cement bags</td>
                      <td className="py-2.5">{(area * 0.4).toFixed(0)} Bags</td>
                      <td className="py-2.5 text-right font-bold">{formatINR(estimate.material_estimate * 0.15)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold">Steel Rebar</td>
                      <td className="py-2.5">{(area * 0.0025).toFixed(1)} Tons</td>
                      <td className="py-2.5 text-right font-bold">{formatINR(estimate.material_estimate * 0.25)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold">Sand / Aggregates</td>
                      <td className="py-2.5">{(area * 0.0015).toFixed(1)} Brass</td>
                      <td className="py-2.5 text-right font-bold">{formatINR(estimate.material_estimate * 0.08)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold">Bricks & Blocks</td>
                      <td className="py-2.5">{(area * 8).toLocaleString()} units</td>
                      <td className="py-2.5 text-right font-bold">{formatINR(estimate.material_estimate * 0.12)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold">Paint & Finishing</td>
                      <td className="py-2.5">{(area * 0.15).toFixed(0)} Litres</td>
                      <td className="py-2.5 text-right font-bold">{formatINR(estimate.material_estimate * 0.06)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold">Electrical Materials</td>
                      <td className="py-2.5">{(area * 0.5).toFixed(0)} meters</td>
                      <td className="py-2.5 text-right font-bold">{formatINR(estimate.material_estimate * 0.09)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold">Plumbing Sanitary</td>
                      <td className="py-2.5">{(area * 0.2).toFixed(0)} fixtures</td>
                      <td className="py-2.5 text-right font-bold">{formatINR(estimate.material_estimate * 0.07)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold">Flooring Tiles</td>
                      <td className="py-2.5">{(area * 1.1).toFixed(0)} Sq Ft</td>
                      <td className="py-2.5 text-right font-bold">{formatINR(estimate.material_estimate * 0.10)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold">Roofing & Concrete Aggregates</td>
                      <td className="py-2.5">{(area * 0.02).toFixed(0)} units</td>
                      <td className="py-2.5 text-right font-bold">{formatINR(estimate.material_estimate * 0.08)}</td>
                    </tr>
                    <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <td className="py-3 font-bold text-slate-800 dark:text-slate-200" colSpan={2}>Total Materials Ledger Value</td>
                      <td className="py-3 text-right font-black text-brand-600 dark:text-brand-400">{formatINR(estimate.material_estimate)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendations */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">AI Budget Recommendations</h4>
              <div className="space-y-3.5">
                {estimate.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-xs font-medium text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={16} />
                    <p className="leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="glass-panel h-full flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-slate-100 dark:border-slate-900/60 shadow-sm py-20">
            <Calculator size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Run Construction Estimator</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-sm leading-relaxed">
              Use parameters on the left panel to execute scikit-learn models and compile financial predictions for materials, labor wages, and machinery leasing.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
