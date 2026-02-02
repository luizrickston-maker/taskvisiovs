import type { StateCreator } from 'zustand';
import type { SalesGoal, Prospect, DocumentType, ProspectDocument } from '@/types/database';

export interface SalesSlice {
  // Data
  salesGoals: SalesGoal[];
  prospects: Prospect[];
  documentTypes: DocumentType[];
  prospectDocuments: ProspectDocument[];
  
  // Actions - SalesGoals
  setSalesGoals: (salesGoals: SalesGoal[]) => void;
  addSalesGoal: (salesGoal: SalesGoal) => void;
  updateSalesGoal: (id: string, updates: Partial<SalesGoal>) => void;
  deleteSalesGoal: (id: string) => void;
  
  // Actions - Prospects
  setProspects: (prospects: Prospect[]) => void;
  addProspect: (prospect: Prospect) => void;
  updateProspect: (id: string, updates: Partial<Prospect>) => void;
  deleteProspect: (id: string) => void;
  
  // Actions - Document Types
  setDocumentTypes: (types: DocumentType[]) => void;
  addDocumentType: (type: DocumentType) => void;
  updateDocumentType: (id: string, updates: Partial<DocumentType>) => void;
  deleteDocumentType: (id: string) => void;
  
  // Actions - Prospect Documents
  setProspectDocuments: (docs: ProspectDocument[]) => void;
  addProspectDocument: (doc: ProspectDocument) => void;
  deleteProspectDocument: (id: string) => void;
}

export const createSalesSlice: StateCreator<SalesSlice, [], [], SalesSlice> = (set) => ({
  // Initial State
  salesGoals: [],
  prospects: [],
  documentTypes: [],
  prospectDocuments: [],
  
  // SalesGoals
  setSalesGoals: (salesGoals) => set({ salesGoals }),
  addSalesGoal: (salesGoal) => set((state) => ({ salesGoals: [...state.salesGoals, salesGoal] })),
  updateSalesGoal: (id, updates) => set((state) => ({
    salesGoals: state.salesGoals.map((sg) => sg.id === id ? { ...sg, ...updates } : sg)
  })),
  deleteSalesGoal: (id) => set((state) => ({
    salesGoals: state.salesGoals.filter((sg) => sg.id !== id)
  })),
  
  // Prospects
  setProspects: (prospects) => set({ prospects }),
  addProspect: (prospect) => set((state) => ({ prospects: [...state.prospects, prospect] })),
  updateProspect: (id, updates) => set((state) => ({
    prospects: state.prospects.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  deleteProspect: (id) => set((state) => ({
    prospects: state.prospects.filter((p) => p.id !== id)
  })),
  
  // Document Types
  setDocumentTypes: (documentTypes) => set({ documentTypes }),
  addDocumentType: (type) => set((state) => ({ 
    documentTypes: [...state.documentTypes, type] 
  })),
  updateDocumentType: (id, updates) => set((state) => ({
    documentTypes: state.documentTypes.map((t) => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteDocumentType: (id) => set((state) => ({
    documentTypes: state.documentTypes.filter((t) => t.id !== id)
  })),
  
  // Prospect Documents
  setProspectDocuments: (prospectDocuments) => set({ prospectDocuments }),
  addProspectDocument: (doc) => set((state) => ({ 
    prospectDocuments: [...state.prospectDocuments, doc] 
  })),
  deleteProspectDocument: (id) => set((state) => ({
    prospectDocuments: state.prospectDocuments.filter((d) => d.id !== id)
  })),
});
