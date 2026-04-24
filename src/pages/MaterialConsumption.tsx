import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, AlertTriangle, TrendingDown, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MaterialConsumption() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: records = [] } = useQuery({
    queryKey: ['material-consumptions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('material_consumptions' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const totalWastage = records.reduce((s: number, r: any) => s + (r.wastage_quantity || 0), 0);
  const overBudget = records.filter((r: any) => (r.variance_percentage || 0) > 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" />Material Consumption Tracking</h1>
          <p className="text-muted-foreground">Track issued, used, wastage, and variance against BOQ</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Record Usage</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Items Tracked', value: records.length, icon: Package },
          { label: 'Total Wastage', value: totalWastage, icon: TrendingDown },
          { label: 'Over Budget', value: overBudget.length, icon: AlertTriangle },
          { label: 'Total Cost', value: `${records.reduce((s: number, r: any) => s + (r.total_cost || 0), 0).toLocaleString()} SAR`, icon: Package },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Consumption Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Item</TableHead><TableHead>BOQ Qty</TableHead><TableHead>Issued</TableHead><TableHead>Used</TableHead>
              <TableHead>Wastage</TableHead><TableHead>Returned</TableHead><TableHead>Variance %</TableHead><TableHead>Cost</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.item_description}</TableCell>
                  <TableCell>{r.boq_quantity} {r.unit}</TableCell>
                  <TableCell>{r.issued_quantity}</TableCell>
                  <TableCell>{r.used_quantity}</TableCell>
                  <TableCell className="text-red-600">{r.wastage_quantity}</TableCell>
                  <TableCell className="text-green-600">{r.returned_quantity}</TableCell>
                  <TableCell><Badge variant={(r.variance_percentage || 0) > 5 ? 'destructive' : 'secondary'}>{(r.variance_percentage || 0).toFixed(1)}%</Badge></TableCell>
                  <TableCell>{(r.total_cost || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {records.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No consumption records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
