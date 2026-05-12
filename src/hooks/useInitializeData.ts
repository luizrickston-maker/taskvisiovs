import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import type { 
  Category, Income, Expense, Debt, Saving, Goal, Task, TimeBlock, ProjectCategory, Project, Script, 
  UserPreference, CustomTimeBlockType, ProjectTask, SalesGoal, Prospect,
  CorporatePricing, CorporateInvestment, CorporateTeamMember, ServicePlan, ServicePlanItem,
  DocumentType, CorporateCostCategory, CorporateCost, PaymentFeeSetting, PurchasePlan,
  UserIncomeCategory, UserDebtCategory, Product, ProductPricingDetail
} from '@/types/database';
import type { EditorialCalendarItem, EditorialComment } from '@/types/editorial';

export function useInitializeData(userId: string | undefined) {
  const loadingRef = useRef(false);
  const store = useAppStore();

  useEffect(() => {
    if (!userId || loadingRef.current || store.dataInitialized) return;

    loadingRef.current = true;
    store.setIsLoading(true);

    // Phase 1: Critical data for initial view (/caixa + /meu-dia)
    const loadCritical = async () => {
      const [
        categoriesRes, incomesRes, expensesRes, debtsRes,
        savingsRes, tasksRes, timeBlocksRes, preferencesRes, goalsRes,
      ] = await Promise.all([
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('incomes').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('debts').select('*').order('due_date', { ascending: true }),
        supabase.from('savings').select('*').order('date', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('time_blocks').select('*').order('date', { ascending: true }),
        supabase.from('user_preferences').select('*').maybeSingle(),
        supabase.from('goals').select('*').order('deadline', { ascending: true }),
      ]).catch(error => {
        console.error('[Initialize] Critical data fetch error:', error);
        return [
          { data: [], error }, { data: [], error }, { data: [], error },
          { data: [], error }, { data: [], error }, { data: [], error },
          { data: [], error }, { data: null, error }, { data: [], error }
        ];
      });

      if (categoriesRes.data) store.setCategories(categoriesRes.data as Category[]);
      if (incomesRes.data) store.setIncomes(incomesRes.data as Income[]);
      if (expensesRes.data) store.setExpenses(expensesRes.data as Expense[]);
      if (debtsRes.data) store.setDebts(debtsRes.data as Debt[]);
      if (savingsRes.data) store.setSavings(savingsRes.data as Saving[]);
      if (tasksRes.data) store.setTasks(tasksRes.data as Task[]);
      if (timeBlocksRes.data) store.setTimeBlocks(timeBlocksRes.data as TimeBlock[]);
      if (preferencesRes.data) store.setUserPreferences(preferencesRes.data as UserPreference);
      if (goalsRes.data) store.setGoals(goalsRes.data as Goal[]);

      // Mark initialized + stop loading so UI renders immediately
      store.setDataInitialized(true);
      store.setIsLoading(false);
    };

    // Phase 2: Secondary data loaded in background (non-blocking)
    const loadSecondary = async () => {
      const [
        userIncomeCategoriesRes, userDebtCategoriesRes,
        customTimeBlockTypesRes, projectCategoriesRes, projectsRes,
        projectTasksRes, scriptsRes, salesGoalsRes, prospectsRes,
        corporatePricingsRes, corporateInvestmentsRes, corporateTeamRes,
        servicePlansRes, servicePlanItemsRes, documentTypesRes,
        costCategoriesRes, costsRes, paymentFeeSettingsRes,
        editorialCalendarItemsRes, editorialCommentsRes,
        purchasePlansRes, productsRes, productPricingDetailsRes,
      ] = await Promise.all([
        supabase.from('user_income_categories').select('*').order('name', { ascending: true }),
        supabase.from('user_debt_categories').select('*').order('name', { ascending: true }),
        supabase.from('time_block_types').select('*').order('created_at', { ascending: true }),
        supabase.from('project_categories').select('*').order('created_at', { ascending: true }),
        supabase.from('projects').select('*').order('priority', { ascending: true }),
        supabase.from('project_tasks').select('*').order('priority', { ascending: true }),
        supabase.from('scripts').select('*').order('scheduled_date', { ascending: true }),
        supabase.from('sales_goals').select('*').order('start_date', { ascending: false }),
        supabase.from('prospects').select('*').order('prospection_date', { ascending: false }),
        supabase.from('corporate_pricing').select('*').order('created_at', { ascending: false }),
        supabase.from('corporate_investments').select('*').order('purchase_date', { ascending: false }),
        supabase.from('corporate_team').select('*').order('name', { ascending: true }),
        supabase.from('service_plans').select('*').order('created_at', { ascending: false }),
        supabase.from('service_plan_items').select('*').order('created_at', { ascending: true }),
        supabase.from('document_types').select('*').order('name', { ascending: true }),
        supabase.from('corporate_cost_categories').select('*').order('name', { ascending: true }),
        supabase.from('corporate_costs').select('*').order('created_at', { ascending: false }),
        supabase.from('payment_fee_settings').select('*').order('method', { ascending: true }),
        supabase.from('editorial_calendar_items').select('*').order('due_date', { ascending: true }),
        supabase.from('editorial_comments').select('*').order('created_at', { ascending: false }),
        supabase.from('purchase_plans').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('name', { ascending: true }),
        supabase.from('product_pricing_details').select('*').order('created_at', { ascending: true }),
      ]);

      if (userIncomeCategoriesRes.data) store.setUserIncomeCategories(userIncomeCategoriesRes.data as UserIncomeCategory[]);
      if (userDebtCategoriesRes.data) store.setUserDebtCategories(userDebtCategoriesRes.data as UserDebtCategory[]);
      if (customTimeBlockTypesRes.data) store.setCustomTimeBlockTypes(customTimeBlockTypesRes.data as CustomTimeBlockType[]);
      if (projectCategoriesRes.data) store.setProjectCategories(projectCategoriesRes.data as ProjectCategory[]);
      if (projectsRes.data) store.setProjects(projectsRes.data as Project[]);
      if (projectTasksRes.data) store.setProjectTasks(projectTasksRes.data as ProjectTask[]);
      if (scriptsRes.data) store.setScripts(scriptsRes.data as Script[]);
      if (salesGoalsRes.data) store.setSalesGoals(salesGoalsRes.data as SalesGoal[]);
      if (prospectsRes.data) store.setProspects(prospectsRes.data as Prospect[]);
      if (corporatePricingsRes.data) store.setCorporatePricings(corporatePricingsRes.data as CorporatePricing[]);
      if (corporateInvestmentsRes.data) store.setCorporateInvestments(corporateInvestmentsRes.data as CorporateInvestment[]);
      if (corporateTeamRes.data) store.setCorporateTeam(corporateTeamRes.data as CorporateTeamMember[]);
      if (servicePlansRes.data) store.setServicePlans(servicePlansRes.data as ServicePlan[]);
      if (servicePlanItemsRes.data) store.setServicePlanItems(servicePlanItemsRes.data as ServicePlanItem[]);
      if (documentTypesRes.data) store.setDocumentTypes(documentTypesRes.data as DocumentType[]);
      if (costCategoriesRes.data) store.setCorporateCostCategories(costCategoriesRes.data as CorporateCostCategory[]);
      if (costsRes.data) store.setCorporateCosts(costsRes.data as CorporateCost[]);
      if (paymentFeeSettingsRes.data) store.setPaymentFeeSettings(paymentFeeSettingsRes.data as PaymentFeeSetting[]);
      if (editorialCalendarItemsRes.data) store.setEditorialCalendarItems(editorialCalendarItemsRes.data as EditorialCalendarItem[]);
      if (editorialCommentsRes.data) store.setEditorialComments(editorialCommentsRes.data as EditorialComment[]);
      if (purchasePlansRes.data) store.setPurchasePlans(purchasePlansRes.data as PurchasePlan[]);
      if (productsRes.data) store.setProducts(productsRes.data as Product[]);
      if (productPricingDetailsRes.data) store.setProductPricingDetails(productPricingDetailsRes.data as ProductPricingDetail[]);
    };

    // Execute: critical first, then secondary in background
    loadCritical()
      .then(() => loadSecondary())
      .catch((error) => {
        console.error('Error loading data:', error);
        store.setIsLoading(false);
      })
      .finally(() => {
        loadingRef.current = false;
      });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
}
