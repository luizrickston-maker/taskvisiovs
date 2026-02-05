 import type { StateCreator } from 'zustand';
import type { Service, ServicePricingDetail, Product, ProductPricingDetail } from '@/types/database';
 
 export interface CatalogSlice {
   // Data
   services: Service[];
   servicePricingDetails: ServicePricingDetail[];
  products: Product[];
  productPricingDetails: ProductPricingDetail[];
   
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

  // Actions - Products
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Actions - Product Pricing Details
  setProductPricingDetails: (details: ProductPricingDetail[]) => void;
  addProductPricingDetail: (detail: ProductPricingDetail) => void;
  updateProductPricingDetail: (id: string, updates: Partial<ProductPricingDetail>) => void;
  deleteProductPricingDetail: (id: string) => void;
 }
 
 export const createCatalogSlice: StateCreator<CatalogSlice, [], [], CatalogSlice> = (set) => ({
   // Initial State
   services: [],
   servicePricingDetails: [],
  products: [],
  productPricingDetails: [],
   
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

  // Products
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({ 
    products: [...state.products, product] 
  })),
  updateProduct: (id, updates) => set((state) => ({
    products: state.products.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  deleteProduct: (id) => set((state) => ({
    products: state.products.filter((p) => p.id !== id)
  })),

  // Product Pricing Details
  setProductPricingDetails: (productPricingDetails) => set({ productPricingDetails }),
  addProductPricingDetail: (detail) => set((state) => ({ 
    productPricingDetails: [...state.productPricingDetails, detail] 
  })),
  updateProductPricingDetail: (id, updates) => set((state) => ({
    productPricingDetails: state.productPricingDetails.map((d) => d.id === id ? { ...d, ...updates } : d)
  })),
  deleteProductPricingDetail: (id) => set((state) => ({
    productPricingDetails: state.productPricingDetails.filter((d) => d.id !== id)
  })),
 });