import { useLanguage } from '@/contexts/LanguageContext';
import { Phone, Mail, Calendar, FileText, CheckCircle, MessageSquare, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

const typeIconMap: Record<string, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckCircle,
  note: FileText,
  whatsapp: MessageSquare,
};

export function RecentActivities() {
  const { t } = useLanguage();

  const { data: activities = [] } = useQuery({
    queryKey: ['dashboard-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, type, subject, description, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="enterprise-card">
      <div className="enterprise-card-header flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('dashboard.recentActivities')}</h3>
        <button className="text-sm text-primary hover:underline">
          {t('common.viewAll')}
        </button>
      </div>
      <div className="divide-y divide-border">
        {activities.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">No recent activities</p>
        ) : (
          activities.map((activity) => {
            const Icon = typeIconMap[activity.type] || FileText;
            const isCompleted = activity.status === 'completed';
            return (
              <div
                key={activity.id}
                className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center',
                  isCompleted ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{activity.subject}</p>
                  <p className="text-sm text-muted-foreground truncate">{activity.description || activity.type}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
