import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PageHelpContent {
  id: string;
  page_key: string;
  page_route: string;
  title_en: string;
  title_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  bullets_en: string[];
  bullets_ar: string[];
  video_url: string | null;
  video_duration_seconds: number | null;
  documentation_url: string | null;
  auto_popup_enabled: boolean;
  is_active: boolean;
  last_updated_at: string;
}

export interface UserHelpPreference {
  dont_show_again: boolean;
  video_watched: boolean;
}

/**
 * Shared, deduplicated page-help hook. Multiple consumers on the same page
 * (e.g. PageHelpTrigger + VideoHelpTrigger) reuse the same react-query cache
 * entry, preventing duplicate fetches and duplicate auto-popups that caused
 * a Radix ref-detach loop on route changes.
 */
export function usePageHelp() {
  const location = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const currentRoute = location.pathname;
  const pageKey = currentRoute === '/' ? 'dashboard' : currentRoute.replace(/^\//, '').replace(/\//g, '-');

  const { data: helpContent = null, isLoading: loading } = useQuery<PageHelpContent | null>({
    queryKey: ['page-help-content', currentRoute],
    queryFn: async () => {
      const { data } = await supabase
        .from('page_help_content')
        .select('*')
        .eq('is_active', true)
        .or(`page_route.eq.${currentRoute},page_key.eq.${pageKey}`)
        .limit(1)
        .maybeSingle();
      return (data as PageHelpContent | null) ?? null;
    },
    staleTime: 5 * 60_000,
  });

  const { data: preference = { dont_show_again: false, video_watched: false } } = useQuery<UserHelpPreference>({
    queryKey: ['page-help-pref', user?.id, helpContent?.page_key],
    enabled: !!user?.id && !!helpContent?.page_key,
    queryFn: async () => {
      const { data } = await supabase
        .from('user_help_preferences')
        .select('dont_show_again, video_watched')
        .eq('user_id', user!.id)
        .eq('page_key', helpContent!.page_key)
        .maybeSingle();
      return (data as UserHelpPreference | null) ?? { dont_show_again: false, video_watched: false };
    },
    staleTime: 5 * 60_000,
  });

  const [showPopup, setShowPopup] = useState(false);
  const autoOpenedRef = useRef<string | null>(null);

  // Reset popup state on route change
  useEffect(() => {
    setShowPopup(false);
    autoOpenedRef.current = null;
  }, [currentRoute]);

  // Auto-popup once per route, only if enabled and not dismissed
  useEffect(() => {
    if (!helpContent || autoOpenedRef.current === currentRoute) return;
    if (!helpContent.auto_popup_enabled || preference.dont_show_again) return;
    autoOpenedRef.current = currentRoute;
    const id = setTimeout(() => setShowPopup(true), 800);
    return () => clearTimeout(id);
  }, [helpContent, preference.dont_show_again, currentRoute]);

  const dismissPopup = useCallback(() => setShowPopup(false), []);
  const openPopup = useCallback(() => setShowPopup(true), []);

  const markDontShowAgain = useCallback(async () => {
    if (!user || !helpContent) return;
    setShowPopup(false);
    await supabase.from('user_help_preferences').upsert({
      user_id: user.id,
      page_key: helpContent.page_key,
      dont_show_again: true,
    }, { onConflict: 'user_id,page_key' });
    qc.invalidateQueries({ queryKey: ['page-help-pref', user.id, helpContent.page_key] });
  }, [user, helpContent, qc]);

  const markVideoWatched = useCallback(async () => {
    if (!user || !helpContent) return;
    await supabase.from('user_help_preferences').upsert({
      user_id: user.id,
      page_key: helpContent.page_key,
      video_watched: true,
      watched_at: new Date().toISOString(),
    }, { onConflict: 'user_id,page_key' });
    qc.invalidateQueries({ queryKey: ['page-help-pref', user.id, helpContent.page_key] });
  }, [user, helpContent, qc]);

  return {
    helpContent,
    preference,
    showPopup,
    loading,
    openPopup,
    dismissPopup,
    markDontShowAgain,
    markVideoWatched,
    hasHelp: !!helpContent,
  };
}
