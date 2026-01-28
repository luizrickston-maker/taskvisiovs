import { create } from 'zustand';
import type { 
  Category, Income, Expense, Debt, Saving, Goal, 
  Task, TimeBlock, ProjectCategory, Project, Script, UserPreference, CustomTimeBlockType, ProjectTask,
  SalesGoal, Prospect, CorporatePricing, CorporateInvestment, CorporateTeamMember,
  ServicePlan, ServicePlanItem, DocumentType, ProspectDocument,
  CorporateCostCategory, CorporateCost
} from '@/types/database';

interface AppState {
  // Data
  categories: Category[];
  incomes: Income[];
  expenses: Expense[];
  debts: Debt[];
  savings: Saving[];
  goals: Goal[];
  tasks: Task[];
  timeBlocks: TimeBlock[];
  customTimeBlockTypes: CustomTimeBlockType[];
  projectCategories: ProjectCategory[];
  projects: Project[];
  projectTasks: ProjectTask[];
  scripts: Script[];
  userPreferences: UserPreference | null;
  salesGoals: SalesGoal[];
  prospects: Prospect[];
  
  // Área PJ Data
  corporatePricings: CorporatePricing[];
  corporateInvestments: CorporateInvestment[];
  corporateTeam: CorporateTeamMember[];
  servicePlans: ServicePlan[];
  servicePlanItems: ServicePlanItem[];
  
  // Document Types
  documentTypes: DocumentType[];
  prospectDocuments: ProspectDocument[];
  
  // Corporate Costs
  corporateCostCategories: CorporateCostCategory[];
  corporateCosts: CorporateCost[];
  
  // Loading states
  isLoading: boolean;
  dataInitialized: boolean;
  
  // Actions - Categories
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // Actions - Incomes
  setIncomes: (incomes: Income[]) => void;
  addIncome: (income: Income) => void;
  updateIncome: (id: string, updates: Partial<Income>) => void;
  deleteIncome: (id: string) => void;
  
  // Actions - Expenses
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  
  // Actions - Debts
  setDebts: (debts: Debt[]) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  
  // Actions - Savings
  setSavings: (savings: Saving[]) => void;
  addSaving: (saving: Saving) => void;
  updateSaving: (id: string, updates: Partial<Saving>) => void;
  deleteSaving: (id: string) => void;
  
  // Actions - Goals
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  
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
  
  // Actions - Scripts
  setScripts: (scripts: Script[]) => void;
  addScript: (script: Script) => void;
  updateScript: (id: string, updates: Partial<Script>) => void;
  deleteScript: (id: string) => void;
  
  // Actions - UserPreferences
  setUserPreferences: (preferences: UserPreference | null) => void;
  updateUserPreferences: (updates: Partial<UserPreference>) => void;
  
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
  
  // Actions - Corporate Pricing
  setCorporatePricings: (pricings: CorporatePricing[]) => void;
  addCorporatePricing: (pricing: CorporatePricing) => void;
  updateCorporatePricing: (id: string, updates: Partial<CorporatePricing>) => void;
  deleteCorporatePricing: (id: string) => void;
  
  // Actions - Corporate Investments
  setCorporateInvestments: (investments: CorporateInvestment[]) => void;
  addCorporateInvestment: (investment: CorporateInvestment) => void;
  updateCorporateInvestment: (id: string, updates: Partial<CorporateInvestment>) => void;
  deleteCorporateInvestment: (id: string) => void;
  
  // Actions - Corporate Team
  setCorporateTeam: (team: CorporateTeamMember[]) => void;
  addCorporateTeamMember: (member: CorporateTeamMember) => void;
  updateCorporateTeamMember: (id: string, updates: Partial<CorporateTeamMember>) => void;
  deleteCorporateTeamMember: (id: string) => void;
  
  // Actions - Service Plans
  setServicePlans: (plans: ServicePlan[]) => void;
  addServicePlan: (plan: ServicePlan) => void;
  updateServicePlan: (id: string, updates: Partial<ServicePlan>) => void;
  deleteServicePlan: (id: string) => void;
  
  // Actions - Service Plan Items
  setServicePlanItems: (items: ServicePlanItem[]) => void;
  addServicePlanItem: (item: ServicePlanItem) => void;
  updateServicePlanItem: (id: string, updates: Partial<ServicePlanItem>) => void;
  deleteServicePlanItem: (id: string) => void;
  
