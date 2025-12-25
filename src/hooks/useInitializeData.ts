import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import type { Category, Income, Expense, Debt, Saving, Goal, Task, TimeBlock, ProjectCategory, Project, Script, UserPreference, CustomTimeBlockType, ProjectTask } from '@/types/database';

export function useInitializeData(userId: string | undefined) {
  const loadingRef = useRef(false);
  const {
    setCategories,
    setIncomes,
    setExpenses,
    setDebts,
    setSavings,
    setGoals,
    setTasks,
    setTimeBlocks,
    setCustomTimeBlockTypes,
    setProjectCategories,
    setProjects,
    setProjectTasks,
    setScripts,
    setUserPreferences,
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
          tasksRes,
          timeBlocksRes,
          customTimeBlockTypesRes,
          projectCategoriesRes,
          projectsRes,
          projectTasksRes,
          scriptsRes,
          preferencesRes,
        ] = await Promise.all([
          supabase.from('categories').select('*').order('created_at', { ascending: true }),
          supabase.from('incomes').select('*').order('date', { ascending: false }),
          supabase.from('expenses').select('*').order('date', { ascending: false }),
          supabase.from('debts').select('*').order('due_date', { ascending: true }),
          supabase.from('savings').select('*').order('date', { ascending: false }),
          supabase.from('goals').select('*').order('deadline', { ascending: true }),
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('time_blocks').select('*').order('date', { ascending: true }),
          supabase.from('time_block_types').select('*').order('created_at', { ascending: true }),
          supabase.from('project_categories').select('*').order('created_at', { ascending: true }),
          supabase.from('projects').select('*').order('priority', { ascending: true }),
          supabase.from('project_tasks').select('*').order('priority', { ascending: true }),
          supabase.from('scripts').select('*').order('scheduled_date', { ascending: true }),
          supabase.from('user_preferences').select('*').maybeSingle(),
        ]);

        if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
        if (incomesRes.data) setIncomes(incomesRes.data as Income[]);
        if (expensesRes.data) setExpenses(expensesRes.data as Expense[]);
        if (debtsRes.data) setDebts(debtsRes.data as Debt[]);
        if (savingsRes.data) setSavings(savingsRes.data as Saving[]);
        if (goalsRes.data) setGoals(goalsRes.data as Goal[]);
        if (tasksRes.data) setTasks(tasksRes.data as Task[]);
        if (timeBlocksRes.data) setTimeBlocks(timeBlocksRes.data as TimeBlock[]);
        if (customTimeBlockTypesRes.data) setCustomTimeBlockTypes(customTimeBlockTypesRes.data as CustomTimeBlockType[]);
        if (projectCategoriesRes.data) setProjectCategories(projectCategoriesRes.data as ProjectCategory[]);
        if (projectsRes.data) setProjects(projectsRes.data as Project[]);
        if (projectTasksRes.data) setProjectTasks(projectTasksRes.data as ProjectTask[]);
        if (scriptsRes.data) setScripts(scriptsRes.data as Script[]);
        if (preferencesRes.data) setUserPreferences(preferencesRes.data as UserPreference);

        setDataInitialized(true);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    loadAllData();
  }, [userId, dataInitialized, setCategories, setIncomes, setExpenses, setDebts, setSavings, setGoals, setTasks, setTimeBlocks, setCustomTimeBlockTypes, setProjectCategories, setProjects, setProjectTasks, setScripts, setUserPreferences, setIsLoading, setDataInitialized]);
}
