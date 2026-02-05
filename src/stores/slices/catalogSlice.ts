 import type { StateCreator } from 'zustand';
 import type { Service, ServicePricingDetail } from '@/types/database';
 
 export interface CatalogSlice {
   // Data
   services: Service[];
   servicePricingDetails: ServicePricingDetail[];
   
   // Actions - Services
   setServices: (services: Service[]) => void;
   addService: (service: Service) => void;
   updateService: (id: string, updates: Partial<Service>) => void;
   deleteService: (id: string) => void;
   
   // Actions - Service Pricing Details
   setServicePricingDetails: (details: ServicePricingDetail[]) => void;
   addServicePricingDetail: (detail: ServicePricingDetail) => void;
   updateServicePricingDetail: (id: string, updates: Partial<ServicePricingDetail>) => void;
   deleteServicePricingDetail: (id: string) => void;
 }
 
 export const createCatalogSlice: StateCreator<CatalogSlice, [], [], CatalogSlice> = (set) => ({
   // Initial State
   services: [],
   servicePricingDetails: [],
   
   // Services
   setServices: (services) => set({ services }),
   addService: (service) => set((state) => ({ 
     services: [...state.services, service] 
   })),
   updateService: (id, updates) => set((state) => ({
     services: state.services.map((s) => s.id === id ? { ...s, ...updates } : s)
   })),
   deleteService: (id) => set((state) => ({
     services: state.services.filter((s) => s.id !== id)
   })),
   
   // Service Pricing Details
   setServicePricingDetails: (servicePricingDetails) => set({ servicePricingDetails }),
   addServicePricingDetail: (detail) => set((state) => ({ 
     servicePricingDetails: [...state.servicePricingDetails, detail] 
   })),
   updateServicePricingDetail: (id, updates) => set((state) => ({
     servicePricingDetails: state.servicePricingDetails.map((d) => d.id === id ? { ...d, ...updates } : d)
   })),
   deleteServicePricingDetail: (id) => set((state) => ({
     servicePricingDetails: state.servicePricingDetails.filter((d) => d.id !== id)
   })),
 });