  // Actions - Document Types
  setDocumentTypes: (types: DocumentType[]) => void;
  addDocumentType: (type: DocumentType) => void;
  updateDocumentType: (id: string, updates: Partial<DocumentType>) => void;
  deleteDocumentType: (id: string) => void;
  
  // Actions - Prospect Documents
  setProspectDocuments: (docs: ProspectDocument[]) => void;
  addProspectDocument: (doc: ProspectDocument) => void;
  deleteProspectDocument: (id: string) => void;
  
  // Actions - Corporate Cost Categories
  setCorporateCostCategories: (categories: CorporateCostCategory[]) => void;
  addCorporateCostCategory: (category: CorporateCostCategory) => void;
  updateCorporateCostCategory: (id: string, updates: Partial<CorporateCostCategory>) => void;
  deleteCorporateCostCategory: (id: string) => void;
  
  // Actions - Corporate Costs
  setCorporateCosts: (costs: CorporateCost[]) => void;
  addCorporateCost: (cost: CorporateCost) => void;
  updateCorporateCost: (id: string, updates: Partial<CorporateCost>) => void;
  deleteCorporateCost: (id: string) => void;
  
  // Actions - Loading
  setIsLoading: (loading: boolean) => void;
  setDataInitialized: (initialized: boolean) => void;
  
  // Actions - Reset
  resetStore: () => void;
}

