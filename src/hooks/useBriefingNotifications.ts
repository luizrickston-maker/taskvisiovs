import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuthContextSafe } from "@/contexts/AuthContext";

export const useBriefingNotifications = () => {
  const auth = useAuthContextSafe();
  const userId = auth?.user?.id;

  useEffect(() => {
    if (!userId) return;

    // Listen for new notifications
    const channel = supabase
      .channel('briefing-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'briefing_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as any;
          toast(notification.title, {
            description: notification.message,
            action: {
              label: "Ver",
              onClick: () => window.location.href = `/pj/briefings/${notification.briefing_id}/review`
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
};
