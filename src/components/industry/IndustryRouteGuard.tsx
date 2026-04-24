import { useLocation, Navigate } from 'react-router-dom';
import { useIndustryPacks } from '@/hooks/useIndustryPacks';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

/**
 * Wraps any route that belongs to an optional industry pack.
 * If the active company hasn't enabled the pack, shows a lock card
 * with a link to the Industry Packs admin page.
 */
export function IndustryRouteGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isRouteEnabled, loading, packs } = useIndustryPacks();

  if (loading) return null;
  if (isRouteEnabled(location.pathname)) return <>{children}</>;

  // Find which pack owns this route for messaging
  const owner = (packs.data ?? []).find(p =>
    (p.route_prefixes ?? []).some(pre =>
      location.pathname === pre || location.pathname.startsWith(pre + '/')
    )
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">{owner?.pack_name ?? 'Industry Pack'} not activated</h2>
          <p className="text-sm text-muted-foreground">
            This module is part of an optional industry pack. Activate it from
            the Industry Packs settings to access these features.
          </p>
          <Button asChild>
            <Link to="/settings/industry-packs">Manage Industry Packs</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
