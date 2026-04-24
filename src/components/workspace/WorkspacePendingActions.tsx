import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertCircle, Clock } from 'lucide-react';

export interface PendingAction {
  id: string;
  title: string;
  subtitle?: string;
  priority: 'high' | 'medium' | 'low';
  href: string;
  age?: string;
}

interface Props {
  title: string;
  actions: PendingAction[];
  emptyMessage?: string;
}

const priorityColors = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
} as const;

export function WorkspacePendingActions({ title, actions, emptyMessage = 'No pending actions' }: Props) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          {title}
          {actions.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5">{actions.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {actions.slice(0, 8).map((action) => (
              <div
                key={action.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(action.href)}
              >
                <Badge variant={priorityColors[action.priority]} className="text-[9px] px-1.5 shrink-0">
                  {action.priority}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{action.title}</p>
                  {action.subtitle && <p className="text-[10px] text-muted-foreground truncate">{action.subtitle}</p>}
                </div>
                {action.age && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-2.5 w-2.5" /> {action.age}
                  </span>
                )}
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
