import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useTaxLocalization } from '@/hooks/useFinanceEnhanced';
import { Globe2, Plus, Trash2 } from 'lucide-react';

export default function TaxLocalization() {
  const [country, setCountry] = useState<string>('');
  const { data, upsert, remove } = useTaxLocalization(country || undefined);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    country_code: 'SA', rule_name: '', rule_name_ar: '', tax_type: 'vat_standard',
    rate: 15, account_code: '', authority: 'ZATCA', reporting_code: '', is_active: true,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe2 className="h-6 w-6" /> Tax Localization Hooks</h1>
          <p className="text-muted-foreground">Country-specific tax rules: ZATCA, GCC VAT, withholding</p>
        </div>
        <div className="flex gap-2">
          <Select value={country || 'all'} onValueChange={v => setCountry(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All countries" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              <SelectItem value="SA">🇸🇦 Saudi Arabia</SelectItem>
              <SelectItem value="AE">🇦🇪 UAE</SelectItem>
              <SelectItem value="BH">🇧🇭 Bahrain</SelectItem>
              <SelectItem value="OM">🇴🇲 Oman</SelectItem>
              <SelectItem value="QA">🇶🇦 Qatar</SelectItem>
              <SelectItem value="KW">🇰🇼 Kuwait</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Rule</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>New Tax Rule</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Country</Label>
                  <Select value={form.country_code} onValueChange={v => setForm({ ...form, country_code: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SA">Saudi Arabia</SelectItem>
                      <SelectItem value="AE">UAE</SelectItem>
                      <SelectItem value="BH">Bahrain</SelectItem>
                      <SelectItem value="OM">Oman</SelectItem>
                      <SelectItem value="QA">Qatar</SelectItem>
                      <SelectItem value="KW">Kuwait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Authority</Label><Input value={form.authority} onChange={e => setForm({ ...form, authority: e.target.value })} /></div>
                <div className="col-span-2"><Label>Rule Name *</Label><Input value={form.rule_name} onChange={e => setForm({ ...form, rule_name: e.target.value })} /></div>
                <div className="col-span-2"><Label>Rule Name (AR)</Label><Input dir="rtl" value={form.rule_name_ar} onChange={e => setForm({ ...form, rule_name_ar: e.target.value })} /></div>
                <div><Label>Tax Type</Label>
                  <Select value={form.tax_type} onValueChange={v => setForm({ ...form, tax_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vat_standard">VAT Standard</SelectItem>
                      <SelectItem value="vat_zero">VAT Zero-Rated</SelectItem>
                      <SelectItem value="vat_exempt">VAT Exempt</SelectItem>
                      <SelectItem value="wht">Withholding Tax</SelectItem>
                      <SelectItem value="zakat">Zakat</SelectItem>
                      <SelectItem value="excise">Excise</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Rate %</Label><Input type="number" step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: +e.target.value })} /></div>
                <div><Label>Account Code</Label><Input value={form.account_code} onChange={e => setForm({ ...form, account_code: e.target.value })} /></div>
                <div><Label>Reporting Code</Label><Input value={form.reporting_code} onChange={e => setForm({ ...form, reporting_code: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={async () => { await upsert.mutateAsync(form); setOpen(false); }}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Tax Rules ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Country</TableHead><TableHead>Rule</TableHead><TableHead>Type</TableHead>
              <TableHead>Rate</TableHead><TableHead>Account</TableHead><TableHead>Authority</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.country_code}</Badge></TableCell>
                  <TableCell>
                    <div className="font-medium">{r.rule_name}</div>
                    {r.rule_name_ar && <div className="text-xs text-muted-foreground" dir="rtl">{r.rule_name_ar}</div>}
                  </TableCell>
                  <TableCell><Badge>{r.tax_type}</Badge></TableCell>
                  <TableCell>{r.rate}%</TableCell>
                  <TableCell className="font-mono text-xs">{r.account_code || '—'}</TableCell>
                  <TableCell>{r.authority}</TableCell>
                  <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
