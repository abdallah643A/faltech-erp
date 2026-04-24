import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useReplacementRoadmap, useUpsertRoadmapItem, useApproveRoadmapItem } from '@/hooks/useAssetPredictive';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, TrendingUp, Check, X } from 'lucide-react';

const decisionColors: Record<string, string> = {
  replace: 'bg-blue-500/15 text-blue-700',
  refurbish: 'bg-emerald-500/15 text-emerald-700',
  retain: 'bg-gray-500/15 text-gray-700',
  dispose: 'bg-red-500/15 text-red-700',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/15 text-gray-700',
  pending: 'bg-amber-500/15 text-amber-700',
  approved: 'bg-emerald-500/15 text-emerald-700',
  rejected: 'bg-red-500/15 text-red-700',
};

export default function ReplacementRoadmapPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    equipment_id: '',
    plan_year: currentYear,
    decision: 'replace' as const,
    estimated_replacement_cost: '',
    estimated_refurbish_cost: '',
    estimated_salvage_value: '',
    annual_maintenance_cost: '',
    expected_life_extension_years: '5',
    priority: 'medium',
    notes: '',
  });

  const { data: items = [] } = useReplacementRoadmap(year);
  const upsert = useUpsertRoadmapItem();
  const approve = useApproveRoadmapItem();

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-list-roadmap'],
    queryFn: async () => {
      const { data } = await supabase.from('cpms_equipment' as any).select('id, name, code').order('name').limit(500);
      return (data || []) as any[];
    },
  });
  const eqMap = Object.fromEntries(equipment.map((e: any) => [e.id, e]));

  const totals = {
    replaceBudget: items.filter(i => i.decision === 'replace').reduce((s, i) => s + (i.estimated_replacement_cost || 0), 0),
    refurbBudget: items.filter(i => i.decision === 'refurbish').reduce((s, i) => s + (i.estimated_refurbish_cost || 0), 0),
    pending: items.filter(i => i.status === 'draft' || i.status === 'pending').length,
    approved: items.filter(i => i.status === 'approved').length,
  };

  const handleSubmit = async () => {
    if (!form.equipment_id) return;
    await upsert.mutateAsync({
      equipment_id: form.equipment_id,
      plan_year: Number(form.plan_year),
      decision: form.decision,
      estimated_replacement_cost: Number(form.estimated_replacement_cost) || 0,
      estimated_refurbish_cost: Number(form.estimated_refurbish_cost) || 0,
      estimated_salvage_value: Number(form.estimated_salvage_value) || 0,
      annual_maintenance_cost: Number(form.annual_maintenance_cost) || 0,
      expected_life_extension_years: Number(form.expected_life_extension_years) || 0,
      priority: form.priority,
      notes: form.notes,
      status: 'pending',
    });
    setShowAdd(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'IBM Plex Sans' }}>
            <TrendingUp className="h-6 w-6" style={{ color: '#0066cc' }} /> Replacement Roadmap
          </h1>
          <p className="text-sm text-muted-foreground">Multi-year capital planning with ROI vs refurbish analysis</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button style={{ backgroundColor: '#0066cc' }}><Plus className="h-4 w-4 mr-1" /> Add Plan</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Replacement Plan</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Asset *" /></SelectTrigger>
                  <SelectContent>
                    {equipment.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.code} — {e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Plan Year" value={form.plan_year} onChange={e => setForm({ ...form, plan_year: Number(e.target.value) })} />
                  <Select value={form.decision} onValueChange={(v: any) => setForm({ ...form, decision: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replace">Replace</SelectItem>
                      <SelectItem value="refurbish">Refurbish</SelectItem>
                      <SelectItem value="retain">Retain</SelectItem>
                      <SelectItem value="dispose">Dispose</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Replacement cost" value={form.estimated_replacement_cost} onChange={e => setForm({ ...form, estimated_replacement_cost: e.target.value })} />
                  <Input type="number" placeholder="Refurbish cost" value={form.estimated_refurbish_cost} onChange={e => setForm({ ...form, estimated_refurbish_cost: e.target.value })} />
                  <Input type="number" placeholder="Salvage value" value={form.estimated_salvage_value} onChange={e => setForm({ ...form, estimated_salvage_value: e.target.value })} />
                  <Input type="number" placeholder="Annual maintenance" value={form.annual_maintenance_cost} onChange={e => setForm({ ...form, annual_maintenance_cost: e.target.value })} />
                  <Input type="number" placeholder="Life ext (yrs)" value={form.expected_life_extension_years} onChange={e => setForm({ ...form, expected_life_extension_years: e.target.value })} />
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <DialogFooter><Button onClick={handleSubmit} disabled={upsert.isPending} style={{ backgroundColor: '#0066cc' }}>Save Plan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totals.replaceBudget.toLocaleString()}</div><div className="text-xs text-muted-foreground">Replace Budget (SAR)</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totals.refurbBudget.toLocaleString()}</div><div className="text-xs text-muted-foreground">Refurbish Budget (SAR)</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-amber-600">{totals.pending}</div><div className="text-xs text-muted-foreground">Pending Approval</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-emerald-600">{totals.approved}</div><div className="text-xs text-muted-foreground">Approved</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Plan Year {year}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Asset</TableHead><TableHead>Decision</TableHead><TableHead>Replace Cost</TableHead><TableHead>Refurbish Cost</TableHead><TableHead>Replace ROI</TableHead><TableHead>Refurbish ROI</TableHead><TableHead>AI Recommendation</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No plans for {year}.</TableCell></TableRow>
              ) : items.map(it => {
                const eq = it.equipment_id ? eqMap[it.equipment_id] : null;
                return (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">{eq ? `${eq.code} — ${eq.name}` : '-'}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${decisionColors[it.decision]}`}>{it.decision}</Badge></TableCell>
                    <TableCell className="text-xs">{(it.estimated_replacement_cost || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{(it.estimated_refurbish_cost || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-mono">{(it.replace_roi * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-xs font-mono">{(it.refurbish_roi * 100).toFixed(0)}%</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{it.recommendation || '-'}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{it.priority}</Badge></TableCell>
                    <TableCell><Badge className={`text-[10px] ${statusColors[it.status]}`}>{it.status}</Badge></TableCell>
                    <TableCell>
                      {(it.status === 'pending' || it.status === 'draft') && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => approve.mutate({ id: it.id, approved: true })} className="h-7 w-7"><Check className="h-3 w-3 text-emerald-600" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => approve.mutate({ id: it.id, approved: false, reason: 'Rejected' })} className="h-7 w-7"><X className="h-3 w-3 text-red-600" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
