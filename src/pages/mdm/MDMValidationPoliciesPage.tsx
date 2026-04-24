import { useState } from 'react';
import { useValidationPolicies, useUpsertValidationPolicy } from '@/hooks/useMDMSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Plus } from 'lucide-react';

export default function MDMValidationPoliciesPage() {
  const list = useValidationPolicies();
  const upsert = useUpsertValidationPolicy();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ validation_type: 'required', applies_to: 'both', severity: 'error', is_active: true });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" />Validation Policies</h1>
          <p className="text-muted-foreground">Per-field rules enforced on BP master data.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Policy</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead><TableHead>Field</TableHead><TableHead>Type</TableHead>
                <TableHead>Value</TableHead><TableHead>Applies To</TableHead><TableHead>Severity</TableHead><TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.policy_name}</TableCell>
                  <TableCell><Badge variant="secondary">{p.field_name}</Badge></TableCell>
                  <TableCell>{p.validation_type}</TableCell>
                  <TableCell className="font-mono text-xs">{p.validation_value ?? '—'}</TableCell>
                  <TableCell>{p.applies_to}</TableCell>
                  <TableCell><Badge variant={p.severity === 'error' ? 'destructive' : 'outline'}>{p.severity}</Badge></TableCell>
                  <TableCell>{p.is_active ? '✓' : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Validation Policy</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Policy name</Label><Input value={form.policy_name ?? ''} onChange={(e) => setForm({ ...form, policy_name: e.target.value })} /></div>
            <div><Label>Field name</Label><Input value={form.field_name ?? ''} onChange={(e) => setForm({ ...form, field_name: e.target.value })} placeholder="name, email, tax_id…" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.validation_type} onValueChange={(v) => setForm({ ...form, validation_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="regex">Regex</SelectItem>
                  <SelectItem value="min_length">Min length</SelectItem>
                  <SelectItem value="max_length">Max length</SelectItem>
                  <SelectItem value="dictionary">Dictionary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input value={form.validation_value ?? ''} onChange={(e) => setForm({ ...form, validation_value: e.target.value })} /></div>
            <div><Label>Error message</Label><Input value={form.error_message ?? ''} onChange={(e) => setForm({ ...form, error_message: e.target.value })} /></div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Applies to</Label>
                <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(form); setOpen(false); }} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
