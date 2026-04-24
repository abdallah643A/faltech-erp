import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserPlus, Briefcase, Users, CheckCircle, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function JobRequisitions() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const [tab, setTab] = useState('requisitions');

  const { data: requisitions = [] } = useQuery({
    queryKey: ['job-requisitions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('job_requisitions' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ['job-candidates', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('job_candidates' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const stages = ['applied', 'screening', 'interview', 'evaluation', 'offer', 'hired'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserPlus className="h-6 w-6" />Recruitment & Applicant Tracking</h1>
          <p className="text-muted-foreground">Job requisitions, candidate pipeline, interviews, and offers</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Requisition</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Open Requisitions', value: requisitions.filter((r: any) => r.status === 'open').length, icon: Briefcase },
          { label: 'Total Candidates', value: candidates.length, icon: Users },
          { label: 'In Interview', value: candidates.filter((c: any) => c.pipeline_stage === 'interview').length, icon: Clock },
          { label: 'Hired', value: candidates.filter((c: any) => c.pipeline_stage === 'hired').length, icon: CheckCircle },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      {/* Pipeline summary */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Candidate Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {stages.map(stage => {
              const count = candidates.filter((c: any) => c.pipeline_stage === stage).length;
              return (
                <div key={stage} className="flex-1 text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{stage}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="requisitions">Requisitions</TabsTrigger><TabsTrigger value="candidates">Candidates</TabsTrigger></TabsList>
        <TabsContent value="requisitions">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Req #</TableHead><TableHead>Job Title</TableHead><TableHead>{t('hr.department')}</TableHead>
                <TableHead>Positions</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Approval</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {requisitions.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.requisition_number}</TableCell>
                    <TableCell>{r.job_title}</TableCell>
                    <TableCell>{r.department || '—'}</TableCell>
                    <TableCell>{r.positions_count}</TableCell>
                    <TableCell><Badge variant="outline">{r.job_type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><Badge variant={r.approval_status === 'approved' ? 'default' : 'secondary'}>{r.approval_status}</Badge></TableCell>
                    <TableCell><Badge variant={r.status === 'open' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {requisitions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No requisitions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="candidates">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('common.name')}</TableHead><TableHead>{t('common.email')}</TableHead><TableHead>Source</TableHead>
                <TableHead>Experience</TableHead><TableHead>Stage</TableHead><TableHead>Score</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {candidates.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-sm">{c.email || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{c.source}</Badge></TableCell>
                    <TableCell>{c.years_experience ? `${c.years_experience} yrs` : '—'}</TableCell>
                    <TableCell><Badge variant="default" className="capitalize">{c.pipeline_stage}</Badge></TableCell>
                    <TableCell>{c.evaluation_score || '—'}</TableCell>
                    <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {candidates.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No candidates</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
