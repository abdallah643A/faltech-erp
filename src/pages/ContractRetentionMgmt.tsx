import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Lock, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ContractRetentionMgmt() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: retentions = [] } = useQuery({
    queryKey: ['contract-retentions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('contract_retentions' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const totalHeld = retentions.reduce((s: number, r: any) => s + (r.pending_amount || 0), 0);
  const totalReleased = retentions.reduce((s: number, r: any) => s + (r.released_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Lock className="h-6 w-6" />Contract Retention Management</h1>
          <p className="text-muted-foreground">Track retention held, released, and pending by project</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Add Retention Record</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Records', value: retentions.length, icon: Lock },
          { label: 'Total Held', value: `${totalHeld.toLocaleString()} SAR`, icon: Clock },
          { label: 'Total Released', value: `${totalReleased.toLocaleString()} SAR`, icon: CheckCircle },
          { label: 'Pending Release', value: retentions.filter((r: any) => r.release_status === 'held').length, icon: DollarSign },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Retention Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Project</TableHead><TableHead>Contract Value</TableHead><TableHead>Retention %</TableHead>
              <TableHead>Total Retention</TableHead><TableHead>Released</TableHead><TableHead>{t('common.pending')}</TableHead><TableHead>{t('common.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {retentions.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.release_milestone || 'Project'}</TableCell>
                  <TableCell>{(r.contract_value || 0).toLocaleString()}</TableCell>
                  <TableCell>{r.retention_percentage}%</TableCell>
                  <TableCell>{(r.total_retention || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-green-600">{(r.released_amount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-orange-600">{(r.pending_amount || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={r.release_status === 'released' ? 'default' : 'secondary'}>{r.release_status}</Badge></TableCell>
                </TableRow>
              ))}
              {retentions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No retention records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
