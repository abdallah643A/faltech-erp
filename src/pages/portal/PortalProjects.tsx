import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, MapPin, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PortalProjects({ portal }: { portal: any }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { slug } = useParams();
  const pc = portal.primary_color || '#1e40af';

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['portal-projects-list', portal.customer_id],
    queryFn: async (): Promise<any[]> => {
      if (!portal.customer_id) return [];
      const { data } = await (supabase as any)
        .from('cpms_projects')
        .select('id, name, project_number, status, percent_complete, contract_value, city, address, start_date, end_date, created_at')
        .eq('customer_id', portal.customer_id)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!portal.customer_id,
  });

  const statusColor = (s: string) => {
    if (s === 'completed') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (s === 'in_progress' || s === 'active') return 'bg-blue-50 text-blue-600 border-blue-200';
    if (s === 'on_hold') return 'bg-amber-50 text-amber-600 border-amber-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Your Projects</h2>
        <p className="text-sm text-gray-500">Track progress across all your construction projects.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-40" />
                <div className="h-4 bg-gray-200 rounded w-60" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No projects found.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj: any) => (
            <Card key={proj.id} className="cursor-pointer hover:shadow-lg transition-all group"
              onClick={() => navigate(`/portal/${slug}/projects/${proj.id}`)}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{proj.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{proj.project_number}</p>
                  </div>
                  <Badge variant="outline" className={statusColor(proj.status || '')}>
                    {(proj.status || 'draft').replace(/_/g, ' ')}
                  </Badge>
                </div>

                {(proj.site_city || proj.site_address) && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {[proj.site_address, proj.site_city].filter(Boolean).join(', ')}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium" style={{ color: pc }}>{proj.percent_complete || 0}%</span>
                  </div>
                  <Progress value={proj.percent_complete || 0} className="h-2" />
                </div>

                {proj.contract_amount && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <DollarSign className="h-3 w-3" />
                    Contract: {Number(proj.contract_amount).toLocaleString()} SAR
                  </div>
                )}

                <div className="flex items-center justify-end text-xs font-medium group-hover:underline" style={{ color: pc }}>
                  View Details <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
