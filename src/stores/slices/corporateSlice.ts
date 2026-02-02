import type { StateCreator } from 'zustand';
import type {
  CorporatePricing,
  CorporateInvestment,
  CorporateTeamMember,
  ServicePlan,
  ServicePlanItem,
  CorporateCostCategory,
  CorporateCost,
  PaymentFeeSetting,
} from '@/types/database';

export interface CorporateSlice {
  // Data
  corporatePricings: CorporatePricing[];
  corporateInvestments: CorporateInvestment[];
  corporateTeam: CorporateTeamMember[];
  servicePlans: ServicePlan[];
  servicePlanItems: ServicePlanItem[];
  corporateCostCategories: CorporateCostCategory[];
  corporateCosts: CorporateCost[];
  paymentFeeSettings: PaymentFeeSetting[];
  
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
  
  // Actions - Payment Fee Settings
  setPaymentFeeSettings: (settings: PaymentFeeSetting[]) => void;
  addPaymentFeeSetting: (setting: PaymentFeeSetting) => void;
  updatePaymentFeeSetting: (id: string, updates: Partial<PaymentFeeSetting>) => void;
  deletePaymentFeeSetting: (id: string) => void;
}

export const createCorporateSlice: StateCreator<CorporateSlice, [], [], CorporateSlice> = (set) => ({
  // Initial State
  corporatePricings: [],
  corporateInvestments: [],
  corporateTeam: [],
  servicePlans: [],
  servicePlanItems: [],
  corporateCostCategories: [],
  corporateCosts: [],
  paymentFeeSettings: [],
  
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
  
  // Payment Fee Settings
  setPaymentFeeSettings: (paymentFeeSettings) => set({ paymentFeeSettings }),
  addPaymentFeeSetting: (setting) => set((state) => ({ 
    paymentFeeSettings: [...state.paymentFeeSettings, setting] 
  })),
  updatePaymentFeeSetting: (id, updates) => set((state) => ({
    paymentFeeSettings: state.paymentFeeSettings.map((s) => s.id === id ? { ...s, ...updates } : s)
  })),
  deletePaymentFeeSetting: (id) => set((state) => ({
    paymentFeeSettings: state.paymentFeeSettings.filter((s) => s.id !== id)
  })),
});
