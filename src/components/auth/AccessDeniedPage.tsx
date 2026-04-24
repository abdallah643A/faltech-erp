import { ShieldAlert, HelpCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface AccessDeniedPageProps {
  requiredModule?: string;
  currentPath?: string;
}

export function AccessDeniedPage({ requiredModule, currentPath }: AccessDeniedPageProps) {
  const navigate = useNavigate();
  const { user, roles } = useAuth();

  // Log denied access attempt
  useEffect(() => {
    if (user && currentPath) {
      supabase.from('audit_trail' as any).insert({
        table_name: 'access_control',
        record_id: currentPath,
        action: 'ACCESS_DENIED',
        new_values: {
          path: currentPath,
          required_module: requiredModule,
          user_roles: roles,
          timestamp: new Date().toISOString(),
        },
        user_id: user.id,
        user_email: user.email,
      } as any).then(() => {});
    }
  }, [user, currentPath, requiredModule, roles]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground text-sm">
              You don't have the required permissions to access this page.
            </p>
          </div>

          {requiredModule && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Required module:</span>{' '}
                {requiredModule}
              </p>
              <p className="text-muted-foreground mt-1">
                <span className="font-medium text-foreground">Your roles:</span>{' '}
                {roles.length > 0 ? roles.map(r => r.toUpperCase().replace('_', ' ')).join(', ') : 'None assigned'}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/help')} className="w-full">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help Center
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                const subject = encodeURIComponent(`Access Request: ${requiredModule || currentPath}`);
                const body = encodeURIComponent(`I need access to: ${currentPath}\nModule: ${requiredModule}\nMy current roles: ${roles.join(', ')}`);
                window.location.href = `mailto:admin@company.com?subject=${subject}&body=${body}`;
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Request Access
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
