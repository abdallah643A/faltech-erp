import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectActivityLog, PHASE_CONFIG, ProjectPhase } from '@/hooks/useIndustrialProjects';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  FileText, 
  DollarSign,
  User,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ProjectActivityTimelineProps {
  projectId: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  phase_approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  phase_rejected: <XCircle className="h-4 w-4 text-red-500" />,
  phase_advanced: <ArrowRight className="h-4 w-4 text-blue-500" />,
  document_uploaded: <FileText className="h-4 w-4 text-purple-500" />,
  payment_received: <DollarSign className="h-4 w-4 text-emerald-500" />,
  contract_signed: <FileText className="h-4 w-4 text-amber-500" />,
  default: <Activity className="h-4 w-4 text-muted-foreground" />,
};

export function ProjectActivityTimeline({ projectId }: ProjectActivityTimelineProps) {
  const { activityLog, isLoading } = useProjectActivityLog(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activityLog && activityLog.length > 0 ? (
            <div className="space-y-4">
              {activityLog.map((log, index) => {
                const phaseConfig = log.phase ? PHASE_CONFIG[log.phase as ProjectPhase] : null;
                const icon = actionIcons[log.action] || actionIcons.default;
                
                return (
                  <div key={log.id} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {icon}
                      </div>
                      {index < activityLog.length - 1 && (
                        <div className="w-0.5 h-full bg-muted mt-2" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          {log.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {log.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.performed_at), { addSuffix: true })}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {phaseConfig && (
                          <Badge variant="outline" className="text-xs">
                            {phaseConfig.label}
                          </Badge>
                        )}
                        {log.performer && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {log.performer.full_name || log.performer.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mb-2" />
              <p>No activity recorded yet</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
