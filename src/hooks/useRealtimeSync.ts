import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import type { 
  Income, Expense, Debt, Saving, Task, 
  TimeBlock, Project, Script, Goal, Category, ProjectTask, SalesGoal, Prospect 
} from '@/types/database';

type RealtimePayload<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
};

export function useRealtimeSync(userId: string | undefined) {
  const {
    addIncome, updateIncome, deleteIncome,
    addExpense, updateExpense, deleteExpense,
    addDebt, updateDebt, deleteDebt,
    addSaving, deleteSaving,
    addTask, updateTask, deleteTask,
    addTimeBlock, updateTimeBlock, deleteTimeBlock,
    addProject, updateProject, deleteProject,
    addProjectTask, updateProjectTask, deleteProjectTask,
    addScript, updateScript, deleteScript,
    addGoal, updateGoal, deleteGoal,
    addCategory, updateCategory, deleteCategory,
    addSalesGoal, updateSalesGoal, deleteSalesGoal,
    addProspect, updateProspect, deleteProspect,
  } = useAppStore();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('db-sync')
      // Incomes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incomes', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Income>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().incomes.some(i => i.id === newRecord.id);
            if (!exists) addIncome(newRecord);
          } else if (eventType === 'UPDATE') {
            updateIncome(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteIncome(oldRecord.id);
          }
        }
      )
      // Expenses
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Expense>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().expenses.some(e => e.id === newRecord.id);
            if (!exists) addExpense(newRecord);
          } else if (eventType === 'UPDATE') {
            updateExpense(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteExpense(oldRecord.id);
          }
        }
      )
      // Debts
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debts', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Debt>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().debts.some(d => d.id === newRecord.id);
            if (!exists) addDebt(newRecord);
          } else if (eventType === 'UPDATE') {
            updateDebt(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteDebt(oldRecord.id);
          }
        }
      )
      // Savings
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'savings', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Saving>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().savings.some(s => s.id === newRecord.id);
            if (!exists) addSaving(newRecord);
          } else if (eventType === 'DELETE') {
            deleteSaving(oldRecord.id);
          }
        }
      )
      // Tasks
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Task>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().tasks.some(t => t.id === newRecord.id);
            if (!exists) addTask(newRecord);
          } else if (eventType === 'UPDATE') {
            updateTask(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteTask(oldRecord.id);
          }
        }
      )
      // TimeBlocks
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_blocks', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<TimeBlock>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().timeBlocks.some(tb => tb.id === newRecord.id);
            if (!exists) addTimeBlock(newRecord);
          } else if (eventType === 'UPDATE') {
            updateTimeBlock(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteTimeBlock(oldRecord.id);
          }
        }
      )
      // Projects
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Project>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().projects.some(p => p.id === newRecord.id);
            if (!exists) addProject(newRecord);
          } else if (eventType === 'UPDATE') {
            updateProject(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteProject(oldRecord.id);
          }
        }
      )
      // ProjectTasks
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<ProjectTask>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().projectTasks.some(pt => pt.id === newRecord.id);
            if (!exists) addProjectTask(newRecord);
          } else if (eventType === 'UPDATE') {
            updateProjectTask(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteProjectTask(oldRecord.id);
          }
        }
      )
      // Scripts
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scripts', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Script>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().scripts.some(s => s.id === newRecord.id);
            if (!exists) addScript(newRecord);
          } else if (eventType === 'UPDATE') {
            updateScript(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteScript(oldRecord.id);
          }
        }
      )
      // Goals
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Goal>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().goals.some(g => g.id === newRecord.id);
            if (!exists) addGoal(newRecord);
          } else if (eventType === 'UPDATE') {
            updateGoal(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteGoal(oldRecord.id);
          }
        }
      )
      // Categories
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Category>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().categories.some(c => c.id === newRecord.id);
            if (!exists) addCategory(newRecord);
          } else if (eventType === 'UPDATE') {
            updateCategory(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteCategory(oldRecord.id);
          }
        }
      )
      // SalesGoals
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_goals', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<SalesGoal>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().salesGoals.some(sg => sg.id === newRecord.id);
            if (!exists) addSalesGoal(newRecord);
          } else if (eventType === 'UPDATE') {
            updateSalesGoal(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteSalesGoal(oldRecord.id);
          }
        }
      )
      // Prospects
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prospects', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimePayload<Prospect>;
          if (eventType === 'INSERT') {
            const exists = useAppStore.getState().prospects.some(p => p.id === newRecord.id);
            if (!exists) addProspect(newRecord);
          } else if (eventType === 'UPDATE') {
            updateProspect(newRecord.id, newRecord);
          } else if (eventType === 'DELETE') {
            deleteProspect(oldRecord.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