const initialState = {
  categories: [],
  incomes: [],
  expenses: [],
  debts: [],
  savings: [],
  goals: [],
  tasks: [],
  timeBlocks: [],
  customTimeBlockTypes: [],
  projectCategories: [],
  projects: [],
  projectTasks: [],
  scripts: [],
  userPreferences: null,
  salesGoals: [],
  prospects: [],
  corporatePricings: [],
  corporateInvestments: [],
  corporateTeam: [],
  servicePlans: [],
  servicePlanItems: [],
  documentTypes: [],
  prospectDocuments: [],
  corporateCostCategories: [],
  corporateCosts: [],
  isLoading: false,
  dataInitialized: false,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  
  // Categories
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, updates) => set((state) => ({
    categories: state.categories.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  deleteCategory: (id) => set((state) => ({
    categories: state.categories.filter((c) => c.id !== id)
  })),
  
  // Incomes
  setIncomes: (incomes) => set({ incomes }),
  addIncome: (income) => set((state) => ({ incomes: [...state.incomes, income] })),
  updateIncome: (id, updates) => set((state) => ({
    incomes: state.incomes.map((i) => i.id === id ? { ...i, ...updates } : i)
  })),
  deleteIncome: (id) => set((state) => ({
    incomes: state.incomes.filter((i) => i.id !== id)
  })),
  
  // Expenses
  setExpenses: (expenses) => set({ expenses }),
  addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
  updateExpense: (id, updates) => set((state) => ({
    expenses: state.expenses.map((e) => e.id === id ? { ...e, ...updates } : e)
  })),
  deleteExpense: (id) => set((state) => ({
    expenses: state.expenses.filter((e) => e.id !== id)
  })),
  
  // Debts
  setDebts: (debts) => set({ debts }),
  addDebt: (debt) => set((state) => ({ debts: [...state.debts, debt] })),
  updateDebt: (id, updates) => set((state) => ({
    debts: state.debts.map((d) => d.id === id ? { ...d, ...updates } : d)
  })),
  deleteDebt: (id) => set((state) => ({
    debts: state.debts.filter((d) => d.id !== id)
  })),
  
  // Savings
  setSavings: (savings) => set({ savings }),
  addSaving: (saving) => set((state) => ({ savings: [...state.savings, saving] })),
  updateSaving: (id, updates) => set((state) => ({
    savings: state.savings.map((s) => s.id === id ? { ...s, ...updates } : s)
  })),
  deleteSaving: (id) => set((state) => ({
    savings: state.savings.filter((s) => s.id !== id)
  })),
  
  // Goals
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (id, updates) => set((state) => ({
    goals: state.goals.map((g) => g.id === id ? { ...g, ...updates } : g)
  })),
  deleteGoal: (id) => set((state) => ({
    goals: state.goals.filter((g) => g.id !== id)
  })),
  
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
  
  // Scripts
  setScripts: (scripts) => set({ scripts }),
  addScript: (script) => set((state) => ({ scripts: [...state.scripts, script] })),
  updateScript: (id, updates) => set((state) => ({
    scripts: state.scripts.map((s) => s.id === id ? { ...s, ...updates } : s)
  })),
  deleteScript: (id) => set((state) => ({
    scripts: state.scripts.filter((s) => s.id !== id)
  })),
  
  // UserPreferences
  setUserPreferences: (preferences) => set({ userPreferences: preferences }),
  updateUserPreferences: (updates) => set((state) => ({
    userPreferences: state.userPreferences ? { ...state.userPreferences, ...updates } : null
  })),
  
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
  
  // Corporate Pricing
  setCorporatePricings: (corporatePricings) => set({ corporatePricings }),
  addCorporatePricing: (pricing) => set((state) => ({ 
    corporatePricings: [...state.corporatePricings, pricing] 
  })),
  updateCorporatePricing: (id, updates) => set((state) => ({
    corporatePricings: state.corporatePricings.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  deleteCorporatePricing: (id) => set((state) => ({
    corporatePricings: state.corporatePricings.filter((p) => p.id !== id)
  })),
  
  // Corporate Investments
  setCorporateInvestments: (corporateInvestments) => set({ corporateInvestments }),
  addCorporateInvestment: (investment) => set((state) => ({ 
    corporateInvestments: [...state.corporateInvestments, investment] 
  })),
  updateCorporateInvestment: (id, updates) => set((state) => ({
    corporateInvestments: state.corporateInvestments.map((i) => i.id === id ? { ...i, ...updates } : i)
  })),
  deleteCorporateInvestment: (id) => set((state) => ({
    corporateInvestments: state.corporateInvestments.filter((i) => i.id !== id)
  })),
  
  // Corporate Team
  setCorporateTeam: (corporateTeam) => set({ corporateTeam }),
  addCorporateTeamMember: (member) => set((state) => ({ 
    corporateTeam: [...state.corporateTeam, member] 
  })),
  updateCorporateTeamMember: (id, updates) => set((state) => ({
    corporateTeam: state.corporateTeam.map((m) => m.id === id ? { ...m, ...updates } : m)
  })),
  deleteCorporateTeamMember: (id) => set((state) => ({
    corporateTeam: state.corporateTeam.filter((m) => m.id !== id)
  })),
  
  // Service Plans
  setServicePlans: (servicePlans) => set({ servicePlans }),
  addServicePlan: (plan) => set((state) => ({ 
    servicePlans: [...state.servicePlans, plan] 
  })),
  updateServicePlan: (id, updates) => set((state) => ({
    servicePlans: state.servicePlans.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  deleteServicePlan: (id) => set((state) => ({
    servicePlans: state.servicePlans.filter((p) => p.id !== id)
  })),
  
  // Service Plan Items
  setServicePlanItems: (servicePlanItems) => set({ servicePlanItems }),
  addServicePlanItem: (item) => set((state) => ({ 
    servicePlanItems: [...state.servicePlanItems, item] 
  })),
  updateServicePlanItem: (id, updates) => set((state) => ({
    servicePlanItems: state.servicePlanItems.map((i) => i.id === id ? { ...i, ...updates } : i)
  })),
  deleteServicePlanItem: (id) => set((state) => ({
    servicePlanItems: state.servicePlanItems.filter((i) => i.id !== id)
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
  
  // Corporate Cost Categories
  setCorporateCostCategories: (corporateCostCategories) => set({ corporateCostCategories }),
  addCorporateCostCategory: (category) => set((state) => ({ 
    corporateCostCategories: [...state.corporateCostCategories, category] 
  })),
  updateCorporateCostCategory: (id, updates) => set((state) => ({
    corporateCostCategories: state.corporateCostCategories.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  deleteCorporateCostCategory: (id) => set((state) => ({
    corporateCostCategories: state.corporateCostCategories.filter((c) => c.id !== id)
  })),
  
  // Corporate Costs
  setCorporateCosts: (corporateCosts) => set({ corporateCosts }),
  addCorporateCost: (cost) => set((state) => ({ 
    corporateCosts: [...state.corporateCosts, cost] 
  })),
  updateCorporateCost: (id, updates) => set((state) => ({
    corporateCosts: state.corporateCosts.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  deleteCorporateCost: (id) => set((state) => ({
    corporateCosts: state.corporateCosts.filter((c) => c.id !== id)
  })),
  
  // Loading
  setIsLoading: (isLoading) => set({ isLoading }),
  setDataInitialized: (dataInitialized) => set({ dataInitialized }),
  
  // Reset
  resetStore: () => set(initialState),
}));
