import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2, FileText, DollarSign, FolderOpen, ClipboardList, MessageSquare,
  ArrowRight, Clock, TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface PortalDashboardProps {
  portal: any;
  client: any;
}

export default function PortalDashboard({ portal, client }: PortalDashboardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { slug } = useParams();
  const pc = portal.primary_color || '#1e40af';

  // Fetch customer projects
  const { data: projects = [] } = useQuery({
    queryKey: ['portal-projects', portal.customer_id],
    queryFn: async (): Promise<any[]> => {
      if (!portal.customer_id) return [];
      const { data } = await (supabase as any)
        .from('cpms_projects')
        .select('id, name, project_number, status, percent_complete, contract_value, city, address, start_date, end_date, created_at')
        .eq('customer_id', portal.customer_id)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!portal.customer_id && portal.show_projects !== false,
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['portal-invoices-dash', portal.customer_id],
    queryFn: async () => {
      if (!portal.customer_id) return [];
      const { data } = await supabase
        .from('ar_invoices')
        .select('id, doc_num, doc_date, total, status, currency, balance_due')
        .eq('customer_id', portal.customer_id)
        .order('doc_date', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!portal.customer_id && portal.show_invoices !== false,
  });

  // Fetch unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['portal-unread', portal.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('portal_messages')
        .select('*', { count: 'exact', head: true })
        .eq('portal_id', portal.id)
        .eq('sender_type', 'admin')
        .eq('is_read', false);
      return count || 0;
    },
    enabled: portal.show_messages !== false,
  });

  const totalOutstanding = invoices.reduce((s: number, inv: any) => s + (inv.balance_due || 0), 0);
  const activeProjects = projects.filter((p: any) => p.status === 'in_progress' || p.status === 'active');

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="rounded-2xl p-8 text-white" style={{ background: `linear-gradient(135deg, ${pc}, ${pc}cc)` }}>
        <h2 className="text-2xl font-bold">Welcome back, {client?.full_name || client?.email || 'Client'}</h2>
        <p className="text-white/80 mt-1">Here's an overview of your projects and account.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {portal.show_projects !== false && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/portal/${slug}/projects`)}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Active Projects</p>
                  <p className="text-2xl font-bold mt-1">{activeProjects.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${pc}15` }}>
                  <Building2 className="h-5 w-5" style={{ color: pc }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {portal.show_invoices !== false && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/portal/${slug}/invoices`)}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="text-2xl font-bold mt-1">{totalOutstanding.toLocaleString()} SAR</p>
                </div>
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${pc}15` }}>
                  <DollarSign className="h-5 w-5" style={{ color: pc }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {portal.show_invoices !== false && (
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Invoices</p>
                  <p className="text-2xl font-bold mt-1">{invoices.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${pc}15` }}>
                  <FileText className="h-5 w-5" style={{ color: pc }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {portal.show_messages !== false && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/portal/${slug}/messages`)}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Unread Messages</p>
                  <p className="text-2xl font-bold mt-1">{unreadCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${pc}15` }}>
                  <MessageSquare className="h-5 w-5" style={{ color: pc }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Active Projects */}
      {portal.show_projects !== false && activeProjects.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" style={{ color: pc }} /> Active Projects
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/portal/${slug}/projects`)} className="text-xs">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeProjects.slice(0, 3).map((proj: any) => (
              <div key={proj.id} className="p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/portal/${slug}/projects/${proj.id}`)}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{proj.name}</p>
                    <p className="text-xs text-gray-500">{proj.project_number} · {proj.site_city || 'N/A'}</p>
                  </div>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: `${pc}40`, color: pc }}>
                    {proj.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={proj.percent_complete || 0} className="flex-1 h-2" />
                  <span className="text-xs font-medium" style={{ color: pc }}>
                    {proj.percent_complete || 0}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      {portal.show_invoices !== false && invoices.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: pc }} /> Recent Invoices
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/portal/${slug}/invoices`)} className="text-xs">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded flex items-center justify-center" style={{ backgroundColor: `${pc}10` }}>
                      <FileText className="h-4 w-4" style={{ color: pc }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">INV-{inv.doc_num}</p>
                      <p className="text-xs text-gray-500">{format(new Date(inv.doc_date), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{(inv.total || 0).toLocaleString()} {inv.currency || 'SAR'}</span>
                    <Badge variant="outline" className={
                      inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      inv.status === 'overdue' ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-amber-50 text-amber-600 border-amber-200'
                    }>
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay Now CTA */}
      {portal.show_pay_button && totalOutstanding > 0 && (
        <Card className="border-2" style={{ borderColor: `${pc}30` }}>
          <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">Pay Outstanding Balance</p>
              <p className="text-sm text-gray-500">{totalOutstanding.toLocaleString()} SAR due</p>
            </div>
            <Button size="lg" className="text-white font-semibold px-8" style={{ backgroundColor: pc }}>
              <DollarSign className="h-4 w-4 mr-2" /> Pay Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
