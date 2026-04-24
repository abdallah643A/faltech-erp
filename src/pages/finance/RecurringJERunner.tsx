import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRecurringRuns } from '@/hooks/useFinanceEnhanced';
import { acctTables, acctRpc } from '@/integrations/supabase/acct-tables';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Repeat, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusColor: Record<string, any> = {
  pending: 'secondary', running: 'default', success: 'default', failed: 'destructive',
};
const statusIcon: Record<string, any> = {
  pending: Clock, running: Play, success: CheckCircle2, failed: XCircle,
};

export default function RecurringJERunner() {
  const { data: runs } = useRecurringRuns();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [] } = useQuery({
    queryKey: ['acct-recurring-tpls-due'],
    queryFn: async () => {
      const { data } = await acctTables.recurringTemplates().select('*').order('next_run_date');
      return data || [];
    },
  });

  const today = new Date().toISOString().split('T')[0];
  const due = templates.filter((t: any) => t.is_active && t.next_run_date <= today);

  const runOne = async (id: string) => {
    try {
      const { error } = await acctRpc.runRecurring(id);
      if (error) throw error;
      toast({ title: 'Recurring JE Posted' });
      qc.invalidateQueries({ queryKey: ['acct-recurring-tpls-due'] });
      qc.invalidateQueries({ queryKey: ['fin-recurring-runs'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const runAllDue = async () => {
    try {
      const { error } = await acctRpc.runDueRecurring();
      if (error) throw error;
      toast({ title: 'All Due Recurring JEs Posted' });
      qc.invalidateQueries({ queryKey: ['acct-recurring-tpls-due'] });
      qc.invalidateQueries({ queryKey: ['fin-recurring-runs'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Repeat className="h-6 w-6" /> Recurring JE Runner</h1>
          <p className="text-muted-foreground">Execute scheduled recurring journal entries</p>
        </div>
        <Button onClick={runAllDue} disabled={due.length === 0}><Play className="h-4 w-4 mr-2" /> Run All Due ({due.length})</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active Templates</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{templates.filter((t: any) => t.is_active).length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Due Today</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-amber-600">{due.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Recent Runs</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{runs.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Due Templates</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Template</TableHead><TableHead>Frequency</TableHead><TableHead>Next Run</TableHead>
              <TableHead>Auto-Post</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {due.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No templates due</TableCell></TableRow> :
                due.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.template_name}</TableCell>
                    <TableCell><Badge variant="outline">{t.frequency}</Badge></TableCell>
                    <TableCell>{t.next_run_date}</TableCell>
                    <TableCell>{t.auto_post ? <Badge>Auto</Badge> : <Badge variant="secondary">Manual</Badge>}</TableCell>
                    <TableCell><Button size="sm" onClick={() => runOne(t.id)}><Play className="h-4 w-4 mr-1" /> Run</Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Run History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Template</TableHead><TableHead>JE #</TableHead>
              <TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Triggered By</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {runs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No runs yet</TableCell></TableRow> :
                runs.map((r: any) => {
                  const Icon = statusIcon[r.status] || Clock;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.created_at), 'PP HH:mm')}</TableCell>
                      <TableCell>{r.template_name || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.je_doc_number || '—'}</TableCell>
                      <TableCell>{Number(r.total_amount).toLocaleString()} SAR</TableCell>
                      <TableCell><Badge variant={statusColor[r.status]}><Icon className="h-3 w-3 mr-1" />{r.status}</Badge></TableCell>
                      <TableCell className="text-xs">{r.triggered_by_name || '—'}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
