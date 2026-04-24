import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMaterialIssues, useMaterialReturns } from '@/hooks/useMfgEnhanced';
import { format } from 'date-fns';

export default function MaterialIssueReturnPage() {
  const { data: issues = [], create: createIssue } = useMaterialIssues();
  const { data: returns = [], create: createReturn } = useMaterialReturns();
  const [issueForm, setIssueForm] = useState<any>({ wo_number: '', item_code: '', required_qty: 0, issued_qty: 0, warehouse_code: '', bin_code: '', batch_number: '', unit_cost: 0 });
  const [returnForm, setReturnForm] = useState<any>({ wo_number: '', item_code: '', return_qty: 0, warehouse_code: '', reason: '', unit_cost: 0 });

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Material Issue & Return</h1>
        <p className="text-xs text-blue-100">Issue components to work orders and return unused stock</p>
      </div>

      <Tabs defaultValue="issue">
        <TabsList><TabsTrigger value="issue">Issues ({issues.length})</TabsTrigger><TabsTrigger value="return">Returns ({returns.length})</TabsTrigger></TabsList>

        <TabsContent value="issue" className="space-y-3">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild><Button size="sm">New Issue</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Issue Material to WO</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">WO #</Label><Input value={issueForm.wo_number} onChange={(e) => setIssueForm({ ...issueForm, wo_number: e.target.value })} className="h-9" /></div>
                    <div><Label className="text-xs">Item Code</Label><Input value={issueForm.item_code} onChange={(e) => setIssueForm({ ...issueForm, item_code: e.target.value })} className="h-9" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">Required</Label><Input type="number" value={issueForm.required_qty} onChange={(e) => setIssueForm({ ...issueForm, required_qty: parseFloat(e.target.value) })} className="h-9" /></div>
                    <div><Label className="text-xs">Issued</Label><Input type="number" value={issueForm.issued_qty} onChange={(e) => setIssueForm({ ...issueForm, issued_qty: parseFloat(e.target.value) })} className="h-9" /></div>
                    <div><Label className="text-xs">Unit Cost</Label><Input type="number" value={issueForm.unit_cost} onChange={(e) => setIssueForm({ ...issueForm, unit_cost: parseFloat(e.target.value) })} className="h-9" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">Warehouse</Label><Input value={issueForm.warehouse_code} onChange={(e) => setIssueForm({ ...issueForm, warehouse_code: e.target.value })} className="h-9" /></div>
                    <div><Label className="text-xs">Bin</Label><Input value={issueForm.bin_code} onChange={(e) => setIssueForm({ ...issueForm, bin_code: e.target.value })} className="h-9" /></div>
                    <div><Label className="text-xs">Batch</Label><Input value={issueForm.batch_number} onChange={(e) => setIssueForm({ ...issueForm, batch_number: e.target.value })} className="h-9" /></div>
                  </div>
                  <Button className="w-full" onClick={() => createIssue.mutate(issueForm)}>Issue</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-4">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-left">Date</th><th className="p-2 text-left">Issue #</th><th className="p-2 text-left">WO</th>
                <th className="p-2 text-left">Item</th><th className="p-2 text-right">Issued</th><th className="p-2 text-left">Bin/Batch</th><th className="p-2 text-right">Cost (SAR)</th>
              </tr></thead>
              <tbody>
                {issues.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No issues yet</td></tr>}
                {issues.map((i: any) => (
                  <tr key={i.id} className="border-b">
                    <td className="p-2 text-xs">{format(new Date(i.issued_at), 'MMM d HH:mm')}</td>
                    <td className="p-2 font-mono text-xs">{i.issue_number}</td>
                    <td className="p-2">{i.wo_number}</td>
                    <td className="p-2 font-mono text-xs">{i.item_code}</td>
                    <td className="p-2 text-right">{i.issued_qty} {i.uom}</td>
                    <td className="p-2 text-xs">{i.bin_code}/{i.batch_number || '—'}</td>
                    <td className="p-2 text-right">{Number(i.total_cost).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="return" className="space-y-3">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild><Button size="sm">New Return</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Return Material from WO</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">WO #</Label><Input value={returnForm.wo_number} onChange={(e) => setReturnForm({ ...returnForm, wo_number: e.target.value })} className="h-9" /></div>
                    <div><Label className="text-xs">Item Code</Label><Input value={returnForm.item_code} onChange={(e) => setReturnForm({ ...returnForm, item_code: e.target.value })} className="h-9" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">Return Qty</Label><Input type="number" value={returnForm.return_qty} onChange={(e) => setReturnForm({ ...returnForm, return_qty: parseFloat(e.target.value) })} className="h-9" /></div>
                    <div><Label className="text-xs">Unit Cost</Label><Input type="number" value={returnForm.unit_cost} onChange={(e) => setReturnForm({ ...returnForm, unit_cost: parseFloat(e.target.value) })} className="h-9" /></div>
                    <div><Label className="text-xs">Warehouse</Label><Input value={returnForm.warehouse_code} onChange={(e) => setReturnForm({ ...returnForm, warehouse_code: e.target.value })} className="h-9" /></div>
                  </div>
                  <div><Label className="text-xs">Reason</Label><Input value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })} className="h-9" /></div>
                  <Button className="w-full" onClick={() => createReturn.mutate(returnForm)}>Return</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-4">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-left">Date</th><th className="p-2 text-left">Return #</th><th className="p-2 text-left">WO</th>
                <th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-left">Reason</th><th className="p-2 text-right">Cost (SAR)</th>
              </tr></thead>
              <tbody>
                {returns.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No returns yet</td></tr>}
                {returns.map((r: any) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2 text-xs">{format(new Date(r.returned_at), 'MMM d HH:mm')}</td>
                    <td className="p-2 font-mono text-xs">{r.return_number}</td>
                    <td className="p-2">{r.wo_number}</td>
                    <td className="p-2 font-mono text-xs">{r.item_code}</td>
                    <td className="p-2 text-right">{r.return_qty} {r.uom}</td>
                    <td className="p-2 text-xs">{r.reason}</td>
                    <td className="p-2 text-right">{Number(r.total_cost).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
