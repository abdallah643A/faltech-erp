import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck } from 'lucide-react';
import { usePayrollControls } from '@/hooks/useHREnhanced';

export default function PayrollControlsPage() {
  const { data: controls = [], toggle } = usePayrollControls();
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />Payroll Controls</h1>
        <p className="text-muted-foreground">Pre-payroll validation rules (GOSI, Iqama, IBAN, WPS, Saudization)</p>
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Control</TableHead><TableHead>Category</TableHead>
            <TableHead>Severity</TableHead><TableHead>Blocks Payroll</TableHead><TableHead>Active</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {controls.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.control_code}</TableCell>
                <TableCell><div className="font-medium">{c.control_name}</div><div className="text-xs text-muted-foreground" dir="rtl">{c.control_name_ar}</div><div className="text-xs text-muted-foreground">{c.description}</div></TableCell>
                <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                <TableCell><Badge variant={c.severity === 'critical' ? 'destructive' : c.severity === 'warning' ? 'secondary' : 'outline'}>{c.severity}</Badge></TableCell>
                <TableCell>{c.blocks_payroll ? <Badge variant="destructive">BLOCKS</Badge> : '—'}</TableCell>
                <TableCell><Switch checked={c.is_active} onCheckedChange={(v) => toggle.mutate({ id: c.id, is_active: v })} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
