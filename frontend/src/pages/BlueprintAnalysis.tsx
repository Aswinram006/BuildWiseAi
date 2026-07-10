import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { 
  Upload, 
  Layers, 
  Ruler,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Coins,
  Building,
  Shield,
  Calendar,
  Download,
  MapPin,
  User,
  Clock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export const BlueprintAnalysis: React.FC = () => {
  const { refreshProjects, setActiveProject, activeProject } = useProject();

  // Form States
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [buildingType, setBuildingType] = useState('Residential');
  const [floors, setFloors] = useState<number>(1);
  const [materialQuality, setMaterialQuality] = useState('Standard');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formMode, setFormMode] = useState<'existing' | 'new'>('existing');

  // Status States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Analysis Results
  const [results, setResults] = useState<any | null>(null);
  const [lastLoadedProjectId, setLastLoadedProjectId] = useState<number | null>(null);

  // Users List for PM/Engineer Names
  const [users, setUsers] = useState<any[]>([]);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'layout' | 'financials' | 'timeline' | 'recommendations'>('layout');

  // Load users list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const uList = await api.auth.listUsers();
        setUsers(uList);
      } catch (err) {
        console.error("Failed to load user list:", err);
      }
    };
    fetchUsers();
  }, []);

  // Auto-load blueprint analysis when activeProject changes
  useEffect(() => {
    const loadProjectAnalysis = async () => {
      if (!activeProject) {
        setResults(null);
        setLastLoadedProjectId(null);
        setFormMode('new');
        return;
      }
      
      // If it is already the active project, skip fetching to prevent loops
      if (activeProject.id === lastLoadedProjectId) {
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        const data = await api.projects.getBlueprintAnalysis(activeProject.id);
        setResults(data);
        setLastLoadedProjectId(activeProject.id);
        setName(activeProject.name || '');
        setClientName(activeProject.client_name || '');
        setLocation(activeProject.location || '');
        setBuildingType(activeProject.building_type || 'Residential');
        setFloors(activeProject.floors || 1);
        setMaterialQuality(activeProject.material_quality || 'Standard');
        setFormMode('existing');
      } catch (err: any) {
        // If not found, reset results so form is shown
        setResults(null);
        setLastLoadedProjectId(null);
        setSelectedFile(null);
        setFormMode('existing');
      } finally {
        setLoading(false);
      }
    };

    loadProjectAnalysis();
  }, [activeProject, lastLoadedProjectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile) {
      setError("Please select a blueprint file (PDF, PNG, or JPG) to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const steps = [
      "Uploading building blueprint file...",
      "Running OpenCV contour & segment identification...",
      "Extracting bedroom, bathroom, staircase and partition counts...",
      "Estimating required concrete, steel, cement & local materials...",
      "Compiling detailed CPWD-grade Cost Estimate (INR)...",
      "Scheduling construction phases timeline...",
      "Generating AI risk cards and sequence review...",
      "Compiling professional PDF report..."
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setLoadingStep(steps[stepIndex]);
      }
    }, 1800);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("client_name", clientName);
    formData.append("location", location);
    formData.append("building_type", buildingType);
    formData.append("floors", floors.toString());
    formData.append("material_quality", materialQuality);
    formData.append("file", selectedFile);

    try {
      const response = await api.projects.createWithBlueprint(formData);
      clearInterval(stepInterval);
      setResults(response.blueprint_analysis);
      
      if (response.project) {
        // Set lastLoadedProjectId immediately to block the useEffect fetch loop
        setLastLoadedProjectId(response.project.id);
        setActiveProject(response.project);
        // Update projects sidebar
        await refreshProjects(response.project.id);
      } else {
        // Fallback update projects sidebar
        await refreshProjects();
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      setError(err.message || "Failed to create project and analyze blueprint. Please verify file structure.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleUploadExistingBlueprint = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeProject) return;
    if (!selectedFile) {
      setError("Please select a blueprint file (PDF, PNG, or JPG) to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const steps = [
      "Uploading blueprint to project...",
      "Running OpenCV contour & segment identification...",
      "Extracting bedroom, bathroom, staircase and partition counts...",
      "Estimating required concrete, steel, cement & local materials...",
      "Compiling detailed Cost Estimate (INR)...",
      "Scheduling construction phases timeline...",
      "Generating AI risk cards and sequence review...",
      "Compiling professional PDF report..."
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setLoadingStep(steps[stepIndex]);
      }
    }, 1800);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await api.projects.uploadBlueprint(activeProject.id, formData);
      clearInterval(stepInterval);
      setResults(response.blueprint_analysis);
      setLastLoadedProjectId(response.project.id);
      setActiveProject(response.project);
      await refreshProjects(response.project.id);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      setError(err.message || "Failed to upload blueprint. Please verify file format.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleReanalyze = async () => {
    if (!activeProject) return;

    setLoading(true);
    setError(null);

    const steps = [
      "Running OpenCV contour & segment identification...",
      "Extracting bedroom, bathroom, staircase and partition counts...",
      "Estimating required concrete, steel, cement & local materials...",
      "Compiling detailed CPWD-grade Cost Estimate (INR)...",
      "Scheduling construction phases timeline...",
      "Generating AI risk cards and sequence review...",
      "Compiling professional PDF report..."
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setLoadingStep(steps[stepIndex]);
      }
    }, 1800);

    try {
      const response = await api.projects.reanalyzeBlueprint(activeProject.id);
      clearInterval(stepInterval);
      setResults(response);
      setLastLoadedProjectId(activeProject.id);
      await refreshProjects(activeProject.id);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      setError(err.message || "Failed to re-analyze blueprint. Please verify file exists.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };



  // Sub-metrics formatting
  const estRooms = results?.room_details || {};
  const costBreakdown = results?.cost_breakdown || {};
  const materialsList = results?.material_estimations || [];
  const timelineObj = results?.timeline || {};
  const review = results?.ai_review || {};
  const assigned = results?.project_assigned || {};
  
  const assignedPM = users.find(u => u.id === activeProject?.assigned_pm_id)?.full_name || "Not Assigned";
  const assignedEngineer = users.find(u => u.id === activeProject?.assigned_engineer_id)?.full_name || "Not Assigned";

  const getMaterialData = (namePattern: string) => {
    const item = materialsList.find((m: any) => m.name.toLowerCase().includes(namePattern.toLowerCase()));
    return item ? `${item.quantity.toLocaleString()} ${item.unit}` : "N/A";
  };

  const getPhaseWeeks = (phaseName: string) => {
    return timelineObj.phases?.find((p: any) => p.phase === phaseName)?.duration_weeks || 0;
  };
  
  const foundationWeeks = getPhaseWeeks("Foundation");
  const structureWeeks = getPhaseWeeks("Site Preparation") + getPhaseWeeks("Column Work") + getPhaseWeeks("Wall Construction");
  const roofingWeeks = getPhaseWeeks("Roofing");
  const electricalWeeks = getPhaseWeeks("Electrical Work");
  const plumbingWeeks = getPhaseWeeks("Plumbing");
  const interiorWeeks = getPhaseWeeks("Flooring") + getPhaseWeeks("Painting");
  const finishingWeeks = getPhaseWeeks("Finishing");

  return (
    <div className="space-y-6">
      {!loading && !error && !results && (
        <div className="max-w-4xl mx-auto">
          {/* Tab switcher if activeProject is set */}
          {activeProject && (
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/50 dark:border-slate-800 mb-6 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => setFormMode('existing')}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all
                  ${formMode === 'existing' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
                `}
              >
                Upload to {activeProject.name}
              </button>
              <button
                type="button"
                onClick={() => setFormMode('new')}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all
                  ${formMode === 'new' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
                `}
              >
                Create New Project
              </button>
            </div>
          )}

          {formMode === 'existing' && activeProject ? (
            <div className="glass-panel p-8 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-xl space-y-6 bg-white dark:bg-slate-950/40">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="text-brand-500 animate-pulse" size={20} />
                  Analyze Active Project Blueprint
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Upload a building plan blueprint drawing for the active project **"{activeProject.name}"**. BuildWise AI will instantly perform quantity take-offs, timeline projection, cost breakdowns, and build a professional PDF report.
                </p>
              </div>

              <form onSubmit={handleUploadExistingBlueprint} className="space-y-6">
                {/* Blueprint Drag & Drop Zone */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Upload Building Blueprint
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                      selectedFile
                        ? 'border-brand-500 bg-brand-500/[0.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-brand-500 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="h-12 w-12 rounded-2xl bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3.5 shadow-sm">
                      <Upload size={22} />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-slate-855 dark:text-slate-200">
                          Drag and drop blueprint here, or <span className="text-brand-500 underline">browse computer</span>
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                          Supports architectural PDF maps, PNG structural drawings, or high-res JPG sheets.
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="existing-blueprint-input"
                    />
                    <label htmlFor="existing-blueprint-input" className="absolute inset-0 cursor-pointer" />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!selectedFile || loading}
                    className="bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-bold py-3.5 px-8 rounded-xl text-xs transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    Upload & Run AI Analysis
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Main creation card */
            <div className="glass-panel p-8 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-xl space-y-6 bg-white dark:bg-slate-950/40">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="text-brand-500 animate-pulse" size={20} />
                  Create New Project & AI Survey
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Enter project specifications and upload the CAD or blueprint drawing. BuildWise AI will instantly perform quantity take-offs, timeline projection, cost breakdowns, and build a professional PDF report.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div>
                    <label className="block font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Commercial Villa"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 outline-none font-semibold text-slate-700 dark:text-slate-300 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider mb-2">
                      Client Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Municipal Development Authority"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 outline-none font-semibold text-slate-700 dark:text-slate-300 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider mb-2">
                      Project Location
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sector 62, Noida, Uttar Pradesh"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 outline-none font-semibold text-slate-700 dark:text-slate-300 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider mb-2">
                      Building Structure Type
                    </label>
                    <select
                      value={buildingType}
                      onChange={(e) => setBuildingType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 outline-none font-semibold text-slate-700 dark:text-slate-300 focus:border-brand-500 transition-all"
                    >
                      <option value="Residential">Residential Villa/Apartment</option>
                      <option value="Commercial">Commercial Office/Mall</option>
                      <option value="Industrial">Industrial Warehouse/Plant</option>
                      <option value="Infrastructure">Infrastructure/Roadwork/Platform</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider mb-2">
                      Number of Floors (G+X)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={floors}
                      onChange={(e) => setFloors(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 outline-none font-semibold text-slate-700 dark:text-slate-300 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider mb-2">
                      Material Sourcing Quality
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {['Standard', 'Premium', 'Luxury'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setMaterialQuality(opt)}
                          className={`py-3 rounded-xl border text-center font-bold tracking-wide transition-all ${
                            materialQuality === opt
                              ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Blueprint Drag & Drop Zone */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">
                    Upload Building Blueprint
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                      selectedFile
                        ? 'border-brand-500 bg-brand-500/[0.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-brand-500 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="h-12 w-12 rounded-2xl bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3.5 shadow-sm">
                      <Upload size={22} />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-slate-855 dark:text-slate-200">
                          Drag and drop blueprint here, or <span className="text-brand-500 underline">browse computer</span>
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                          Supports architectural PDF maps, PNG structural drawings, or high-res JPG sheets.
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="blueprint-input"
                    />
                    <label htmlFor="blueprint-input" className="absolute inset-0 cursor-pointer" />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!selectedFile || loading}
                    className="bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-bold py-3.5 px-8 rounded-xl text-xs transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    Create Project & Run AI Analysis
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Failure screen */}
      {!loading && error && !results && (
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-red-500/20 shadow-xl bg-white dark:bg-slate-950/40 space-y-6 animate-fadeIn">
            <div className="mx-auto h-16 w-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500">
              <AlertTriangle size={32} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Blueprint analysis failed.</h3>
              <p className="text-xs text-red-500 mt-2 font-semibold bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-left overflow-x-auto whitespace-pre-wrap">
                {error}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setError(null);
                  handleSubmit();
                }}
                className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md"
              >
                Retry Analysis
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setResults(null);
                  setSelectedFile(null);
                }}
                className="flex-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition-all"
              >
                Upload Different File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Steps screen */}
      {loading && (
        <div className="glass-panel p-10 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-xl max-w-md mx-auto text-center space-y-6">
          <div className="relative flex items-center justify-center mx-auto h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100 dark:border-brand-950/40" />
            <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
            <Sparkles className="text-brand-600 animate-pulse" size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Analyzing Blueprint</h3>
            <p className="text-xs text-slate-450 dark:text-slate-550 mt-1.5 leading-relaxed font-semibold italic animate-pulse">
              "{loadingStep}"
            </p>
          </div>
        </div>
      )}

      {/* Blueprint Analysis Results Panel */}
      {results && (
        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 font-bold">Dismiss</button>
            </div>
          )}
          {/* Header Bar */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500/10 border border-green-500/25 rounded-2xl flex items-center justify-center text-green-500">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-955 dark:text-white">{name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 mt-1 font-semibold">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {location}</span>
                  <span className="flex items-center gap-1"><User size={12} /> {clientName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleReanalyze}
                className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
              >
                <RefreshCw size={14} />
                Re-analyze Blueprint
              </button>

              {results.pdf_url && (
                <a
                  href={results.pdf_url}
                  download
                  className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                >
                  <Download size={14} />
                  Download PDF Report
                </a>
              )}
            </div>
          </div>

          {/* Project Summary */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm bg-white dark:bg-slate-950/40">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building size={16} />
              <span>Project Summary</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-semibold text-slate-650 dark:text-slate-400">
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">PROJECT NAME</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{activeProject?.name || name}</span>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">CLIENT NAME</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{activeProject?.client_name || clientName}</span>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">BUILDING TYPE</span>
                <span className="font-bold text-slate-900 dark:text-white">{results.building_type || buildingType}</span>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">NUMBER OF FLOORS</span>
                <span className="font-bold text-slate-900 dark:text-white">{results.floors || floors} floors</span>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">BUILT-UP AREA</span>
                <span className="font-bold text-slate-900 dark:text-white">{results.built_up_area_sqft?.toLocaleString()} sqft</span>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">TOTAL ROOMS</span>
                <span className="font-bold text-slate-900 dark:text-white">{estRooms.total_rooms || 0} rooms</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-900 text-xs font-bold uppercase tracking-wider gap-6">
            <button
              onClick={() => setActiveTab('layout')}
              className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'layout'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Layers size={14} />
              Blueprint Layout
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'financials'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Coins size={14} />
              Materials & Cost (₹)
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar size={14} />
              Timeline & Assigned
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'recommendations'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Sparkles size={14} />
              Diagnostics & Review
            </button>
          </div>

          {/* Tab Content 1: Layout */}
          {activeTab === 'layout' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* OpenCV Image View */}
              <div className="lg:col-span-2 glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col justify-between bg-white dark:bg-slate-950/40">
                <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Processed Blueprint Layout Overlay</span>
                  <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-400">
                    CV Bounding Box Coordinates Mapping
                  </span>
                </div>

                <div className="relative border border-slate-100 dark:border-slate-900 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
                  {results.image_url ? (
                    <img
                      src={results.image_url}
                      alt="Annotated Blueprint Layout"
                      className="max-h-[480px] object-contain w-full"
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-slate-500 text-xs">
                      Contour map coordinates missing.
                    </div>
                  )}
                </div>

                <div className="flex gap-4 text-[10px] text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-900/60 pt-4 font-semibold uppercase">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500"></span> Rooms Detected</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500"></span> Doors Detected</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span> Windows Detected</span>
                </div>
              </div>

              {/* Layout summary lists */}
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm bg-white dark:bg-slate-950/40">
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    <Ruler size={16} />
                    <span>Blueprint Analysis</span>
                  </div>

                  <div className="space-y-3 text-xs font-semibold text-slate-650 dark:text-slate-400">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                      <span>Bedrooms</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{estRooms.bedrooms} units</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                      <span>Bathrooms</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{estRooms.bathrooms} units</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                      <span>Kitchen</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{estRooms.kitchen} unit</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                      <span>Hall</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{estRooms.hall} unit</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                      <span>Balcony</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{estRooms.balcony} units</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                      <span>Parking</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{estRooms.parking} units</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                      <span>Doors</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{estRooms.doors} units</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                      <span>Windows</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{estRooms.windows} units</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Staircase</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{estRooms.staircase} units</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Financials */}
          {activeTab === 'financials' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold">
              {/* Cost Breakdown */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm bg-white dark:bg-slate-950/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-5 pb-2.5 border-b border-slate-100 dark:border-slate-900">
                    <Coins className="text-brand-500" size={16} />
                    <span className="font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Financial Breakdown</span>
                  </div>

                  <div className="space-y-3.5 text-slate-650 dark:text-slate-400">
                    <div className="flex justify-between border-b border-slate-100/50 dark:border-slate-900/50 pb-2">
                      <span>Material Cost</span>
                      <span className="font-bold text-slate-900 dark:text-white">{costBreakdown.formatted_material_cost}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 dark:border-slate-900/50 pb-2">
                      <span>Labor Cost</span>
                      <span className="font-bold text-slate-900 dark:text-white">{costBreakdown.formatted_labor_cost}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 dark:border-slate-900/50 pb-2">
                      <span>Equipment Cost</span>
                      <span className="font-bold text-slate-900 dark:text-white">{costBreakdown.formatted_equipment_cost}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 dark:border-slate-900/50 pb-2">
                      <span>Miscellaneous Cost</span>
                      <span className="font-bold text-slate-900 dark:text-white">{costBreakdown.formatted_misc_expenses}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 dark:border-slate-900/50 pb-2">
                      <span>GST</span>
                      <span className="font-bold text-slate-900 dark:text-white">{costBreakdown.formatted_gst_charges}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-850 flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-white mt-4">
                  <span>Grand Total</span>
                  <span className="text-brand-600 dark:text-brand-400">{costBreakdown.formatted_grand_total}</span>
                </div>
              </div>

              {/* Material quantity sheet */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm bg-white dark:bg-slate-950/40">
                <div className="flex items-center gap-1.5 mb-5 pb-2.5 border-b border-slate-100 dark:border-slate-900">
                  <Building className="text-brand-500" size={16} />
                  <span className="font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">AI Material Estimations</span>
                </div>

                {/* Grid of 9 Material Estimations */}
                <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                  {[
                    { label: "Cement", val: getMaterialData("Cement") },
                    { label: "Steel", val: getMaterialData("Steel") },
                    { label: "Sand", val: getMaterialData("Sand") },
                    { label: "Bricks", val: getMaterialData("Bricks") },
                    { label: "Paint", val: getMaterialData("Paint") },
                    { label: "Electrical", val: getMaterialData("Electrical") },
                    { label: "Plumbing", val: getMaterialData("Plumbing") },
                    { label: "Flooring", val: getMaterialData("Flooring") },
                    { label: "Roofing", val: getMaterialData("Roofing") },
                  ].map((mat, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{mat.label}</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white mt-1.5 block">{mat.val}</span>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto max-h-[320px] overflow-y-auto pr-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800 pb-2">
                        <th className="py-2.5">Material Item</th>
                        <th className="py-2.5 text-right">Required Quantity</th>
                        <th className="py-2.5 text-right">Unit</th>
                        <th className="py-2.5 text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-semibold text-slate-755 dark:text-slate-300">
                      {materialsList.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <td className="py-3 font-bold text-slate-905 dark:text-white">{m.name}</td>
                          <td className="py-3 text-right">{m.quantity?.toLocaleString()}</td>
                          <td className="py-3 text-right text-slate-400 lowercase">{m.unit}</td>
                          <td className="py-3 text-right text-brand-600 dark:text-brand-400">{m.formatted_cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Timeline & Assigned */}
          {activeTab === 'timeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold">
              {/* Construction Timeline */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm bg-white dark:bg-slate-950/40 space-y-5">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-900">
                  <div className="flex items-center gap-1.5">
                    <Clock className="text-brand-500 animate-pulse" size={16} />
                    <span className="font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Construction Timeline</span>
                  </div>
                  <span className="bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 px-3 py-1 rounded-full font-bold">
                    {timelineObj.total_months} Months Target
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Foundation", weeks: foundationWeeks },
                    { label: "Structure", weeks: structureWeeks },
                    { label: "Roofing", weeks: roofingWeeks },
                    { label: "Electrical", weeks: electricalWeeks },
                    { label: "Plumbing", weeks: plumbingWeeks },
                    { label: "Interior", weeks: interiorWeeks },
                    { label: "Finishing", weeks: finishingWeeks },
                  ].map((p, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>{p.label}</span>
                        <span>{p.weeks} Weeks</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${Math.min(100, (p.weeks / (timelineObj.total_weeks || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Estimated Completion Date */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-900 dark:text-white">
                    <span>Estimated Completion Date</span>
                    <span className="text-brand-600 dark:text-brand-400">
                      {activeProject?.end_date ? new Date(activeProject.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Project Assigned */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm bg-white dark:bg-slate-950/40 space-y-5">
                <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-900">
                  <Shield className="text-brand-500" size={16} />
                  <span className="font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Project Assigned</span>
                </div>

                <div className="space-y-3.5 font-semibold text-slate-650 dark:text-slate-400">
                  <div className="pb-2 border-b border-slate-100/50 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">PROJECT NAME</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block">{activeProject?.name || name}</span>
                  </div>
                  <div className="pb-2 border-b border-slate-100/50 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">CLIENT NAME</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block">{activeProject?.client_name || clientName}</span>
                  </div>
                  <div className="pb-2 border-b border-slate-100/50 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">ASSIGNED PROJECT MANAGER</span>
                    <span className="font-bold text-slate-900 dark:text-white">{assignedPM}</span>
                  </div>
                  <div className="pb-2 border-b border-slate-100/50 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">ASSIGNED SITE ENGINEER</span>
                    <span className="font-bold text-slate-900 dark:text-white">{assignedEngineer}</span>
                  </div>
                  <div className="pb-2 border-b border-slate-100/50 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">PROJECT STATUS</span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">{activeProject?.status || 'active'}</span>
                  </div>
                  <div className="pb-2 border-b border-slate-100/50 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">ESTIMATED COST</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400">{costBreakdown.formatted_grand_total}</span>
                  </div>
                  <div className="pb-2 border-b border-slate-100/50 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">ESTIMATED DURATION</span>
                    <span className="font-bold text-slate-900 dark:text-white">{timelineObj.total_months} Months ({timelineObj.total_weeks} Weeks)</span>
                  </div>
                  <div className="pb-2 border-b border-slate-100/50 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">RECOMMENDED WORKFORCE</span>
                    <span className="font-bold text-slate-900 dark:text-white">{assigned.recommended_workers || 0} personnel</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">AI CONFIDENCE SCORE</span>
                    <span className="font-bold text-slate-900 dark:text-white">{(assigned.ai_confidence_score * 100).toFixed(0)}% Match</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 4: Diagnostics */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6 text-xs font-semibold">
              
              {/* Final AI Recommendation Card */}
              <div className="glass-panel p-6 rounded-3xl border border-brand-500/10 dark:border-brand-500/20 bg-brand-50/[0.02] dark:bg-brand-950/10 space-y-2">
                <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider text-[10px]">
                  <Sparkles size={14} className="animate-pulse" />
                  <span>Final AI Recommendation</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed italic">
                  "{review.summary || 'Calibration analysis optimal.'}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Complexity, Budget, Materials */}
                <div className="space-y-6">
                  {/* Construction Complexity */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Construction Complexity</span>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">{review.complexity}</div>
                    <p className="text-[10px] text-slate-450 dark:text-slate-550 leading-relaxed mt-1">{review.complexity_reason}</p>
                  </div>

                  {/* Budget Analysis */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Budget Analysis</span>
                    <div className="text-base font-extrabold text-green-600 dark:text-green-400">{review.budget_analysis?.evaluation}</div>
                    <ul className="text-[10px] text-slate-450 dark:text-slate-555 list-disc list-inside mt-2 space-y-1">
                      {review.budget_analysis?.recommendations?.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Material Analysis */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Material Analysis</span>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">{review.material_analysis?.quality_level} Grade</div>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Est. Waste Factor: {review.material_analysis?.estimated_waste_pct}%</p>
                    <ul className="text-[10px] text-slate-450 dark:text-slate-555 list-disc list-inside mt-1.5 space-y-1">
                      {review.material_analysis?.recommendations?.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Column: Recommendations & Suggestions */}
                <div className="space-y-6">
                  {/* Cost Optimization Suggestions */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Cost Optimization Suggestions</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-bold">{review.recommendations?.cost_optimization}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Sourcing recommendation: {review.recommendations?.suggested_machinery}</p>
                  </div>

                  {/* Safety Recommendations */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Safety Recommendations</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-bold">{review.recommendations?.safety_improvements}</p>
                  </div>
                </div>
              </div>

              {/* Risk Analysis & Delay Prediction */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950/40 space-y-4">
                <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-900">
                  <AlertTriangle className="text-amber-500" size={16} />
                  <span className="font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Risk Analysis & Delay Prediction Scorecard</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  {Object.entries(review.risk_analysis || {}).map(([key, val]: any) => {
                    const level = val.level;
                    const badgeClass = level === 'High' 
                      ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                      : level === 'Medium' 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                        : 'bg-green-500/10 border-green-500/20 text-green-500';
                    const title = key === 'delay_risk' ? 'Delay Prediction' : key.replace('_risk', '').replace('_', ' ');
                    return (
                      <div key={key} className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold capitalize">
                          {title}
                        </span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border font-bold uppercase ${badgeClass}`}>
                          {level}
                        </span>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal mt-1">{val.reason}</p>
                        <p className="text-[9px] text-slate-800 dark:text-slate-300 font-bold border-t border-slate-100 dark:border-slate-800 pt-1.5">{val.recommendation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default BlueprintAnalysis;
