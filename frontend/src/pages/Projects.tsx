import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, Task, Milestone } from '../services/api';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  AlertCircle,
  ListTodo,
  Flag,
  BarChart,
  X
} from 'lucide-react';

export const Projects: React.FC = () => {
  const { activeProject } = useProject();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'milestones' | 'gantt'>('board');
  
  // Task creation state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStart, setTaskStart] = useState('');
  const [taskEnd, setTaskEnd] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskAssignee, setTaskAssignee] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectDetails = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const [taskList, milestoneList] = await Promise.all([
        api.projects.listTasks(activeProject.id),
        api.projects.listMilestones(activeProject.id)
      ]);
      setTasks(taskList);
      setMilestones(milestoneList);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch project schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [activeProject]);

  const handleUpdateTaskStatus = async (taskId: number, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      await api.projects.updateTask(taskId, { status: newStatus });
      // Update local state
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err: any) {
      alert("Unauthorized: Only Administrator, PM, or Site Engineers can edit task metrics.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !taskName || !taskStart || !taskEnd) return;

    try {
      await api.projects.createTask(activeProject.id, {
        name: taskName,
        description: taskDesc,
        start_date: taskStart,
        end_date: taskEnd,
        priority: taskPriority,
        status: 'pending',
        assigned_to: taskAssignee || undefined
      });
      setShowTaskModal(false);
      // Reset inputs
      setTaskName('');
      setTaskDesc('');
      setTaskStart('');
      setTaskEnd('');
      setTaskPriority('medium');
      setTaskAssignee(null);
      // Reload lists
      fetchProjectDetails();
    } catch (err: any) {
      alert("Failed to create task: " + err.message);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-slate-400">Please select an active project to access management board.</p>
      </div>
    );
  }

  // Group tasks for Kanban columns
  const getTasksByStatus = (status: 'pending' | 'in_progress' | 'completed') => {
    return tasks.filter(t => t.status === status);
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all
              ${activeTab === 'board' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
            `}
          >
            <ListTodo size={14} />
            <span>Task Kanban</span>
          </button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all
              ${activeTab === 'milestones' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
            `}
          >
            <Flag size={14} />
            <span>Milestones</span>
          </button>
          <button
            onClick={() => setActiveTab('gantt')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all
              ${activeTab === 'gantt' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
            `}
          >
            <BarChart size={14} />
            <span>Gantt Chart</span>
          </button>
        </div>

        {/* Create Task Button */}
        <button
          onClick={() => setShowTaskModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2 px-4 text-xs transition-all shadow-md shadow-brand-500/20"
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* TABS RENDER */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* TAB 1: Kanban Board */}
          {activeTab === 'board' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Column 1: Pending */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900/60 min-h-[500px]">
                <div className="flex justify-between items-center mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Pending</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">
                    {getTasksByStatus('pending').length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {getTasksByStatus('pending').map(task => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleUpdateTaskStatus} />
                  ))}
                  {getTasksByStatus('pending').length === 0 && (
                    <div className="text-center py-10 text-[10px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No pending tasks.</div>
                  )}
                </div>
              </div>

              {/* Column 2: In Progress */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900/60 min-h-[500px]">
                <div className="flex justify-between items-center mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">In Progress</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full text-amber-600 dark:text-amber-400">
                    {getTasksByStatus('in_progress').length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {getTasksByStatus('in_progress').map(task => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleUpdateTaskStatus} />
                  ))}
                  {getTasksByStatus('in_progress').length === 0 && (
                    <div className="text-center py-10 text-[10px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No tasks in progress.</div>
                  )}
                </div>
              </div>

              {/* Column 3: Completed */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900/60 min-h-[500px]">
                <div className="flex justify-between items-center mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Completed</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full text-green-600 dark:text-green-400">
                    {getTasksByStatus('completed').length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {getTasksByStatus('completed').map(task => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleUpdateTaskStatus} />
                  ))}
                  {getTasksByStatus('completed').length === 0 && (
                    <div className="text-center py-10 text-[10px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No completed tasks yet.</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Milestones Roadmap */}
          {activeTab === 'milestones' && (
            <div className="max-w-2xl mx-auto glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Milestone Roadmap</h3>
              
              <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-6">
                {milestones.map((m) => {
                  const achieved = m.status === 'achieved';
                  return (
                    <div key={m.id} className="relative pl-8">
                      {/* Timeline dot */}
                      <span className={`
                        absolute left-[-11px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 
                        ${achieved 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-400'}
                      `}>
                        {achieved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      </span>
                      
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1">
                        <h4 className={`text-sm font-bold ${achieved ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          {m.name}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          Due: {m.due_date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{m.description || 'No description provided.'}</p>
                    </div>
                  );
                })}
                {milestones.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6 pl-0 border-none">No milestones scheduled for this project.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Gantt Chart Simulation */}
          {activeTab === 'gantt' && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm overflow-x-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Gantt Schedule Simulation</h3>
              
              {tasks.length > 0 ? (
                <div className="min-w-[600px] space-y-4">
                  {/* Calendar Headers */}
                  <div className="grid grid-cols-12 border-b border-slate-100 dark:border-slate-800 pb-2 text-[10px] font-bold text-slate-400 uppercase">
                    <div className="col-span-4 text-left">Task Title</div>
                    <div className="col-span-8 grid grid-cols-4 text-center">
                      <span>Phase 1</span>
                      <span>Phase 2</span>
                      <span>Phase 3</span>
                      <span>Phase 4</span>
                    </div>
                  </div>

                  {/* Task Timeline Blocks */}
                  {tasks.map((task, i) => {
                    // Simulate horizontal block coordinates
                    const offsetMap = [10, 25, 45, 60, 20];
                    const widthMap = [30, 45, 40, 25, 50];
                    const offset = offsetMap[i % offsetMap.length];
                    const width = widthMap[i % widthMap.length];
                    
                    return (
                      <div key={task.id} className="grid grid-cols-12 items-center text-xs py-2 border-b border-slate-100/50 dark:border-slate-800/40">
                        <div className="col-span-4 text-left">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{task.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Due: {task.end_date}</span>
                        </div>
                        <div className="col-span-8 relative h-6 rounded bg-slate-100 dark:bg-slate-900/50">
                          <div 
                            className={`absolute h-full rounded shadow-sm flex items-center justify-center text-[10px] text-white font-bold transition-all
                              ${task.status === 'completed' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}
                            `}
                            style={{ left: `${offset}%`, width: `${width}%` }}
                          >
                            <span className="px-1 truncate">{task.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 py-10">No tasks created. Add tasks to see Gantt timeline visualization.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* TASK MODAL POPUP */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-2xl relative">
            <button 
              onClick={() => setShowTaskModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Create New Task</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Task Name
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Concrete Pour Block A"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Details and scope..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-xs outline-none focus:border-brand-500 h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={taskStart}
                    onChange={(e) => setTaskStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={taskEnd}
                    onChange={(e) => setTaskEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Priority level
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-xs outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-4 text-xs transition-all shadow-lg shadow-brand-500/20"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Reusable Task Card Item ---
interface TaskCardProps {
  task: Task;
  onStatusChange: (id: number, status: 'pending' | 'in_progress' | 'completed') => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange }) => {
  const pColors = {
    low: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30',
    medium: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
    high: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
  };

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm relative group hover:shadow-md transition-all">
      <div className="flex justify-between items-start gap-2 mb-2">
        <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-brand-500 transition-colors">
          {task.name}
        </h5>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${pColors[task.priority]}`}>
          {task.priority.toUpperCase()}
        </span>
      </div>
      
      <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed mb-3">
        {task.description || 'No description added.'}
      </p>

      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-2.5 mt-2 text-[10px] font-semibold text-slate-400">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span>{task.end_date}</span>
        </div>
        
        {/* Simple drop-down status switcher */}
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as any)}
          className="bg-transparent text-slate-500 dark:text-slate-400 hover:text-brand-500 outline-none cursor-pointer border-none font-bold text-[10px] text-right"
        >
          <option value="pending" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pending</option>
          <option value="in_progress" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">In Progress</option>
          <option value="completed" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Completed</option>
        </select>
      </div>
    </div>
  );
};
