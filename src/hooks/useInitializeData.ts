import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import type { 
  Category, Income, Expense, Debt, Saving, Goal, Task, TimeBlock, ProjectCategory, Project, Script, 
  UserPreference, CustomTimeBlockType, ProjectTask, SalesGoal, Prospect,
  CorporatePricing, CorporateInvestment, CorporateTeamMember, ServicePlan, ServicePlanItem,
  DocumentType, CorporateCostCategory, CorporateCost, PaymentFeeSetting, PurchasePlan,
  UserIncomeCategory, UserDebtCategory
} from '@/types/database';
import type { EditorialCalendarItem, EditorialComment } from '@/types/editorial';

export function useInitializeData(userId: string | undefined) {
  const loadingRef = useRef(false);
  const {
    setCategories,
    setIncomes,
    setExpenses,
    setDebts,
    setSavings,
    setGoals,
    setUserIncomeCategories,
    setUserDebtCategories,
    setTasks,
    setTimeBlocks,
    setCustomTimeBlockTypes,
    setProjectCategories,
    setProjects,
    setProjectTasks,
    setScripts,
    setUserPreferences,
    setSalesGoals,
    setProspects,
    setCorporatePricings,
    setCorporateInvestments,
    setCorporateTeam,
    setServicePlans,
    setServicePlanItems,
    setDocumentTypes,
    setCorporateCostCategories,
    setCorporateCosts,
    setPaymentFeeSettings,
    setEditorialCalendarItems,
    setEditorialComments,
    setPurchasePlans,
    setIsLoading,
    setDataInitialized,
    dataInitialized,
  } = useAppStore();

  useEffect(() => {
    if (!userId) {
      loadingRef.current = false;
      return;
    }

    if (loadingRef.current || dataInitialized) {
      return;
    }

    loadingRef.current = true;

    const loadAllData = async () => {
      setIsLoading(true);

      try {
        const [
          categoriesRes,
          incomesRes,
          expensesRes,
          debtsRes,
          savingsRes,
          goalsRes,
          userIncomeCategoriesRes,
          userDebtCategoriesRes,
          tasksRes,
          timeBlocksRes,
          customTimeBlockTypesRes,
          projectCategoriesRes,
          projectsRes,
          projectTasksRes,
          scriptsRes,
          preferencesRes,
          salesGoalsRes,
          prospectsRes,
          corporatePricingsRes,
          corporateInvestmentsRes,
          corporateTeamRes,
          servicePlansRes,
          servicePlanItemsRes,
          documentTypesRes,
          costCategoriesRes,
          costsRes,
          paymentFeeSettingsRes,
          editorialCalendarItemsRes,
          editorialCommentsRes,
          purchasePlansRes,
        ] = await Promise.all([
          supabase.from('categories').select('*').order('created_at', { ascending: true }),
          supabase.from('incomes').select('*').order('date', { ascending: false }),
          supabase.from('expenses').select('*').order('date', { ascending: false }),
          supabase.from('debts').select('*').order('due_date', { ascending: true }),
          supabase.from('savings').select('*').order('date', { ascending: false }),
          supabase.from('goals').select('*').order('deadline', { ascending: true }),
          supabase.from('user_income_categories').select('*').order('name', { ascending: true }),
          supabase.from('user_debt_categories').select('*').order('name', { ascending: true }),
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('time_blocks').select('*').order('date', { ascending: true }),
          supabase.from('time_block_types').select('*').order('created_at', { ascending: true }),
          supabase.from('project_categories').select('*').order('created_at', { ascending: true }),
          supabase.from('projects').select('*').order('priority', { ascending: true }),
          supabase.from('project_tasks').select('*').order('priority', { ascending: true }),
          supabase.from('scripts').select('*').order('scheduled_date', { ascending: true }),
          supabase.from('user_preferences').select('*').maybeSingle(),
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
        ]);

        if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
        if (incomesRes.data) setIncomes(incomesRes.data as Income[]);
        if (expensesRes.data) setExpenses(expensesRes.data as Expense[]);
        if (debtsRes.data) setDebts(debtsRes.data as Debt[]);
        if (savingsRes.data) setSavings(savingsRes.data as Saving[]);
        if (goalsRes.data) setGoals(goalsRes.data as Goal[]);
        if (userIncomeCategoriesRes.data) setUserIncomeCategories(userIncomeCategoriesRes.data as UserIncomeCategory[]);
        if (userDebtCategoriesRes.data) setUserDebtCategories(userDebtCategoriesRes.data as UserDebtCategory[]);
        if (tasksRes.data) setTasks(tasksRes.data as Task[]);
        if (timeBlocksRes.data) setTimeBlocks(timeBlocksRes.data as TimeBlock[]);
        if (customTimeBlockTypesRes.data) setCustomTimeBlockTypes(customTimeBlockTypesRes.data as CustomTimeBlockType[]);
        if (projectCategoriesRes.data) setProjectCategories(projectCategoriesRes.data as ProjectCategory[]);
        if (projectsRes.data) setProjects(projectsRes.data as Project[]);
        if (projectTasksRes.data) setProjectTasks(projectTasksRes.data as ProjectTask[]);
        if (scriptsRes.data) setScripts(scriptsRes.data as Script[]);
        if (preferencesRes.data) setUserPreferences(preferencesRes.data as UserPreference);
        if (salesGoalsRes.data) setSalesGoals(salesGoalsRes.data as SalesGoal[]);
        if (prospectsRes.data) setProspects(prospectsRes.data as Prospect[]);
        if (corporatePricingsRes.data) setCorporatePricings(corporatePricingsRes.data as CorporatePricing[]);
        if (corporateInvestmentsRes.data) setCorporateInvestments(corporateInvestmentsRes.data as CorporateInvestment[]);
        if (corporateTeamRes.data) setCorporateTeam(corporateTeamRes.data as CorporateTeamMember[]);
        if (servicePlansRes.data) setServicePlans(servicePlansRes.data as ServicePlan[]);
        if (servicePlanItemsRes.data) setServicePlanItems(servicePlanItemsRes.data as ServicePlanItem[]);
        if (documentTypesRes.data) setDocumentTypes(documentTypesRes.data as DocumentType[]);
        if (costCategoriesRes.data) setCorporateCostCategories(costCategoriesRes.data as CorporateCostCategory[]);
        if (costsRes.data) setCorporateCosts(costsRes.data as CorporateCost[]);
        if (paymentFeeSettingsRes.data) setPaymentFeeSettings(paymentFeeSettingsRes.data as PaymentFeeSetting[]);
        if (editorialCalendarItemsRes.data) setEditorialCalendarItems(editorialCalendarItemsRes.data as EditorialCalendarItem[]);
        if (editorialCommentsRes.data) setEditorialComments(editorialCommentsRes.data as EditorialComment[]);
        if (purchasePlansRes.data) setPurchasePlans(purchasePlansRes.data as PurchasePlan[]);

        setDataInitialized(true);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    loadAllData();
  }, [userId, dataInitialized, setCategories, setIncomes, setExpenses, setDebts, setSavings, setGoals, setUserIncomeCategories, setUserDebtCategories, setTasks, setTimeBlocks, setCustomTimeBlockTypes, setProjectCategories, setProjects, setProjectTasks, setScripts, setUserPreferences, setSalesGoals, setProspects, setCorporatePricings, setCorporateInvestments, setCorporateTeam, setServicePlans, setServicePlanItems, setDocumentTypes, setCorporateCostCategories, setCorporateCosts, setPaymentFeeSettings, setEditorialCalendarItems, setEditorialComments, setPurchasePlans, setIsLoading, setDataInitialized]);
}
