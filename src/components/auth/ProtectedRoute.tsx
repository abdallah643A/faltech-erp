import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { AccessDeniedPage } from './AccessDeniedPage';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('admin' | 'manager' | 'sales_rep' | 'user')[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { canViewRoute, loading: permLoading } = useRolePermissions();
  const location = useLocation();

  if (loading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check module-level permission from DB
  if (!canViewRoute(location.pathname)) {
    return (
      <AccessDeniedPage
        currentPath={location.pathname}
        requiredModule={location.pathname.replace(/^\//, '').replace(/-/g, ' ')}
      />
    );
  }

  return <>{children}</>;
}
