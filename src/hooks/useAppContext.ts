import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppContextMode = 'personal' | 'business';

interface AppContextState {
  mode: AppContextMode;
  setMode: (mode: AppContextMode) => void;
  toggleMode: () => void;
}

export const useAppContext = create<AppContextState>()(
  persist(
    (set) => ({
      mode: 'personal',
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({ 
        mode: state.mode === 'personal' ? 'business' : 'personal' 
      })),
    }),
    {
      name: 'app-context-mode',
    }
  )
);
