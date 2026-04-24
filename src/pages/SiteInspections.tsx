import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { ClipboardCheck, CheckCircle, AlertTriangle, XCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SiteInspections() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: inspections = [] } = useQuery({
    queryKey: ['site-inspections', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('site_inspections' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const passed = inspections.filter((i: any) => i.overall_status === 'passed');
  const failed = inspections.filter((i: any) => i.overall_status === 'failed');
  const totalSnags = inspections.reduce((s: number, i: any) => s + (i.snag_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6" />Site Inspections & Snagging</h1>
          <p className="text-muted-foreground">Inspection checklists, defects, and closure verification</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Inspection</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Inspections', value: inspections.length, icon: ClipboardCheck },
          { label: 'Passed', value: passed.length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Failed', value: failed.length, icon: XCircle, color: 'text-red-600' },
          { label: 'Open Snags', value: totalSnags, icon: AlertTriangle, color: 'text-orange-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-5 w-5 ${(s as any).color || 'text-primary'}`} /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Inspection Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Number</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Inspector</TableHead><TableHead>Location</TableHead>
              <TableHead>Items</TableHead><TableHead>Pass/Fail</TableHead><TableHead>Snags</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.date')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {inspections.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.inspection_number}</TableCell>
                  <TableCell><Badge variant="outline">{i.inspection_type}</Badge></TableCell>
                  <TableCell>{i.inspector_name || '—'}</TableCell>
                  <TableCell>{i.location || '—'}</TableCell>
                  <TableCell>{i.total_items || 0}</TableCell>
                  <TableCell><span className="text-green-600">{i.passed_items || 0}</span> / <span className="text-red-600">{i.failed_items || 0}</span></TableCell>
                  <TableCell><Badge variant={i.snag_count > 0 ? 'destructive' : 'secondary'}>{i.snag_count || 0}</Badge></TableCell>
                  <TableCell><Badge variant={i.overall_status === 'passed' ? 'default' : i.overall_status === 'failed' ? 'destructive' : 'secondary'}>{i.overall_status}</Badge></TableCell>
                  <TableCell className="text-sm">{format(new Date(i.created_at), 'dd MMM yyyy')}</TableCell>
                </TableRow>
              ))}
              {inspections.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No inspections recorded</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
