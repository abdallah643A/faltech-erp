import { useState } from 'react';
import { usePortfolioScoring } from '@/hooks/usePMOEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListOrdered, Plus, TrendingUp } from 'lucide-react';

export default function PortfolioScoringPage() {
  const { list, upsert } = usePortfolioScoring();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({
    portfolio_id: '', strategic_value: 5, financial_return: 5, risk_score: 5,
    complexity_score: 5, resource_fit: 5, regulatory_urgency: 5,
  });

  const items = (list.data ?? []).slice().sort((a: any, b: any) => Number(b.composite_score) - Number(a.composite_score));

  return (
    <div className="p-4 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ListOrdered className="h-6 w-6 text-primary" /> Portfolio Prioritization</h1>
          <p className="text-sm text-muted-foreground">Weighted scoring matrix: strategic value, financial return, risk, complexity, resource fit, regulatory</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Score Project</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Portfolio Score</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div><Label>Portfolio Item ID</Label><Input value={form.portfolio_id} onChange={e => setForm({ ...form, portfolio_id: e.target.value })} placeholder="UUID of pmo_project_portfolio row" /></div>
              {[
                ['strategic_value', 'Strategic Value (0-10)'],
                ['financial_return', 'Financial Return (0-10)'],
                ['risk_score', 'Risk Score (0-10, higher=worse)'],
                ['complexity_score', 'Complexity (0-10, higher=worse)'],
                ['resource_fit', 'Resource Fit (0-10)'],
                ['regulatory_urgency', 'Regulatory Urgency (0-10)'],
              ].map(([k, label]) => (
                <div key={k}><Label>{label}</Label><Input type="number" min={0} max={10} value={form[k]} onChange={e => setForm({ ...form, [k]: +e.target.value })} /></div>
              ))}
            </div>
            <Button onClick={() => upsert.mutate(form, { onSuccess: () => setOpen(false) })} disabled={upsert.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ranked Priority List</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Portfolio Item</TableHead>
                <TableHead className="text-right">Strategic</TableHead>
                <TableHead className="text-right">Financial</TableHead>
                <TableHead className="text-right">Risk</TableHead>
                <TableHead className="text-right">Complexity</TableHead>
                <TableHead className="text-right">Resource</TableHead>
                <TableHead className="text-right">Regulatory</TableHead>
                <TableHead className="text-right">Composite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s: any, i: number) => (
                <TableRow key={s.id}>
                  <TableCell><Badge variant={i < 3 ? 'default' : 'outline'}>{i + 1}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{String(s.portfolio_id).slice(0, 8)}</TableCell>
                  <TableCell className="text-right">{s.strategic_value}</TableCell>
                  <TableCell className="text-right">{s.financial_return}</TableCell>
                  <TableCell className="text-right">{s.risk_score}</TableCell>
                  <TableCell className="text-right">{s.complexity_score}</TableCell>
                  <TableCell className="text-right">{s.resource_fit}</TableCell>
                  <TableCell className="text-right">{s.regulatory_urgency}</TableCell>
                  <TableCell className="text-right font-bold text-primary"><TrendingUp className="inline h-3 w-3 mr-1" />{Number(s.composite_score).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No scoring data.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
