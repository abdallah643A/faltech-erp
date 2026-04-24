import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wrench, Clock, AlertTriangle, DollarSign, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EquipmentAllocations() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: allocations = [] } = useQuery({
    queryKey: ['equipment-allocations', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('equipment_allocations' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const totalCost = allocations.reduce((s: number, a: any) => s + (a.total_cost || 0), 0);
  const totalIdle = allocations.reduce((s: number, a: any) => s + (a.idle_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" />Equipment & Machinery Allocation</h1>
          <p className="text-muted-foreground">Reservation, usage tracking, downtime, and cost analysis</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Allocate Equipment</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Allocated', value: allocations.length, icon: Wrench },
          { label: 'Total Cost', value: `${totalCost.toLocaleString()} SAR`, icon: DollarSign },
          { label: 'Idle Hours', value: totalIdle, icon: Clock },
          { label: 'Maintenance Due', value: allocations.filter((a: any) => a.maintenance_status === 'due').length, icon: AlertTriangle },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Equipment Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Equipment</TableHead><TableHead>Code</TableHead><TableHead>Operator</TableHead>
              <TableHead>Planned Hrs</TableHead><TableHead>Actual Hrs</TableHead><TableHead>Idle Hrs</TableHead>
              <TableHead>Cost</TableHead><TableHead>Maintenance</TableHead><TableHead>{t('common.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {allocations.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.equipment_name}</TableCell>
                  <TableCell>{a.equipment_code || '—'}</TableCell>
                  <TableCell>{a.operator_name || '—'}</TableCell>
                  <TableCell>{a.planned_hours}</TableCell>
                  <TableCell>{a.actual_hours}</TableCell>
                  <TableCell className="text-orange-600">{a.idle_hours}</TableCell>
                  <TableCell>{(a.total_cost || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={a.maintenance_status === 'due' ? 'destructive' : 'secondary'}>{a.maintenance_status}</Badge></TableCell>
                  <TableCell><Badge variant={a.status === 'allocated' ? 'default' : 'outline'}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {allocations.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No equipment allocated</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
