import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import {
  LayoutDashboard,
  Briefcase,
  Boxes,
  Calculator,
  AlertTriangle,
  Map,
  ShieldCheck,
  FileText,
  MessageSquare,
  FileCode,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Bell,
  Menu,
  X,
  Plus,
  Settings,
  User
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { projects, activeProject, setActiveProject, refreshProjects } = useProject();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  
  // Project creation state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjBudget, setNewProjBudget] = useState<number>(0);
  const [newProjStart, setNewProjStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [newProjEnd, setNewProjEnd] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjLoc, setNewProjLoc] = useState('');
  const [newProjType, setNewProjType] = useState('Commercial');
  const [newProjFloors, setNewProjFloors] = useState<number>(1);
  const [newProjQuality, setNewProjQuality] = useState('Standard');
  const [creatingProject, setCreatingProject] = useState(false);

  // Project editing state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProjName, setEditProjName] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editProjBudget, setEditProjBudget] = useState<number>(0);
  const [editProjStart, setEditProjStart] = useState('');
  const [editProjEnd, setEditProjEnd] = useState('');
  const [editProjClient, setEditProjClient] = useState('');
  const [editProjLoc, setEditProjLoc] = useState('');
  const [editProjType, setEditProjType] = useState('Commercial');
  const [editProjFloors, setEditProjFloors] = useState<number>(1);
  const [editProjQuality, setEditProjQuality] = useState('Standard');
  const [editProjStatus, setEditProjStatus] = useState<string>('active');
  const [updatingProject, setUpdatingProject] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editProjName) return;
    setUpdatingProject(true);
    try {
      const res = await api.projects.update(activeProject.id, {
        name: editProjName,
        description: editProjDesc,
        budget: Number(editProjBudget),
        start_date: editProjStart,
        end_date: editProjEnd,
        client_name: editProjClient,
        location: editProjLoc,
        building_type: editProjType,
        floors: Number(editProjFloors),
        material_quality: editProjQuality,
        status: editProjStatus as any
      });
      
      await refreshProjects(res.id);
      setShowEditModal(false);
    } catch (err: any) {
      alert('Failed to update project: ' + err.message);
    } finally {
      setUpdatingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (!window.confirm(`Are you sure you want to delete project "${activeProject.name}"? This will permanently remove all associated budget allocations, blueprint reports, tasks, and materials inventory.`)) {
      return;
    }
    setUpdatingProject(true);
    try {
      await api.projects.delete(activeProject.id);
      setShowEditModal(false);
      await refreshProjects();
    } catch (err: any) {
      alert('Failed to delete project: ' + err.message);
    } finally {
      setUpdatingProject(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !user || !user.company_id) return;
    setCreatingProject(true);
    try {
      const res = await api.projects.create({
        name: newProjName,
        description: newProjDesc || '',
        budget: Number(newProjBudget) || 0,
        start_date: newProjStart,
        end_date: newProjEnd,
        client_name: newProjClient || '',
        location: newProjLoc || '',
        building_type: newProjType,
        floors: Number(newProjFloors) || 1,
        material_quality: newProjQuality,
        company_id: user.company_id,
        status: 'active'
      });
      
      await refreshProjects(res.id);
      
      // Reset fields
      setNewProjName('');
      setNewProjDesc('');
      setNewProjBudget(0);
      setNewProjClient('');
      setNewProjLoc('');
      setNewProjType('Commercial');
      setNewProjFloors(1);
      setNewProjQuality('Standard');
      setShowProjectModal(false);
    } catch (err: any) {
      alert('Failed to create project: ' + err.message);
    } finally {
      setCreatingProject(false);
    }
  };
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.reports.listNotifications();
      setNotifications(res);
    } catch (err) {
      console.error("Error listing notifications:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
    return;
  }, [user, activeProject]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (notifId: number) => {
    try {
      await api.reports.markNotificationRead(notifId);
      setNotifications(prev =>
        prev.map(n => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  interface MenuItem {
    name: string;
    path: string;
    icon: React.ComponentType<any>;
    allowedRoles?: string[];
  }

  const menuItems: MenuItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects & Tasks', path: '/projects', icon: Briefcase },
    { name: 'Materials & Inventory', path: '/materials', icon: Boxes },
    { name: 'AI Cost Estimator', path: '/cost-estimation', icon: Calculator },
    { name: 'AI Risk Predictor', path: '/risk-prediction', icon: AlertTriangle },
    { name: 'Blueprint Analyzer', path: '/blueprint-analysis', icon: Map, allowedRoles: ['Administrator', 'Company Owner', 'Project Manager', 'Site Engineer'] },
    { name: 'AI Site Inspection', path: '/site-inspection', icon: ShieldCheck },
    { name: 'Document Intel', path: '/document-intelligence', icon: FileText },
    { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
    { name: 'Reports Engine', path: '/reports', icon: FileCode },
  ];

  const visibleMenuItems = menuItems.filter(item =>
    !item.allowedRoles || (user && item.allowedRoles.includes(user.role))
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Section */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-72 flex-col glass-panel shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-lg shadow-md shadow-brand-500/30">
              W
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              BuildWise <span className="text-brand-500">AI</span>
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Global Project Switcher Dropdown */}
        <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 relative z-30">
          <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1">
            Active Project
          </label>
          {projects.length > 0 ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  className="flex-1 flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-left text-sm font-semibold transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm min-w-0"
                >
                  <div className="truncate pr-2">
                    <div className="truncate text-slate-850 dark:text-slate-205 font-bold">{activeProject?.name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 font-semibold uppercase tracking-wider
                      ${activeProject?.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
                        activeProject?.status === 'delayed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}
                    `}>
                      {activeProject?.status}
                    </span>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''} shrink-0`} />
                </button>
                
                {user && ['Administrator', 'Company Owner', 'Project Manager', 'Site Engineer'].includes(user.role) && (
                  <button
                    onClick={() => {
                      if (activeProject) {
                        setEditProjName(activeProject.name);
                        setEditProjDesc(activeProject.description || '');
                        setEditProjBudget(activeProject.budget);
                        setEditProjStart(activeProject.start_date);
                        setEditProjEnd(activeProject.end_date);
                        setEditProjClient(activeProject.client_name || '');
                        setEditProjLoc(activeProject.location || '');
                        setEditProjType(activeProject.building_type || 'Commercial');
                        setEditProjFloors(activeProject.floors || 1);
                        setEditProjQuality(activeProject.material_quality || 'Standard');
                        setEditProjStatus(activeProject.status);
                        setShowEditModal(true);
                        setProjectDropdownOpen(false);
                      }
                    }}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-brand-500 hover:border-brand-500/30 dark:hover:border-brand-500/30 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm flex items-center justify-center cursor-pointer shrink-0"
                    title="Edit Active Project"
                  >
                    <Settings size={16} />
                  </button>
                )}
              </div>

              {/* Project Dropdown Content */}
              {projectDropdownOpen && (
                <div className="absolute left-4 right-4 mt-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-50 max-h-60 overflow-y-auto">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProject(proj);
                        setProjectDropdownOpen(false);
                      }}
                      className={`
                        w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex flex-col gap-0.5
                        ${activeProject?.id === proj.id ? 'bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'}
                      `}
                    >
                      <span className="truncate font-bold">{proj.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Budget: {formatINR(proj.budget)}</span>
                    </button>
                  ))}
                  
                  {user && ['Administrator', 'Company Owner', 'Project Manager', 'Site Engineer'].includes(user.role) && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-1.5 mt-1 sticky bottom-0 bg-white dark:bg-slate-900 flex gap-2">
                      <button
                        onClick={() => {
                          setShowProjectModal(true);
                          setProjectDropdownOpen(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2 px-2 text-[10px] font-bold transition-all shadow-sm shadow-brand-500/10"
                      >
                        <Plus size={12} />
                        <span>Create Project</span>
                      </button>
                      <button
                        onClick={() => {
                          if (activeProject) {
                            setEditProjName(activeProject.name);
                            setEditProjDesc(activeProject.description || '');
                            setEditProjBudget(activeProject.budget);
                            setEditProjStart(activeProject.start_date);
                            setEditProjEnd(activeProject.end_date);
                            setEditProjClient(activeProject.client_name || '');
                            setEditProjLoc(activeProject.location || '');
                            setEditProjType(activeProject.building_type || 'Commercial');
                            setEditProjFloors(activeProject.floors || 1);
                            setEditProjQuality(activeProject.material_quality || 'Standard');
                            setEditProjStatus(activeProject.status);
                            setShowEditModal(true);
                            setProjectDropdownOpen(false);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg py-2 px-2 text-[10px] font-bold transition-all shadow-sm"
                      >
                        <Settings size={12} />
                        <span>Edit Active</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500 p-2 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No projects seeded.
            </div>
          )}
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group
                  ${isActive 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25 glow-card' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-200'}
                `}
              >
                <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile section */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-3 rounded-2xl bg-slate-100/50 dark:bg-slate-900/40 p-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-all group"
            title="View User Profile & Accounts Roster"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold uppercase shadow-inner group-hover:scale-105 transition-transform">
              {user?.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{user?.full_name}</div>
              <div className="truncate text-[10px] text-slate-400 dark:text-slate-500 font-medium">{user?.role}</div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Logout session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Main Header Bar */}
        <header className="flex h-16 items-center justify-between px-6 bg-white/70 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-900 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white font-display">
              {menuItems.find(item => item.path === location.pathname)?.name || 'BuildWise AI'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 transition-all shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
            </button>

            {/* Notifications panel */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 transition-all shadow-sm relative"
                title="Notifications feed"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl py-2.5 z-50 text-xs">
                  <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                    <span>Notifications</span>
                    {unreadCount > 0 && <span className="text-[10px] text-brand-600 dark:text-brand-400 font-extrabold">{unreadCount} New</span>}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.is_read) handleMarkAsRead(n.id);
                          }}
                          className={`px-4 py-3 cursor-pointer transition-colors flex gap-2.5 items-start ${
                            n.is_read ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-550 dark:text-slate-400' : 'bg-brand-50/20 hover:bg-brand-50/40 dark:bg-brand-950/10 dark:hover:bg-brand-950/20 font-bold text-slate-900 dark:text-slate-150'
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-brand-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold truncate text-[11px]">{n.title}</div>
                            <div className="text-[10px] leading-normal text-slate-450 dark:text-slate-500 mt-0.5">{n.message}</div>
                            <div className="text-[9px] text-slate-400 font-semibold uppercase mt-1">
                              {n.created_at?.split('T')[0]}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-slate-400 dark:text-slate-500 font-semibold">
                        No notifications found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Route Content Frame */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 shadow-2xl border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto text-xs font-semibold">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white">Create New Project</h3>
              <button onClick={() => setShowProjectModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Project Name</label>
                  <input type="text" value={newProjName} onChange={e => setNewProjName(e.target.value)} placeholder="e.g. Horizon Business Park" className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Description</label>
                  <textarea value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)} placeholder="Enter details about this construction site..." className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold h-20 resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Budget (₹)</label>
                  <input type="number" value={newProjBudget} onChange={e => setNewProjBudget(Number(e.target.value))} className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" required />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Floors</label>
                  <input type="number" value={newProjFloors} onChange={e => setNewProjFloors(Number(e.target.value))} className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" min="1" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Start Date</label>
                  <input type="date" value={newProjStart} onChange={e => setNewProjStart(e.target.value)} className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" required />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">End Date</label>
                  <input type="date" value={newProjEnd} onChange={e => setNewProjEnd(e.target.value)} className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" required />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Client Name</label>
                  <input type="text" value={newProjClient} onChange={e => setNewProjClient(e.target.value)} placeholder="e.g. Acme Corp" className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Location</label>
                  <input type="text" value={newProjLoc} onChange={e => setNewProjLoc(e.target.value)} placeholder="e.g. San Francisco, CA" className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Building Type</label>
                  <select value={newProjType} onChange={e => setNewProjType(e.target.value)} className="w-full rounded-xl border dark:border-slate-200 bg-white dark:bg-slate-900 py-2.5 px-4 outline-none focus:border-brand-500 font-semibold cursor-pointer">
                    <option value="Commercial">Commercial</option>
                    <option value="Residential">Residential</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Material Quality</label>
                  <select value={newProjQuality} onChange={e => setNewProjQuality(e.target.value)} className="w-full rounded-xl border dark:border-slate-200 bg-white dark:bg-slate-900 py-2.5 px-4 outline-none focus:border-brand-500 font-semibold cursor-pointer">
                    <option value="Economy">Economy</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t dark:border-slate-800">
                <button type="button" onClick={() => setShowProjectModal(false)} className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl font-bold transition-all">Cancel</button>
                <button type="submit" disabled={creatingProject} className="py-2.5 px-5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all shadow-md">{creatingProject ? 'Creating...' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 shadow-2xl border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto text-xs font-semibold">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white">Edit Active Project</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditProject} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Project Name</label>
                  <input type="text" value={editProjName} onChange={e => setEditProjName(e.target.value)} placeholder="e.g. Horizon Business Park" className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Description</label>
                  <textarea value={editProjDesc} onChange={e => setEditProjDesc(e.target.value)} placeholder="Enter details about this construction site..." className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold h-20 resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Budget (₹)</label>
                  <input type="number" value={editProjBudget} onChange={e => setEditProjBudget(Number(e.target.value))} className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" required />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Floors</label>
                  <input type="number" value={editProjFloors} onChange={e => setEditProjFloors(Number(e.target.value))} className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" min="1" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Start Date</label>
                  <input type="date" value={editProjStart} onChange={e => setEditProjStart(e.target.value)} className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" required />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">End Date</label>
                  <input type="date" value={editProjEnd} onChange={e => setEditProjEnd(e.target.value)} className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" required />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Client Name</label>
                  <input type="text" value={editProjClient} onChange={e => setEditProjClient(e.target.value)} placeholder="e.g. Acme Corp" className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Location</label>
                  <input type="text" value={editProjLoc} onChange={e => setEditProjLoc(e.target.value)} placeholder="e.g. San Francisco, CA" className="w-full rounded-xl border dark:border-slate-200 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Building Type</label>
                  <select value={editProjType} onChange={e => setEditProjType(e.target.value)} className="w-full rounded-xl border dark:border-slate-200 bg-white dark:bg-slate-900 py-2.5 px-4 outline-none focus:border-brand-500 font-semibold cursor-pointer">
                    <option value="Commercial">Commercial</option>
                    <option value="Residential">Residential</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Material Quality</label>
                  <select value={editProjQuality} onChange={e => setEditProjQuality(e.target.value)} className="w-full rounded-xl border dark:border-slate-200 bg-white dark:bg-slate-900 py-2.5 px-4 outline-none focus:border-brand-500 font-semibold cursor-pointer">
                    <option value="Economy">Economy</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Project Status</label>
                  <select value={editProjStatus} onChange={e => setEditProjStatus(e.target.value)} className="w-full rounded-xl border dark:border-slate-200 bg-white dark:bg-slate-900 py-2.5 px-4 outline-none focus:border-brand-500 font-semibold cursor-pointer">
                    <option value="active">Active</option>
                    <option value="delayed">Delayed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t dark:border-slate-800 items-center justify-between">
                <div>
                  {user && ['Administrator', 'Company Owner', 'Project Manager', 'Site Engineer'].includes(user.role) && (
                    <button
                      type="button"
                      onClick={handleDeleteProject}
                      disabled={updatingProject}
                      className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-md shadow-red-500/10 cursor-pointer"
                    >
                      Delete Project
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowEditModal(false)} className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl font-bold transition-all">Cancel</button>
                  <button type="submit" disabled={updatingProject} className="py-2.5 px-5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all shadow-md">{updatingProject ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 shadow-2xl border dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto text-xs font-semibold">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <User size={16} className="text-brand-500 animate-pulse" />
                <span>User Profile & Workspace Directory</span>
              </h3>
              <button onClick={() => setShowProfileModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Active Profile Info */}
              <div className="rounded-2xl border border-slate-100 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900/20 p-4 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Account Details</h4>
                <div className="grid grid-cols-2 gap-y-3">
                  <div>
                    <span className="text-slate-400 dark:text-slate-550">Full Name</span>
                    <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">{user?.full_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-550">Email Address</span>
                    <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 font-mono">{user?.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-550">Workspace Role</span>
                    <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-[10px] font-bold uppercase">
                        {user?.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-550">Organization</span>
                    <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">Apex Construction Group</p>
                  </div>
                </div>
              </div>

              {/* Login roster / directory */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">System Login Roster</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                    Use these seeded credential sets to sign in and test layout/budget authorizations.
                  </p>
                </div>
                <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-900">
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Role</th>
                        <th className="px-4 py-2.5">Email</th>
                        <th className="px-4 py-2.5">Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900/80 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      {[
                        { name: "Narendra Kumar", role: "Site Engineer", email: "testuser@buildwise.ai" },
                        { name: "Sarah Administrator", role: "Administrator", email: "admin@buildwise.ai" },
                        { name: "Robert Vance", role: "Company Owner", email: "owner@buildwise.ai" },
                        { name: "Marcus Aurelius", role: "Project Manager", email: "pm@buildwise.ai" },
                        { name: "Diana Prince", role: "Site Engineer", email: "engineer@buildwise.ai" },
                        { name: "Bob Builder", role: "Contractor", email: "contractor@buildwise.ai" },
                        { name: "Wayne Enterprises", role: "Client", email: "client@buildwise.ai" }
                      ].map((rosterUser) => (
                        <tr key={rosterUser.email} className={rosterUser.email === user?.email ? "bg-brand-50/20 dark:bg-brand-950/15 font-bold" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/20"}>
                          <td className="px-4 py-2.5 text-slate-900 dark:text-white">{rosterUser.name}</td>
                          <td className="px-4 py-2.5 uppercase text-[9px] text-brand-600 dark:text-brand-400">{rosterUser.role}</td>
                          <td className="px-4 py-2.5 font-mono">{rosterUser.email}</td>
                          <td className="px-4 py-2.5 text-slate-400 dark:text-slate-500 font-mono">password123</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t dark:border-slate-800 mt-6">
              <button 
                type="button" 
                onClick={() => setShowProfileModal(false)} 
                className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl font-bold transition-all cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
