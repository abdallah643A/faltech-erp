import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Favorite {
  id: string;
  user_id: string;
  favorite_type: string;
  label: string;
  icon: string | null;
  href: string;
  sort_order: number;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['user-favorites', user?.id];

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!user,
  });

  const addFavorite = useMutation({
    mutationFn: async (fav: { label: string; href: string; icon?: string; favorite_type?: string }) => {
      const { error } = await supabase.from('user_favorites').insert({
        user_id: user!.id,
        label: fav.label,
        href: fav.href,
        icon: fav.icon || null,
        favorite_type: fav.favorite_type || 'page',
        sort_order: favorites.length,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const removeFavorite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_favorites').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const isFavorite = (href: string) => favorites.some(f => f.href === href);

  return { favorites, isLoading, addFavorite, removeFavorite, isFavorite };
}
