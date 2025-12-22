import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';

const THEME_KEY = 'flow-control-theme';

export function useUserPreferences() {
  const { userPreferences, updateUserPreferences, setUserPreferences } = useAppStore();

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

  // App name is stored in the database (synced between devices)
  const updateAppName = async (appName: string) => {
    if (!userPreferences) return;

    updateUserPreferences({ app_name: appName });

    const { error } = await supabase
      .from('user_preferences')
      .update({ app_name: appName })
      .eq('id', userPreferences.id);

    if (error) {
      console.error('Error updating app name:', error);
    }
  };

  return {
    appName: userPreferences?.app_name || 'Flow Control',
    theme: getTheme(),
    setTheme,
    updateAppName,
  };
}
