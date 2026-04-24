import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PERSONA_PRESETS, getPersonaPreset, type PersonaKey } from '@/data/personaPresets';
import { DEFAULT_PREFERENCES, type DashboardPreferences } from '@/components/dashboard/DashboardCustomizer';

const STORAGE_KEY = 'dashboard.persona';

/**
 * useDashboardPersona — Module 1 / Enhancement #4
 *
 * Reads/writes the user's selected dashboard persona and exposes a one-click
 * `applyPersona()` that rewrites `profiles.dashboard_preferences.widgets`
 * to match the persona preset (visibility + order).
 *
 * Persona is persisted in `profiles.preferred_persona` (string, nullable) with
 * a localStorage fallback so the choice survives even if the column hasn't
 * been added yet (graceful degradation).
 */
export function useDashboardPersona() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: persona } = useQuery<PersonaKey>({
    queryKey: ['dashboard-persona', user?.id],
    queryFn: async () => {
      const local = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as PersonaKey | null;
      if (!user?.id) return local || 'custom';
      const { data } = await supabase
        .from('profiles')
        .select('preferred_persona')
        .eq('user_id', user.id)
        .maybeSingle();
      const remote = (data as any)?.preferred_persona as PersonaKey | null;
      return remote || local || 'custom';
    },
    enabled: true,
    staleTime: 60_000,
  });

  const setPersona = useMutation({
    mutationFn: async (key: PersonaKey) => {
      try { localStorage.setItem(STORAGE_KEY, key); } catch {}
      if (!user?.id) return;
      // Best-effort write; ignore if column doesn't exist yet
      await supabase.from('profiles').update({ preferred_persona: key } as any).eq('user_id', user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-persona'] });
    },
  });

  /**
   * Apply a persona preset to the user's dashboard_preferences.widgets.
   * Existing widget entries are reordered and visibility-toggled to match the preset.
   * Widgets not present in the preset are kept but hidden.
   */
  const applyPersona = useCallback(async (key: PersonaKey) => {
    const preset = getPersonaPreset(key);
    setPersona.mutate(key);
    if (!preset || !user?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('dashboard_preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    const current = ((profile?.dashboard_preferences as unknown) as DashboardPreferences) || DEFAULT_PREFERENCES;
    const labelOf = (id: string) =>
      current.widgets.find(w => w.id === id)?.label
      ?? id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const allKnown = new Set([
      ...current.widgets.map(w => w.id),
      ...preset.widgets,
    ]);

    const ordered = [
      ...preset.widgets.map(id => ({ id, label: labelOf(id), visible: true })),
      ...Array.from(allKnown)
        .filter(id => !preset.widgets.includes(id))
        .map(id => ({ id, label: labelOf(id), visible: false })),
    ];

    const next: DashboardPreferences = { ...current, widgets: ordered };
    await supabase.from('profiles').update({ dashboard_preferences: next as any }).eq('user_id', user.id);
    qc.invalidateQueries({ queryKey: ['dashboard-preferences'] });
  }, [user?.id, qc, setPersona]);

  return {
    persona: persona || 'custom',
    setPersona: (k: PersonaKey) => setPersona.mutate(k),
    applyPersona,
    isApplying: setPersona.isPending,
    presets: PERSONA_PRESETS,
  };
}
