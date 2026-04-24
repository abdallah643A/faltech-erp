import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVendorScorecards, useUpsertVendorScorecard } from '@/hooks/useAssetPredictive';
import { Award, Plus } from 'lucide-react';

const gradeColors: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-700',
  B: 'bg-blue-500/15 text-blue-700',
  C: 'bg-amber-500/15 text-amber-700',
  D: 'bg-orange-500/15 text-orange-700',
  F: 'bg-red-500/15 text-red-700',
};

export default function VendorScorecardMetricsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    vendor_name: '',
    period_year: currentYear,
    period_month: '' as string,
    total_jobs: '',
    on_time_jobs: '',
    rework_jobs: '',
    avg_response_hours: '',
    avg_repair_quality: '5',
    sla_compliance_pct: '90',
    user_feedback_avg: '4',
    total_spend: '',
  });

  const { data: cards = [] } = useVendorScorecards(year);
  const upsert = useUpsertVendorScorecard();

  const handleSubmit = async () => {
    if (!form.vendor_name) return;
    await upsert.mutateAsync({
      vendor_name: form.vendor_name,
      period_year: Number(form.period_year),
      period_month: form.period_month ? Number(form.period_month) : undefined,
      total_jobs: Number(form.total_jobs) || 0,
      on_time_jobs: Number(form.on_time_jobs) || 0,
      rework_jobs: Number(form.rework_jobs) || 0,
      avg_response_hours: Number(form.avg_response_hours) || 0,
      avg_repair_quality: Number(form.avg_repair_quality) || 0,
      sla_compliance_pct: Number(form.sla_compliance_pct) || 0,
      user_feedback_avg: Number(form.user_feedback_avg) || 0,
      total_spend: Number(form.total_spend) || 0,
    });
    setShowAdd(false);
    setForm({ ...form, vendor_name: '', total_jobs: '', on_time_jobs: '', rework_jobs: '', total_spend: '' });
  };

  const totals = {
    avgScore: cards.length ? Math.round(cards.reduce((s, c) => s + c.overall_score, 0) / cards.length) : 0,
    topGrade: cards.filter(c => c.grade === 'A').length,
    bottomGrade: cards.filter(c => c.grade === 'F' || c.grade === 'D').length,
    totalSpend: cards.reduce((s, c) => s + c.total_spend, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'IBM Plex Sans' }}>
            <Award className="h-6 w-6" style={{ color: '#0066cc' }} /> Vendor Scorecard Metrics
          </h1>
          <p className="text-sm text-muted-foreground">Period-by-period vendor performance with weighted overall scoring</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button style={{ backgroundColor: '#0066cc' }}><Plus className="h-4 w-4 mr-1" /> Add Metrics</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Vendor Performance Metrics</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Vendor name *" value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Year" value={form.period_year} onChange={e => setForm({ ...form, period_year: Number(e.target.value) })} />
                  <Input type="number" placeholder="Month (optional)" value={form.period_month} onChange={e => setForm({ ...form, period_month: e.target.value })} />
                  <Input type="number" placeholder="Total jobs" value={form.total_jobs} onChange={e => setForm({ ...form, total_jobs: e.target.value })} />
                  <Input type="number" placeholder="On-time jobs" value={form.on_time_jobs} onChange={e => setForm({ ...form, on_time_jobs: e.target.value })} />
                  <Input type="number" placeholder="Rework jobs" value={form.rework_jobs} onChange={e => setForm({ ...form, rework_jobs: e.target.value })} />
                  <Input type="number" placeholder="Avg response (hrs)" value={form.avg_response_hours} onChange={e => setForm({ ...form, avg_response_hours: e.target.value })} />
                  <Input type="number" step="0.1" placeholder="Repair quality (0-10)" value={form.avg_repair_quality} onChange={e => setForm({ ...form, avg_repair_quality: e.target.value })} />
                  <Input type="number" placeholder="SLA compliance %" value={form.sla_compliance_pct} onChange={e => setForm({ ...form, sla_compliance_pct: e.target.value })} />
                  <Input type="number" step="0.1" placeholder="User feedback (0-5)" value={form.user_feedback_avg} onChange={e => setForm({ ...form, user_feedback_avg: e.target.value })} />
                  <Input type="number" placeholder="Total spend" value={form.total_spend} onChange={e => setForm({ ...form, total_spend: e.target.value })} />
                </div>
              </div>
              <DialogFooter><Button onClick={handleSubmit} disabled={upsert.isPending} style={{ backgroundColor: '#0066cc' }}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totals.avgScore}</div><div className="text-xs text-muted-foreground">Avg Overall Score</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-emerald-600">{totals.topGrade}</div><div className="text-xs text-muted-foreground">Grade A vendors</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{totals.bottomGrade}</div><div className="text-xs text-muted-foreground">Underperforming</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totals.totalSpend.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Spend (SAR)</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Vendor Rankings — {year}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vendor</TableHead><TableHead>Period</TableHead><TableHead>Jobs</TableHead><TableHead>On-Time</TableHead><TableHead>Rework</TableHead><TableHead>SLA</TableHead><TableHead>Quality</TableHead><TableHead>Feedback</TableHead><TableHead>Spend</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {cards.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">No vendor metrics for {year}.</TableCell></TableRow>
              ) : cards.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm">{c.vendor_name}</TableCell>
                  <TableCell className="text-xs">{c.period_month ? `${c.period_year}-${String(c.period_month).padStart(2, '0')}` : `${c.period_year} YTD`}</TableCell>
                  <TableCell className="text-xs">{c.total_jobs}</TableCell>
                  <TableCell className="text-xs">{c.total_jobs ? `${Math.round((c.on_time_jobs / c.total_jobs) * 100)}%` : '-'}</TableCell>
                  <TableCell className="text-xs">{c.rework_jobs}</TableCell>
                  <TableCell className="text-xs">{c.sla_compliance_pct}%</TableCell>
                  <TableCell className="text-xs">{c.avg_repair_quality}/10</TableCell>
                  <TableCell className="text-xs">{c.avg_repair_quality}/5</TableCell>
                  <TableCell className="text-xs">{c.total_spend.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm">{c.overall_score}</TableCell>
                  <TableCell><Badge className={`text-[10px] font-bold ${gradeColors[c.grade || 'F']}`}>{c.grade || '-'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
