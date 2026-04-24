import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Plus } from 'lucide-react';
import { useTaxRules } from '@/hooks/useQuoteToCash';

export default function TaxDeterminationPage() {
  const { rules, isLoading, createRule } = useTaxRules();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ rule_name: '', country_code: 'SA', tax_type: 'VAT', tax_code: '', tax_rate: 15, priority: 100 });

  const handleCreate = async () => {
    await createRule.mutateAsync(form);
    setOpen(false);
    setForm({ rule_name: '', country_code: 'SA', tax_type: 'VAT', tax_code: '', tax_rate: 15, priority: 100 });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6 text-primary" /> Tax Determination Rules</h1>
          <p className="text-sm text-muted-foreground">Country-based tax rates (KSA 15% VAT, GCC, international)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Rule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Tax Rule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Rule Name</Label><Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Country Code</Label><Input value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} /></div>
                <div><Label>Tax Type</Label><Input value={form.tax_type} onChange={(e) => setForm({ ...form, tax_type: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Tax Code</Label><Input value={form.tax_code} onChange={(e) => setForm({ ...form, tax_code: e.target.value })} /></div>
                <div><Label>Rate %</Label><Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Rules ({rules.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Rule</TableHead><TableHead>Country</TableHead><TableHead>Type</TableHead><TableHead>Code</TableHead><TableHead>Rate</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>}
              {rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rule_name}</TableCell>
                  <TableCell><Badge variant="outline">{r.country_code}</Badge></TableCell>
                  <TableCell>{r.tax_type}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1 rounded">{r.tax_code}</code></TableCell>
                  <TableCell><Badge>{r.tax_rate}%</Badge></TableCell>
                  <TableCell>{r.priority}</TableCell>
                  <TableCell><Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
