/**
 * useImportProjectPlan — importa um plano JSON v1.0 para o banco.
 *
 * Chama a RPC import_project_plan(p_plan) que cria projeto + stages + tasks
 * em uma única transação atômica.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/stores/useAppStore";
import { toast } from "sonner";
import type { ProjectPlanV1 } from "@/lib/projectPlanParser";

export interface ImportResult {
  project_id: string;
  stages_created: number;
  tasks_created: number;
  warnings: {
    unmapped_collaborators: string[];
  };
}

export function useImportProjectPlan() {
  const [isImporting, setIsImporting] = useState(false);

  const importPlan = useCallback(async (plan: ProjectPlanV1): Promise<ImportResult | null> => {
    setIsImporting(true);
    try {
      const { data, error } = await supabase.rpc("import_project_plan", {
        p_plan: plan,
      });

      if (error) {
        console.error("[import-project-plan] RPC error:", error);
        toast.error(`Erro ao importar: ${error.message}`);
        setIsImporting(false);
        return null;
      }

      const result = data as ImportResult & {
        project: { id: string; project: string };
        stages: unknown[];
        tasks: unknown[];
      };

      // Atualiza a store local para refletir o novo projeto
      // (a store espera tipos Project / ProjectTask / ProjectStage)
      try {
        const projectData = result.project as any;
        useAppStore.getState().addProject(projectData);
      } catch (e) {
        console.warn("[import-project-plan] Não foi possível sincronizar store local:", e);
      }

      const unmapped = result.warnings?.unmapped_collaborators ?? [];
      if (unmapped.length > 0) {
        toast.warning(
          `Importado com ${result.stages_created} etapas e ${result.tasks_created} tarefas. ${unmapped.length} colaborador(es) não encontrado(s): ${unmapped.join(", ")}`,
          { duration: 8000 }
        );
      } else {
        toast.success(`Plano importado: ${result.stages_created} etapas, ${result.tasks_created} tarefas`);
      }

      setIsImporting(false);
      return {
        project_id: result.project_id,
        stages_created: result.stages?.length ?? 0,
        tasks_created: result.tasks?.length ?? 0,
        warnings: result.warnings ?? { unmapped_collaborators: [] },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Erro ao importar: ${msg}`);
      setIsImporting(false);
      return null;
    }
  }, []);

  return { importPlan, isImporting };
}
