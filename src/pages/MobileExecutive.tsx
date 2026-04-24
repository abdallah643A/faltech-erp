import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Percent, BarChart3, Users, AlertTriangle } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useLanguage } from '@/contexts/LanguageContext';

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 120, h = 40;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="mt-2">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

export default function MobileExecutive() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const [emblaRef] = useEmblaCarousel({ align: 'center', containScroll: 'trimSnaps' });

  const { data: revenue = [] } = useQuery({
    queryKey: ['mobile-exec-revenue', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('total_amount, doc_date').neq('status', 'cancelled').order('doc_date', { ascending: true }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as { total_amount: number | null; doc_date: string | null }[];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['mobile-exec-invoices', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('total, balance_due, status, doc_date').order('doc_date', { ascending: true }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as { total: number | null; balance_due: number | null; status: string | null; doc_date: string | null }[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['mobile-exec-projects', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('projects').select('status, current_phase') as any);
      return (data || []) as { status: string | null; current_phase: string | null }[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['mobile-exec-employees'],
    queryFn: async () => {
      const { data } = await (supabase.from('employees') as any).select('status').eq('status', 'active');
      return (data || []) as { status: string }[];
    },
  });

  const totalRevenue = useMemo(() => revenue.reduce((s, p) => s + (p.total_amount || 0), 0), [revenue]);
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    revenue.forEach(p => { const m = (p.doc_date || '').slice(0, 7); map[m] = (map[m] || 0) + (p.total_amount || 0); });
    return Object.values(map).slice(-6);
  }, [revenue]);

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = revenue.reduce((s, p) => s + (p.total_amount || 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const projectProgress = projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0;

  const overdueInvoices = invoices.filter(i => (i.balance_due || 0) > 0 && i.status !== 'cancelled');
  const overdueAmount = overdueInvoices.reduce((s, i) => s + (i.balance_due || 0), 0);

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(v);

  const cards = [
    { title: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'hsl(var(--primary))', sparkData: revenueByMonth },
    { title: 'Collection Rate', value: `${collectionRate}%`, icon: Percent, color: '#10b981', sparkData: [collectionRate] },
    { title: 'Project Progress', value: `${activeProjects} active`, icon: BarChart3, color: '#3b82f6', sparkData: [projectProgress] },
    { title: 'Active Employees', value: `${employees.length}`, icon: Users, color: '#8b5cf6', sparkData: [] },
    { title: 'Overdue Payments', value: formatCurrency(overdueAmount), icon: AlertTriangle, color: '#ef4444', sparkData: [] },
  ];

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Executive Summary</h1>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {cards.map((card) => (
            <div key={card.title} className="flex-[0_0_85%] min-w-0">
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: `${card.color}20` }}>
                      <card.icon className="h-6 w-6" style={{ color: card.color }} />
                    </div>
                    <span className="text-base font-medium text-muted-foreground">{card.title}</span>
                  </div>
                  <p className="text-3xl font-bold" style={{ fontSize: '28px' }}>{card.value}</p>
                  {card.sparkData.length > 1 && <MiniSparkline data={card.sparkData} color={card.color} />}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">← Swipe to see more →</p>
    </div>
  );
}
