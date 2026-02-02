import type { StateCreator } from 'zustand';
import type { Task, TimeBlock, CustomTimeBlockType } from '@/types/database';

export interface ProductivitySlice {
  // Data
  tasks: Task[];
  timeBlocks: TimeBlock[];
  customTimeBlockTypes: CustomTimeBlockType[];
  
  // Actions - Tasks
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Actions - TimeBlocks
  setTimeBlocks: (timeBlocks: TimeBlock[]) => void;
  addTimeBlock: (timeBlock: TimeBlock) => void;
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (id: string) => void;
  
  // Actions - CustomTimeBlockTypes
  setCustomTimeBlockTypes: (types: CustomTimeBlockType[]) => void;
  addCustomTimeBlockType: (type: CustomTimeBlockType) => void;
  updateCustomTimeBlockType: (id: string, updates: Partial<CustomTimeBlockType>) => void;
  deleteCustomTimeBlockType: (id: string) => void;
}

export const createProductivitySlice: StateCreator<ProductivitySlice, [], [], ProductivitySlice> = (set) => ({
  // Initial State
  tasks: [],
  timeBlocks: [],
  customTimeBlockTypes: [],
  
  // Tasks
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id)
  })),
  
  // TimeBlocks
  setTimeBlocks: (timeBlocks) => set({ timeBlocks }),
  addTimeBlock: (timeBlock) => set((state) => ({ timeBlocks: [...state.timeBlocks, timeBlock] })),
  updateTimeBlock: (id, updates) => set((state) => ({
    timeBlocks: state.timeBlocks.map((tb) => tb.id === id ? { ...tb, ...updates } : tb)
  })),
  deleteTimeBlock: (id) => set((state) => ({
    timeBlocks: state.timeBlocks.filter((tb) => tb.id !== id)
  })),
  
  // CustomTimeBlockTypes
  setCustomTimeBlockTypes: (customTimeBlockTypes) => set({ customTimeBlockTypes }),
  addCustomTimeBlockType: (type) => set((state) => ({ 
    customTimeBlockTypes: [...state.customTimeBlockTypes, type] 
  })),
  updateCustomTimeBlockType: (id, updates) => set((state) => ({
    customTimeBlockTypes: state.customTimeBlockTypes.map((t) => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteCustomTimeBlockType: (id) => set((state) => ({
    customTimeBlockTypes: state.customTimeBlockTypes.filter((t) => t.id !== id)
  })),
});
