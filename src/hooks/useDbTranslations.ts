import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function useDbTranslations(languageCode?: string) {
  const { user } = useAuth();
  const { language, dbOverrides, refreshDbTranslations } = useLanguage();
  const targetLang = languageCode || language;

  const upsertTranslation = useMutation({
    mutationFn: async (params: { key: string; text: string; context?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('ui_translations' as any)
        .upsert({
          translation_key: params.key,
          language_code: targetLang,
          translated_text: params.text,
          context: params.context || null,
          contributed_by: user.id,
        }, { onConflict: 'translation_key,language_code' });
      if (error) throw error;
    },
    onSuccess: () => {
      refreshDbTranslations();
    },
  });

  return { translationMap: dbOverrides, upsertTranslation };
}
