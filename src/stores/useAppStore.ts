import { create } from 'zustand';
import {
  createFinancialSlice,
  createProductivitySlice,
  createProjectsSlice,
  createSalesSlice,
  createCorporateSlice,
  createContentSlice,
  type FinancialSlice,
  type ProductivitySlice,
  type ProjectsSlice,
  type SalesSlice,
  type CorporateSlice,
  type ContentSlice,
} from './slices';

// =====================================================
// App State Interface - Composed from Slices
// =====================================================

interface AppLoadingState {
  isLoading: boolean;
  dataInitialized: boolean;
  setIsLoading: (loading: boolean) => void;
  setDataInitialized: (initialized: boolean) => void;
  resetStore: () => void;
}

export type AppState = FinancialSlice 
  & ProductivitySlice 
  & ProjectsSlice 
  & SalesSlice 
  & CorporateSlice 
  & ContentSlice 
  & AppLoadingState;

// =====================================================
// Initial State for Reset
// =====================================================

const initialLoadingState = {
  isLoading: false,
  dataInitialized: false,
};

// =====================================================
// Combined Store
// =====================================================

export const useAppStore = create<AppState>()((...args) => ({
  // Compose all slices
  ...createFinancialSlice(...args),
  ...createProductivitySlice(...args),
  ...createProjectsSlice(...args),
  ...createSalesSlice(...args),
  ...createCorporateSlice(...args),
  ...createContentSlice(...args),
  
  // Loading State
  ...initialLoadingState,
  setIsLoading: (isLoading) => args[0]({ isLoading }),
  setDataInitialized: (dataInitialized) => args[0]({ dataInitialized }),
  
  // Reset Store
  resetStore: () => args[0]({
    // Financial
    categories: [],
    incomes: [],
    expenses: [],
    debts: [],
    savings: [],
    goals: [],
    userIncomeCategories: [],
    userDebtCategories: [],
    
    // Productivity
    tasks: [],
    timeBlocks: [],
    customTimeBlockTypes: [],
    
    // Projects
    projectCategories: [],
    projects: [],
    projectTasks: [],
    scripts: [],
    
    // Sales
    salesGoals: [],
    prospects: [],
    documentTypes: [],
    prospectDocuments: [],
    
    // Corporate
    corporatePricings: [],
    corporateInvestments: [],
    corporateTeam: [],
    servicePlans: [],
    servicePlanItems: [],
    corporateCostCategories: [],
    corporateCosts: [],
    paymentFeeSettings: [],
    
    // Content
    editorialCalendarItems: [],
    editorialComments: [],
    purchasePlans: [],
    userPreferences: null,
    
    // Loading
    ...initialLoadingState,
  }),
}));
