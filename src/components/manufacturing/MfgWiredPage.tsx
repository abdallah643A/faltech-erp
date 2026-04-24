import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';

export interface MfgFieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'date' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
}

export interface MfgColumnDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'status' | 'badge';
  formatter?: (row: any) => React.ReactNode;
}

interface Props {
  title: string;
  description?: string;
  data: any[];
  columns: MfgColumnDef[];
  formFields: MfgFieldDef[];
  onCreate: (values: any) => Promise<any> | void;
  isLoading?: boolean;
  rowActions?: (row: any) => React.ReactNode;
  headerExtra?: React.ReactNode;
  createLabel?: string;
}

const fmt = (col: MfgColumnDef, row: any) => {
  if (col.formatter) return col.formatter(row);
  const v = row[col.key];
  if (v == null || v === '') return '—';
  if (col.type === 'currency') return Number(v).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  if (col.type === 'number') return Number(v).toLocaleString();
  if (col.type === 'date') return new Date(v).toLocaleDateString();
  if (col.type === 'status' || col.type === 'badge') {
    const variant = ['approved', 'completed', 'closed', 'done', 'pass'].includes(String(v)) ? 'default'
      : ['draft', 'pending', 'open'].includes(String(v)) ? 'secondary'
      : ['fail', 'cancelled', 'obsolete'].includes(String(v)) ? 'destructive' : 'outline';
    return <Badge variant={variant as any}>{String(v)}</Badge>;
  }
  return String(v);
};

export function MfgWiredPage({
  title, description, data, columns, formFields, onCreate,
  isLoading, rowActions, headerExtra, createLabel = 'New',
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<any>(() => Object.fromEntries(formFields.map(f => [f.key, f.defaultValue ?? ''])));

  const reset = () => setValues(Object.fromEntries(formFields.map(f => [f.key, f.defaultValue ?? ''])));

  const submit = async () => {
    for (const f of formFields) {
      if (f.required && (values[f.key] === '' || values[f.key] == null)) return;
    }
    setSubmitting(true);
    try {
      const payload: any = { ...values };
      for (const f of formFields) {
        if (f.type === 'number' && payload[f.key] !== '' && payload[f.key] != null) {
          payload[f.key] = Number(payload[f.key]);
        }
        if (payload[f.key] === '') payload[f.key] = null;
      }
      await onCreate(payload);
      setOpen(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />{createLabel}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{createLabel}</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {formFields.map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={f.key}>{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                    {f.type === 'textarea' ? (
                      <Textarea id={f.key} value={values[f.key] ?? ''} onChange={e => setValues({ ...values, [f.key]: e.target.value })} placeholder={f.placeholder} />
                    ) : f.type === 'select' ? (
                      <Select value={values[f.key] ?? ''} onValueChange={v => setValues({ ...values, [f.key]: v })}>
                        <SelectTrigger><SelectValue placeholder={f.placeholder || 'Select...'} /></SelectTrigger>
                        <SelectContent>
                          {(f.options || []).map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input id={f.key} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        value={values[f.key] ?? ''} onChange={e => setValues({ ...values, [f.key]: e.target.value })} placeholder={f.placeholder} />
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Records ({data?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading...
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No records yet. Click {createLabel} to add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}
                    {rowActions && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={row.id || i}>
                      {columns.map(c => <TableCell key={c.key}>{fmt(c, row)}</TableCell>)}
                      {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
