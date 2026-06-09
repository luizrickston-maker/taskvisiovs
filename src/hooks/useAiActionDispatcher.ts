/**
 * useAiActionDispatcher
 *
 * React hook that wraps the ActionDispatcher and manages the pending
 * confirmation state. Use this in any AI chat component.
 *
 * Usage:
 *   const { processAiResponse, pendingAction, confirmAction, cancelAction } = useAiActionDispatcher();
 *
 *   // After receiving full AI response:
 *   const { executed, errors } = await processAiResponse(fullContent);
 *
 *   // If pendingAction is set, render a confirm/cancel UI
 *   // On user confirm: await confirmAction()
 *   // On user cancel:  cancelAction()
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { registerAllHandlers } from '@/lib/ai-action-handlers';
import {
  dispatchActions,
  executeConfirmedAction,
  type PendingConfirmAction,
  type DispatchResult,
} from '@/lib/ai-action-dispatcher';

// Ensure handlers are registered once
registerAllHandlers();

export interface UseAiActionDispatcherReturn {
  pendingAction: PendingConfirmAction | null;
  isConfirming: boolean;
  processAiResponse: (content: string) => Promise<Omit<DispatchResult, 'pending'>>;
  confirmAction: () => Promise<void>;
  cancelAction: () => void;
  clearPending: () => void;
}

export function useAiActionDispatcher(): UseAiActionDispatcherReturn {
  const [pendingAction, setPendingAction] = useState<PendingConfirmAction | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const processAiResponse = useCallback(async (content: string) => {
    const result = await dispatchActions(content);

    // Show errors
    for (const err of result.errors) {
      toast.error(`Ação com erro: ${err}`);
    }

    // Set pending if any
    if (result.pending) {
      setPendingAction(result.pending);
    }

    return { executed: result.executed, errors: result.errors };
  }, []);

  const confirmAction = useCallback(async () => {
    if (!pendingAction) return;
    setIsConfirming(true);
    try {
      await executeConfirmedAction(pendingAction);
      setPendingAction(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao confirmar ação: ${msg}`);
    } finally {
      setIsConfirming(false);
    }
  }, [pendingAction]);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
    toast.info('Ação cancelada');
  }, []);

  const clearPending = useCallback(() => {
    setPendingAction(null);
  }, []);

  return {
    pendingAction,
    isConfirming,
    processAiResponse,
    confirmAction,
    cancelAction,
    clearPending,
  };
}
