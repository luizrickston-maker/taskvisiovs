import type { StateCreator } from 'zustand';
import type { EditorialCalendarItem, EditorialComment } from '@/types/editorial';
import type { PurchasePlan, UserPreference } from '@/types/database';

export interface ContentSlice {
  // Data
  editorialCalendarItems: EditorialCalendarItem[];
  editorialComments: EditorialComment[];
  purchasePlans: PurchasePlan[];
  userPreferences: UserPreference | null;
  
  // Actions - Editorial Calendar Items
  setEditorialCalendarItems: (items: EditorialCalendarItem[]) => void;
  addEditorialCalendarItem: (item: EditorialCalendarItem) => void;
  updateEditorialCalendarItem: (id: string, updates: Partial<EditorialCalendarItem>) => void;
  deleteEditorialCalendarItem: (id: string) => void;
  
  // Actions - Editorial Comments
  setEditorialComments: (comments: EditorialComment[]) => void;
  addEditorialComment: (comment: EditorialComment) => void;
  updateEditorialComment: (id: string, updates: Partial<EditorialComment>) => void;
  deleteEditorialComment: (id: string) => void;
  
  // Actions - Purchase Plans
  setPurchasePlans: (plans: PurchasePlan[]) => void;
  addPurchasePlan: (plan: PurchasePlan) => void;
  updatePurchasePlan: (id: string, updates: Partial<PurchasePlan>) => void;
  deletePurchasePlan: (id: string) => void;
  
  // Actions - UserPreferences
  setUserPreferences: (preferences: UserPreference | null) => void;
  updateUserPreferences: (updates: Partial<UserPreference>) => void;
}

export const createContentSlice: StateCreator<ContentSlice, [], [], ContentSlice> = (set) => ({
  // Initial State
  editorialCalendarItems: [],
  editorialComments: [],
  purchasePlans: [],
  userPreferences: null,
  
  // Editorial Calendar Items
  setEditorialCalendarItems: (editorialCalendarItems) => set({ editorialCalendarItems }),
  addEditorialCalendarItem: (item) => set((state) => ({ 
    editorialCalendarItems: [...state.editorialCalendarItems, item] 
  })),
  updateEditorialCalendarItem: (id, updates) => set((state) => ({
    editorialCalendarItems: state.editorialCalendarItems.map((i) => i.id === id ? { ...i, ...updates } : i)
  })),
  deleteEditorialCalendarItem: (id) => set((state) => ({
    editorialCalendarItems: state.editorialCalendarItems.filter((i) => i.id !== id)
  })),
  
  // Editorial Comments
  setEditorialComments: (editorialComments) => set({ editorialComments }),
  addEditorialComment: (comment) => set((state) => ({ 
    editorialComments: [...state.editorialComments, comment] 
  })),
  updateEditorialComment: (id, updates) => set((state) => ({
    editorialComments: state.editorialComments.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  deleteEditorialComment: (id) => set((state) => ({
    editorialComments: state.editorialComments.filter((c) => c.id !== id)
  })),
  
  // Purchase Plans
  setPurchasePlans: (purchasePlans) => set({ purchasePlans }),
  addPurchasePlan: (plan) => set((state) => ({ 
    purchasePlans: [...state.purchasePlans, plan] 
  })),
  updatePurchasePlan: (id, updates) => set((state) => ({
    purchasePlans: state.purchasePlans.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  deletePurchasePlan: (id) => set((state) => ({
    purchasePlans: state.purchasePlans.filter((p) => p.id !== id)
  })),
  
  // UserPreferences
  setUserPreferences: (preferences) => set({ userPreferences: preferences }),
  updateUserPreferences: (updates) => set((state) => ({
    userPreferences: state.userPreferences ? { ...state.userPreferences, ...updates } : null
  })),
});
