import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { newTables } from '@/integrations/supabase/new-tables';
import type { WorkflowTask } from '@/types/data-contracts';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, CheckCircle, ShieldAlert, Package, Users, FileText, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OperationsCommandCenter() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const navigate = useNavigate();

  const companyFilter = (q: any) => activeCompanyId ? q.eq('company_id', activeCompanyId) : q;

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['cmd-approvals', activeCompanyId],
    queryFn: async () => {
      const { data } = await companyFilter(supabase.from('approval_requests' as any).select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(20)) as any;
      return data || [];
    },
  });

  const { data: overdueInvoices = [] } = useQuery({
    queryKey: ['cmd-overdue-invoices', activeCompanyId],
    queryFn: async () => {
      const { data } = await companyFilter(supabase.from('ar_invoices').select('id, doc_num, customer_name, total, balance_due, doc_due_date, status').eq('status', 'open').lt('doc_due_date', new Date().toISOString().split('T')[0]).limit(20));
      return data || [];
    },
  });

  const { data: exceptions = [] } = useQuery({
    queryKey: ['cmd-exceptions', activeCompanyId],
    queryFn: async () => {
      const { data } = await companyFilter(supabase.from('erp_exceptions' as any).select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(20)) as any;
      return data || [];
    },
  });

  const { data: stuckProjects = [] } = useQuery({
    queryKey: ['cmd-stuck-projects', activeCompanyId],
    queryFn: async () => {
      const { data } = await companyFilter(supabase.from('projects').select('id, name, status, current_phase, updated_at').in('status', ['in_progress', 'on_hold']).order('updated_at').limit(20));
      return data || [];
    },
  });

  const { data: openTasks = [] } = useQuery({
    queryKey: ['cmd-tasks', activeCompanyId],
    queryFn: async () => {
      const { data } = await newTables.workflowTasks().select('*').in('status', ['todo', 'in_progress']).lt('due_date', new Date().toISOString().split('T')[0]).order('due_date').limit(20);
      return (data ?? []) as WorkflowTask[];
    },
  });

  const summaryData = [
    { name: 'Approvals', count: pendingApprovals.length },
    { name: 'Overdue AR', count: overdueInvoices.length },
    { name: 'Exceptions', count: exceptions.length },
    { name: 'Stuck Projects', count: stuckProjects.length },
    { name: 'Overdue Tasks', count: openTasks.length },
  ];

  const totalIssues = summaryData.reduce((s, d) => s + d.count, 0);
  const overdueAmount = overdueInvoices.reduce((s: number, i: any) => s + Number(i.balance_due || i.total || 0), 0);
  const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Operations Command Center</h1>
        <p className="text-muted-foreground">Real-time overview of issues requiring attention</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6 text-center"><ShieldAlert className="h-8 w-8 mx-auto text-orange-500 mb-2" /><p className="text-2xl font-bold">{pendingApprovals.length}</p><p className="text-xs text-muted-foreground">Pending Approvals</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Clock className="h-8 w-8 mx-auto text-red-500 mb-2" /><p className="text-2xl font-bold">{overdueInvoices.length}</p><p className="text-xs text-muted-foreground">Overdue Invoices</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" /><p className="text-2xl font-bold">{exceptions.length}</p><p className="text-xs text-muted-foreground">Open Exceptions</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Package className="h-8 w-8 mx-auto text-blue-500 mb-2" /><p className="text-2xl font-bold">{stuckProjects.length}</p><p className="text-xs text-muted-foreground">Projects At Risk</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><FileText className="h-8 w-8 mx-auto text-purple-500 mb-2" /><p className="text-2xl font-bold">{openTasks.length}</p><p className="text-xs text-muted-foreground">Overdue Tasks</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Issue Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={summaryData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" /></BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="approvals">
        <TabsList><TabsTrigger value="approvals">Approvals ({pendingApprovals.length})</TabsTrigger><TabsTrigger value="overdue">Overdue AR ({overdueInvoices.length})</TabsTrigger><TabsTrigger value="exceptions">Exceptions ({exceptions.length})</TabsTrigger><TabsTrigger value="projects">Projects ({stuckProjects.length})</TabsTrigger></TabsList>
        
        <TabsContent value="approvals"><Card><CardContent className="pt-4">
          <Table><TableHeader><TableRow><TableHead>Document</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Stage</TableHead><TableHead>{t('common.amount')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>{pendingApprovals.map((a: any) => (
              <TableRow key={a.id}><TableCell>{a.document_number || a.document_id?.slice(0, 8)}</TableCell><TableCell><Badge>{a.document_type}</Badge></TableCell><TableCell>{a.current_stage}/{a.total_stages}</TableCell><TableCell>{a.amount ? fmt(a.amount) : '-'}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => navigate('/approval-inbox')}>Review</Button></TableCell></TableRow>
            ))}</TableBody></Table>
        </CardContent></Card></TabsContent>

        <TabsContent value="overdue"><Card><CardContent className="pt-4">
          <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Balance</TableHead><TableHead>Due Date</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>{overdueInvoices.map((i: any) => (
              <TableRow key={i.id}><TableCell>INV-{i.doc_num}</TableCell><TableCell>{i.customer_name}</TableCell><TableCell className="font-bold text-red-600">{fmt(Number(i.balance_due || i.total || 0))}</TableCell><TableCell>{i.doc_due_date}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => navigate('/ar-collections')}>Follow Up</Button></TableCell></TableRow>
            ))}</TableBody></Table>
        </CardContent></Card></TabsContent>

        <TabsContent value="exceptions"><Card><CardContent className="pt-4">
          <Table><TableHeader><TableRow><TableHead>{t('common.type')}</TableHead><TableHead>Module</TableHead><TableHead>Severity</TableHead><TableHead>{t('common.description')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>{exceptions.map((e: any) => (
              <TableRow key={e.id}><TableCell><Badge variant="outline">{e.exception_type}</Badge></TableCell><TableCell>{e.module}</TableCell><TableCell><Badge variant={e.severity === 'critical' ? 'destructive' : 'secondary'}>{e.severity}</Badge></TableCell><TableCell className="max-w-xs truncate">{e.description}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => navigate('/exception-center')}>View</Button></TableCell></TableRow>
            ))}</TableBody></Table>
        </CardContent></Card></TabsContent>

        <TabsContent value="projects"><Card><CardContent className="pt-4">
          <Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Phase</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Last Updated</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>{stuckProjects.map((p: any) => (
              <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell><Badge>{p.current_phase}</Badge></TableCell><TableCell><Badge variant={p.status === 'on_hold' ? 'destructive' : 'secondary'}>{p.status}</Badge></TableCell><TableCell>{p.updated_at?.split('T')[0]}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => navigate(`/pm/projects/${p.id}`)}>Open</Button></TableCell></TableRow>
            ))}</TableBody></Table>
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
