import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import { BudgetMaster } from '@/hooks/useBudgetMasters';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => currentYear - 5 + i);

const BUDGET_TYPES = [
  { value: 'annual', label: 'Annual Budget' },
  { value: 'project', label: 'Project Budget' },
  { value: 'department', label: 'Department Budget' },
  { value: 'cost_center', label: 'Cost Center Budget' },
  { value: 'branch', label: 'Branch Budget' },
  { value: 'capex', label: 'CAPEX Budget' },
  { value: 'opex', label: 'OPEX Budget' },
];

const BASES = [
  { value: 'top_down', label: 'Top-Down' },
  { value: 'bottom_up', label: 'Bottom-Up' },
  { value: 'zero_based', label: 'Zero-Based' },
  { value: 'historical', label: 'Historical Actuals' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<BudgetMaster>) => void;
  editData?: BudgetMaster | null;
}

export function BudgetMasterForm({ open, onClose, onSave, editData }: Props) {
  const [form, setForm] = useState({
    budget_name: '',
    budget_type: 'annual',
    fiscal_year: currentYear,
    start_date: `${currentYear}-01-01`,
    end_date: `${currentYear}-12-31`,
    is_multi_year: false,
    start_year: currentYear,
    end_year: currentYear + 2,
    budget_basis: 'top_down',
    currency: 'SAR',
    cost_center_code: '',
    budget_owner_name: '',
    budget_controller_name: '',
    notes: '',
  });

  useEffect(() => {
    if (editData) {
      setForm({
        budget_name: editData.budget_name,
        budget_type: editData.budget_type,
        fiscal_year: editData.fiscal_year,
        start_date: editData.start_date,
        end_date: editData.end_date,
        is_multi_year: editData.is_multi_year,
        start_year: editData.start_year || currentYear,
        end_year: editData.end_year || currentYear + 2,
        budget_basis: editData.budget_basis,
        currency: editData.currency,
        cost_center_code: editData.cost_center_code || '',
        budget_owner_name: editData.budget_owner_name || '',
        budget_controller_name: editData.budget_controller_name || '',
        notes: editData.notes || '',
      });
    } else {
      setForm({
        budget_name: '',
        budget_type: 'annual',
        fiscal_year: currentYear,
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
        is_multi_year: false,
        start_year: currentYear,
        end_year: currentYear + 2,
        budget_basis: 'top_down',
        currency: 'SAR',
        cost_center_code: '',
        budget_owner_name: '',
        budget_controller_name: '',
        notes: '',
      });
    }
  }, [editData, open]);

  const handleSave = () => {
    const code = editData?.budget_code || `BDG-${form.fiscal_year}-${String(Date.now()).slice(-5)}`;
    onSave({
      ...(editData ? { id: editData.id } : {}),
      budget_code: code,
      budget_name: form.budget_name,
      budget_type: form.budget_type,
      fiscal_year: form.fiscal_year,
      start_date: form.is_multi_year ? `${form.start_year}-01-01` : form.start_date,
      end_date: form.is_multi_year ? `${form.end_year}-12-31` : form.end_date,
      is_multi_year: form.is_multi_year,
      start_year: form.is_multi_year ? form.start_year : null,
      end_year: form.is_multi_year ? form.end_year : null,
      budget_basis: form.budget_basis,
      currency: form.currency,
      cost_center_code: form.cost_center_code || null,
      budget_owner_name: form.budget_owner_name || null,
      budget_controller_name: form.budget_controller_name || null,
      notes: form.notes || null,
    });
    onClose();
  };

  const handleYearChange = (year: number) => {
    setForm(f => ({
      ...f,
      fiscal_year: year,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Budget' : 'Create New Budget'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Budget Name *</Label>
              <Input value={form.budget_name} onChange={e => setForm(f => ({ ...f, budget_name: e.target.value }))} placeholder="e.g., Annual Operating Budget 2026" />
            </div>
            <div>
              <Label>Budget Type</Label>
              <Select value={form.budget_type} onValueChange={v => setForm(f => ({ ...f, budget_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BUDGET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget Basis</Label>
              <Select value={form.budget_basis} onValueChange={v => setForm(f => ({ ...f, budget_basis: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BASES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <Switch checked={form.is_multi_year} onCheckedChange={v => setForm(f => ({ ...f, is_multi_year: v }))} />
            <Label className="cursor-pointer">Multi-Year Budget</Label>
          </div>

          {form.is_multi_year ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Year</Label>
                <Select value={String(form.start_year)} onValueChange={v => setForm(f => ({ ...f, start_year: Number(v), fiscal_year: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Year</Label>
                <Select value={String(form.end_year)} onValueChange={v => setForm(f => ({ ...f, end_year: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.filter(y => y >= form.start_year).map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Fiscal Year</Label>
                <Select value={String(form.fiscal_year)} onValueChange={v => handleYearChange(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget Owner</Label>
              <Input value={form.budget_owner_name} onChange={e => setForm(f => ({ ...f, budget_owner_name: e.target.value }))} placeholder="Owner name" />
            </div>
            <div>
              <Label>Budget Controller</Label>
              <Input value={form.budget_controller_name} onChange={e => setForm(f => ({ ...f, budget_controller_name: e.target.value }))} placeholder="Controller name" />
            </div>
          </div>

          <div>
            <Label>Cost Center Code</Label>
            <Input value={form.cost_center_code} onChange={e => setForm(f => ({ ...f, cost_center_code: e.target.value }))} placeholder="Optional" />
          </div>

          <div>
            <Label>Notes / Justification</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Budget justification or notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.budget_name}>
            <Save className="h-4 w-4 mr-1" />{editData ? 'Update' : 'Create'} Budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
