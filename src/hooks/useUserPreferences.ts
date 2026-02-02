import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { useAppContext } from '@/hooks/useAppContext';

const THEME_KEY = 'flow-control-theme';

export function useUserPreferences() {
  const { userPreferences, updateUserPreferences } = useAppStore();
  const { mode } = useAppContext();

  // Theme is stored in localStorage (per device)
  const getTheme = (): 'dark' | 'system' => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'system') || 'dark';
  };

  const setTheme = (theme: 'dark' | 'system') => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  };

  const applyTheme = (theme: 'dark' | 'system') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    const theme = getTheme();
    applyTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (getTheme() === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Get current app name based on mode
  const getAppName = () => {
    if (mode === 'business') {
      return userPreferences?.business_app_name || 'Minha Empresa';
    }
    return userPreferences?.app_name || 'Flow Control';
  };

  // Update personal app name
  const updateAppName = async (appName: string) => {
    if (!userPreferences) return;

    updateUserPreferences({ app_name: appName });

    const { error } = await supabase
      .from('user_preferences')
      .update({ app_name: appName })
      .eq('id', userPreferences.id);

    if (error && import.meta.env.DEV) {
      console.error('Error updating app name:', error);
    }
  };

  // Update business app name
  const updateBusinessAppName = async (businessAppName: string) => {
    if (!userPreferences) return;

    updateUserPreferences({ business_app_name: businessAppName });

    const { error } = await supabase
      .from('user_preferences')
      .update({ business_app_name: businessAppName })
      .eq('id', userPreferences.id);

    if (error && import.meta.env.DEV) {
      console.error('Error updating business app name:', error);
    }
  };

  return {
    appName: getAppName(),
    personalAppName: userPreferences?.app_name || 'Flow Control',
    businessAppName: userPreferences?.business_app_name || 'Minha Empresa',
    theme: getTheme(),
    setTheme,
    updateAppName,
    updateBusinessAppName,
  };
}
