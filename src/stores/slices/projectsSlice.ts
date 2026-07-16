import type { StateCreator } from 'zustand';
import type { ProjectCategory, Project, ProjectTask, ProjectStage, Script } from '@/types/database';

export interface ProjectsSlice {
  // Data
  projectCategories: ProjectCategory[];
  projects: Project[];
  projectTasks: ProjectTask[];
  projectStages: ProjectStage[];
  scripts: Script[];

  // Actions - ProjectCategories
  setProjectCategories: (projectCategories: ProjectCategory[]) => void;
  addProjectCategory: (projectCategory: ProjectCategory) => void;
  updateProjectCategory: (id: string, updates: Partial<ProjectCategory>) => void;
  deleteProjectCategory: (id: string) => void;

  // Actions - Projects
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Actions - ProjectTasks
  setProjectTasks: (projectTasks: ProjectTask[]) => void;
  addProjectTask: (projectTask: ProjectTask) => void;
  updateProjectTask: (id: string, updates: Partial<ProjectTask>) => void;
  deleteProjectTask: (id: string) => void;

  // Actions - ProjectStages
  setProjectStages: (stages: ProjectStage[]) => void;
  addProjectStage: (stage: ProjectStage) => void;
  addProjectStages: (stages: ProjectStage[]) => void;
  updateProjectStage: (id: string, updates: Partial<ProjectStage>) => void;
  deleteProjectStage: (id: string) => void;
  reorderProjectStages: (projectId: string, orderedStageIds: string[]) => void;

  // Actions - Scripts
  setScripts: (scripts: Script[]) => void;
  addScript: (script: Script) => void;
  updateScript: (id: string, updates: Partial<Script>) => void;
  deleteScript: (id: string) => void;
}

export const createProjectsSlice: StateCreator<ProjectsSlice, [], [], ProjectsSlice> = (set) => ({
  // Initial State
  projectCategories: [],
  projects: [],
  projectTasks: [],
  projectStages: [],
  scripts: [],

  // ProjectCategories
  setProjectCategories: (projectCategories) => set({ projectCategories }),
  addProjectCategory: (projectCategory) => set((state) => ({
    projectCategories: [...state.projectCategories, projectCategory]
  })),
  updateProjectCategory: (id, updates) => set((state) => ({
    projectCategories: state.projectCategories.map((pc) => pc.id === id ? { ...pc, ...updates } : pc)
  })),
  deleteProjectCategory: (id) => set((state) => ({
    projectCategories: state.projectCategories.filter((pc) => pc.id !== id)
  })),

  // Projects
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== id)
  })),

  // ProjectTasks
  setProjectTasks: (projectTasks) => set({ projectTasks }),
  addProjectTask: (projectTask) => set((state) => ({ projectTasks: [...state.projectTasks, projectTask] })),
  updateProjectTask: (id, updates) => set((state) => ({
    projectTasks: state.projectTasks.map((pt) => pt.id === id ? { ...pt, ...updates } : pt)
  })),
  deleteProjectTask: (id) => set((state) => ({
    projectTasks: state.projectTasks.filter((pt) => pt.id !== id)
  })),

  // ProjectStages
  setProjectStages: (projectStages) => set({ projectStages }),
  addProjectStage: (stage) => set((state) => ({
    projectStages: [...state.projectStages, stage]
  })),
  addProjectStages: (stages) => set((state) => ({
    projectStages: [...state.projectStages, ...stages]
  })),
  updateProjectStage: (id, updates) => set((state) => ({
    projectStages: state.projectStages.map((s) => s.id === id ? { ...s, ...updates } : s)
  })),
  deleteProjectStage: (id) => set((state) => ({
    projectStages: state.projectStages.filter((s) => s.id !== id)
  })),
  reorderProjectStages: (projectId, orderedStageIds) => set((state) => {
    const updates: Record<string, number> = {};
    orderedStageIds.forEach((stageId, idx) => { updates[stageId] = idx; });
    return {
      projectStages: state.projectStages.map((s) =>
        s.project_id === projectId && updates[s.id] !== undefined
          ? { ...s, order_index: updates[s.id] }
          : s
      ),
    };
  }),

  // Scripts
  setScripts: (scripts) => set({ scripts }),
  addScript: (script) => set((state) => ({ scripts: [...state.scripts, script] })),
  updateScript: (id, updates) => set((state) => ({
    scripts: state.scripts.map((s) => s.id === id ? { ...s, ...updates } : s)
  })),
  deleteScript: (id) => set((state) => ({
    scripts: state.scripts.filter((s) => s.id !== id)
  })),
});
