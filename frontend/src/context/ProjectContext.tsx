import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, Project } from '../services/api';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project) => void;
  loadingProjects: boolean;
  refreshProjects: (newActiveProjectId?: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);

  const fetchProjects = async (newActiveProjectId?: number) => {
    if (!user) return;
    setLoadingProjects(true);
    try {
      const data = await api.projects.list();
      setProjects(data);
      if (data.length > 0) {
        // Keep currently active project if it exists in the list, otherwise restore cached or default to first
        const targetId = newActiveProjectId?.toString() || activeProject?.id.toString() || localStorage.getItem('last_project_id');
        const found = data.find(p => p.id.toString() === targetId);
        const nextActive = found || data[0];
        setActiveProjectState(nextActive);
        localStorage.setItem('last_project_id', nextActive.id.toString());
      } else {
        setActiveProjectState(null);
      }
    } catch (err) {
      console.error("Error loading project list:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const setActiveProject = (project: Project) => {
    setActiveProjectState(project);
    localStorage.setItem('last_project_id', project.id.toString());
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      setActiveProject,
      loadingProjects,
      refreshProjects: fetchProjects
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};
