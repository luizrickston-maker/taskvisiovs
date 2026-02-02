import type { StateCreator } from 'zustand';
import type { Category, Income, Expense, Debt, Saving, Goal } from '@/types/database';

export interface FinancialSlice {
  // Data
  categories: Category[];
  incomes: Income[];
  expenses: Expense[];
  debts: Debt[];
  savings: Saving[];
  goals: Goal[];
  
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
}

export const createFinancialSlice: StateCreator<FinancialSlice, [], [], FinancialSlice> = (set) => ({
  // Initial State
  categories: [],
  incomes: [],
  expenses: [],
  debts: [],
  savings: [],
  goals: [],
  
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
});
