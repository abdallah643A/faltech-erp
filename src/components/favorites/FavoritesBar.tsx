import { Star, X, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export function FavoritesBar() {
  const { favorites, removeFavorite, addFavorite, isFavorite } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();

  if (favorites.length === 0) return null;

  return (
    <div className="hidden md:flex items-center h-8 bg-muted/40 border-b border-border px-3 gap-1">
      <Star className="h-3 w-3 text-warning shrink-0" />
      <ScrollArea className="flex-1">
        <div className="flex items-center gap-1 py-0.5">
          {favorites.map(fav => (
            <div key={fav.id} className="group flex items-center gap-0.5">
              <Button
                variant={location.pathname === fav.href ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[11px] font-medium shrink-0"
                onClick={() => navigate(fav.href)}
              >
                {fav.label}
              </Button>
              <span
                role="button"
                tabIndex={0}
                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5 rounded hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); removeFavorite.mutate(fav.id); }}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </span>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export function FavoriteToggle({ label, href }: { label: string; href: string }) {
  const { isFavorite, addFavorite, removeFavorite, favorites } = useFavorites();
  const faved = isFavorite(href);

  const toggle = () => {
    if (faved) {
      const fav = favorites.find(f => f.href === href);
      if (fav) removeFavorite.mutate(fav.id);
    } else {
      addFavorite.mutate({ label, href });
    }
  };

  return (
    <Button variant="ghost" size="icon" title={faved ? 'Remove from favorites' : 'Add to favorites'} className="h-7 w-7" onClick={toggle}>
      <Star className={`h-4 w-4 ${faved ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
    </Button>
  );
}
