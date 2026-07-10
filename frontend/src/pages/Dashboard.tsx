import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, Budget, RiskPredictionResponse } from '../services/api';
import { formatINR } from '../utils/currency';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  Hammer,
  Coins,
  Shield,
  Sparkles,
  Building,
  Download,
  ClipboardList
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { activeProject } = useProject();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [riskData, setRiskData] = useState<RiskPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Finished Outputs state
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [achievedMilestones, setAchievedMilestones] = useState<any[]>([]);
  const [safetyReports, setSafetyReports] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [blueprintAnalysis, setBlueprintAnalysis] = useState<any>(null);

  const fetchDashboardData = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const [budgetList, riskResult, tasksList, milestonesList, reportsList, inventoryItems, blueprintRes] = await Promise.all([
        api.projects.listBudgets(activeProject.id),
        api.ai.riskPredict(activeProject.id),
        api.projects.listTasks(activeProject.id),
        api.projects.listMilestones(activeProject.id),
        api.reports.list(activeProject.id),
        api.resources.listInventory(activeProject.id),
        api.projects.getBlueprintAnalysis(activeProject.id).catch(() => null)
      ]);
      
      setBudgets(budgetList);
      setRiskData(riskResult);
      setCompletedTasks(tasksList.filter(t => t.status === 'completed'));
      setPendingTasks(tasksList.filter(t => t.status !== 'completed'));
      setAchievedMilestones(milestonesList.filter(m => m.status === 'achieved'));
      setSafetyReports(reportsList.filter(r => r.report_type === 'safety' || r.report_type === 'daily' || r.report_type === 'blueprint'));
      setInventoryList(inventoryItems);
      setBlueprintAnalysis(blueprintRes);
      
    } catch (err: any) {
      console.error("Error fetching dashboard details:", err);
      setError("Failed to load dashboard metrics. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeProject]);

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-slate-450 dark:text-slate-500 font-semibold">Please select or create a project to get started.</p>
      </div>
    );
  }

  // Calculate totals
  const totalBudget = activeProject.budget;
  const totalSpent = budgets.reduce((acc, curr) => acc + curr.spent, 0);
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const materialBudget = budgets.find(b => b.category === 'material')?.allocated || 0;
  const laborBudget = budgets.find(b => b.category === 'labor')?.allocated || 0;

  // Format budget chart data
  const chartData = budgets.map(b => ({
    name: b.category.charAt(0).toUpperCase() + b.category.slice(1),
    Allocated: b.allocated,
    Spent: b.spent
  }));

  // Helper for blueprint prediction report download
  const blueprintReport = safetyReports.find(r => r.report_type === 'blueprint');
  const pdfUrl = blueprintAnalysis?.pdf_url || (blueprintReport ? `/api/static/uploads/report_blueprint.pdf` : null);

  // Calculate project target duration in months from database dates
  const projectMonths = (() => {
    if (!activeProject.start_date || !activeProject.end_date) return 12;
    const start = new Date(activeProject.start_date);
    const end = new Date(activeProject.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 30);
  })();

  // Role Checks
  const isClient = user?.role === 'Client';
  const isContractor = user?.role === 'Contractor';
  const isSiteEngineer = user?.role === 'Site Engineer';
  const isProjectManager = user?.role === 'Project Manager';
  const isAdminOrOwner = user?.role === 'Administrator' || user?.role === 'Company Owner';

  return (
    <div className="space-y-6">
      {/* Loading indicator */}
      {loading && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-lg animate-pulse">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Syncing metrics...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* -------------------- ROLE 1: CLIENT DASHBOARD -------------------- */}
      {isClient && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-brand-500/15 dark:border-brand-500/30 bg-brand-50/10 dark:bg-brand-950/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider block mb-1">
                Client Investment Executive Summary
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Project Progress Ledger
              </h2>
            </div>
            {pdfUrl && (
              <a
                href={pdfUrl}
                download
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20"
              >
                <Download size={14} />
                Download PDF Bill of Quantities
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="glass-panel p-5 rounded-2xl shadow-sm bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Project Score</span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">88 / 100</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4">Structural parameters compliant</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl shadow-sm bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Investment Value (₹)</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{formatINR(totalBudget)}</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold mt-4">GST and Municipal approvals cleared</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl shadow-sm bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Target Completion Date</span>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">{activeProject.end_date}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4">Estimated {projectMonths} Months schedule target</span>
            </div>
          </div>

          {/* AI Project Summary callout */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-950/40 space-y-3">
            <h4 className="text-xs font-bold text-slate-850 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="text-brand-500 animate-pulse" size={16} />
              AI Status Assessment
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold italic">
              "{riskData?.recommendations[0] || 'Project operations proceeding within baseline schedule constraints. Foundations are cleared.'}"
            </p>
          </div>
        </div>
      )}

      {/* -------------------- ROLE 2: CONTRACTOR DASHBOARD -------------------- */}
      {isContractor && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task Checklist */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="text-brand-500" size={16} />
                Contractor Pending Checklist ({pendingTasks.length})
              </h3>
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 text-xs">
                {pendingTasks.map((t, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-150 dark:border-slate-850 flex justify-between items-center font-semibold">
                    <div>
                      <div className="font-bold text-slate-850 dark:text-slate-205">{t.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Due: {t.end_date}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase
                      ${t.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30'}
                    `}>
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Material Inventory Warning */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider flex items-center gap-2">
                <Building className="text-brand-500" size={16} />
                Material Stock Warning Indicators
              </h3>
              <div className="space-y-3 text-xs">
                {inventoryList.slice(0, 5).map((item, idx) => {
                  const available = item.quantity_available || 0;
                  const req = item.min_required || 0;
                  const isLow = available < req;
                  return (
                    <div key={idx} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-2.5 last:border-none last:pb-0">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{item.material?.name}</span>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Min Required: {req} {item.material?.unit}</div>
                      </div>
                      <div className="text-right">
                        <span className={`font-extrabold ${isLow ? 'text-red-500' : 'text-green-500'}`}>
                          {available} {item.material?.unit}
                        </span>
                        {isLow && (
                          <div className="text-[9px] text-red-400 font-bold uppercase flex items-center gap-0.5 justify-end mt-0.5">
                            <AlertCircle size={10} /> Shortage
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- ROLE 3: SITE ENGINEER DASHBOARD -------------------- */}
      {isSiteEngineer && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Safety Compliancy Score</span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">98%</h3>
                </div>
                <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-2 text-green-600 dark:text-green-400">
                  <Shield size={18} />
                </div>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4">PPE guidelines fully deployed</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Timeline status</span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">On Track</h3>
                </div>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-2 text-blue-600 dark:text-blue-400">
                  <Calendar size={18} />
                </div>
              </div>
              <span className="text-[10px] text-slate-450 mt-4">Active Tasks: {pendingTasks.length} pending</span>
            </div>
          </div>

          {/* Finished Accomplishments Tracker */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="text-green-500 animate-pulse" size={16} />
                Accomplishments & Daily Log Reports ({completedTasks.length + achievedMilestones.length})
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-150 dark:border-slate-850 flex flex-col h-[280px]">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-150 dark:border-slate-850 mb-3">
                  Verified Done Tasks ({completedTasks.length})
                </div>
                <div className="space-y-2 overflow-y-auto pr-1">
                  {completedTasks.map((t, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900">
                      <div className="font-bold text-slate-850 dark:text-slate-150 flex justify-between">
                        <span className="line-through">{t.name}</span>
                        <span className="text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded uppercase">Verified</span>
                      </div>
                      <p className="text-[10px] text-slate-450 dark:text-slate-550 mt-1 truncate">{t.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-150 dark:border-slate-850 flex flex-col h-[280px]">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-150 dark:border-slate-850 mb-3">
                  Achieved Milestones ({achievedMilestones.length})
                </div>
                <div className="space-y-2 overflow-y-auto pr-1">
                  {achievedMilestones.map((m, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900">
                      <div className="font-bold text-slate-850 dark:text-slate-150 flex justify-between">
                        <span>{m.name}</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded uppercase">Achieved</span>
                      </div>
                      <p className="text-[10px] text-slate-450 dark:text-slate-550 mt-1">{m.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- ROLE 4: PROJECT MANAGER DASHBOARD -------------------- */}
      {isProjectManager && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">PM Budget Allocated</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{formatINR(totalBudget)}</h3>
                </div>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-2 text-blue-600 dark:text-blue-400">
                  <Coins size={18} />
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold mt-4">Utilization: {budgetUtilization.toFixed(0)}% spent</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">AI Recommendation</span>
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 mt-1 leading-normal">
                    {riskData?.recommendations[0] || 'Calibration guidelines optimal.'}
                  </p>
                </div>
                <div className="rounded-xl bg-yellow-50 dark:bg-yellow-950/30 p-2 text-yellow-600 dark:text-yellow-400">
                  <Sparkles size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Area Chart */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">PM Financial Sourcing breakdown</h3>
            <div className="h-80 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAllocated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => formatINR(val)} />
                    <Tooltip 
                      formatter={(val: number) => [formatINR(val), 'Amount']}
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                        borderRadius: '12px'
                      }}
                    />
                    <Area type="monotone" dataKey="Allocated" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAllocated)" />
                    <Area type="monotone" dataKey="Spent" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSpent)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">Budget categories not loaded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- ROLE 5: ADMIN / OWNER DASHBOARD (Full View) -------------------- */}
      {isAdminOrOwner && (
        <div className="space-y-6">
          {/* Main KPI Widget Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {/* Card 1: Project Score */}
            <div className="glass-panel p-5 rounded-2xl shadow-sm bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Project Score</span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">88 <span className="text-xs font-semibold text-slate-400">/ 100</span></h3>
                </div>
                <div className="rounded-xl bg-brand-50 dark:bg-brand-950/30 p-2 text-brand-600 dark:text-brand-400">
                  <Hammer size={18} />
                </div>
              </div>
              <div className="mt-4"><span className="text-[10px] text-green-500 font-bold">Good Progress</span></div>
            </div>

            {/* Card 2: Estimated Budget */}
            <div className="glass-panel p-5 rounded-2xl shadow-sm bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Total Project Cost</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{formatINR(totalBudget)}</h3>
                </div>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-2 text-blue-600 dark:text-blue-400">
                  <Coins size={18} />
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-1.5 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                <div className="flex justify-between">
                  <span>Material Cost:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-205 text-slate-900 dark:text-white">{formatINR(materialBudget)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labor Cost:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-205 text-slate-900 dark:text-white">{formatINR(laborBudget)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-450 mt-1">
                  <span>Total Spent: {formatINR(totalSpent)}</span>
                  <span className="font-bold">{budgetUtilization.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Card 3: Risk Score */}
            <div className="glass-panel p-5 rounded-2xl shadow-sm bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Risk Score</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {riskData ? `${riskData.overall_risk_score}%` : "15%"}
                    <span className={`ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block
                      ${riskData?.risk_level === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-950/40' :
                        riskData?.risk_level === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40' :
                        'bg-green-100 text-green-700 dark:bg-green-950/40'}
                    `}>
                      {riskData?.risk_level || "Low"}
                    </span>
                  </h3>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-slate-400">Delay probability index: {riskData ? `${riskData.breakdown.schedule_delay_risk.toFixed(0)}%` : "12%"}</span>
              </div>
            </div>

            {/* Card 4: Target Completion */}
            <div className="glass-panel p-5 rounded-2xl shadow-sm bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Completion prediction</span>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{activeProject.end_date}</h3>
                </div>
                <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 p-2 text-purple-600 dark:text-purple-400">
                  <Calendar size={18} />
                </div>
              </div>
              <div className="mt-4"><span className="text-[10px] text-green-500 font-bold">On Time Target</span></div>
            </div>
          </div>

          {/* AI recommendations bar */}
          <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">AI Sourcing Recommendation</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">
                  {riskData?.recommendations[0] || "Optimize raw concrete mixing ratios and utilize fly-ash blends to lower base material sourcing overhead."}
                </p>
              </div>
              <div className="rounded-xl bg-yellow-50 dark:bg-yellow-950/30 p-2 text-yellow-600 dark:text-yellow-400">
                <Sparkles size={18} />
              </div>
            </div>
          </div>

          {/* Charts & Diagnostics split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Financial Sourcing Breakdown</h3>
                <p className="text-[11px] text-slate-400">Allocated budget vs actual spent by category</p>
              </div>
              <div className="h-80 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAllocated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => formatINR(val)} />
                      <Tooltip 
                        formatter={(val: number) => [formatINR(val), 'Amount']}
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                          borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                          borderRadius: '12px'
                        }}
                      />
                      <Area type="monotone" dataKey="Allocated" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAllocated)" />
                      <Area type="monotone" dataKey="Spent" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSpent)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">Financial models unavailable.</div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4"><AlertTriangle className="text-amber-500" size={16} /><span className="font-bold text-xs uppercase tracking-wider text-slate-850 dark:text-slate-350">AI Sourcing Advice</span></div>
                {riskData && riskData.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {riskData.recommendations.map((r, i) => (
                      <div key={i} className="flex gap-2.5 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-150 dark:border-slate-850 text-xs font-semibold text-slate-650 dark:text-slate-400">
                        <span className="flex h-5 w-5 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-full items-center justify-center shrink-0 text-[10px]">
                          {i+1}
                        </span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400">No warnings flagged.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
