import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, Edit, Copy, Trash2, Save, ArrowRight, Settings } from 'lucide-react';
import { toast } from 'sonner';

const mockTemplates = [
  { id: '1', code: 'APT-001', name: 'Purchase Order Approval', module: 'Purchasing', docType: 'Purchase Order', stages: 3, priority: 'High', active: true, threshold: '> 10,000 SAR', version: 2 },
  { id: '2', code: 'APT-002', name: 'Sales Discount Approval', module: 'Sales', docType: 'Sales Order', stages: 2, priority: 'Medium', active: true, threshold: '> 15% discount', version: 1 },
  { id: '3', code: 'APT-003', name: 'Leave Request Workflow', module: 'HR', docType: 'Leave Request', stages: 2, priority: 'Low', active: true, threshold: '> 5 days', version: 1 },
  { id: '4', code: 'APT-004', name: 'Journal Entry Review', module: 'Finance', docType: 'Journal Entry', stages: 2, priority: 'High', active: true, threshold: '> 50,000 SAR', version: 3 },
  { id: '5', code: 'APT-005', name: 'Vendor Creation', module: 'Master Data', docType: 'Business Partner', stages: 2, priority: 'Medium', active: false, threshold: 'All', version: 1 },
];

export default function ApprovalTemplates() {
  const [templates] = useState(mockTemplates);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Approval Templates</h1><p className="text-sm text-muted-foreground">Combine stages into approval workflows for documents and master data</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Template</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Approval Template</DialogTitle></DialogHeader>
            <Tabs defaultValue="general">
              <TabsList><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="stages">Stages</TabsTrigger><TabsTrigger value="conditions">Conditions</TabsTrigger></TabsList>
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Template Code</Label><Input placeholder="APT-006" /></div>
                  <div><Label>Template Name</Label><Input placeholder="New workflow" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Target Module</Label><Select><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{['Sales', 'Purchasing', 'Finance', 'HR', 'Inventory', 'Master Data', 'Projects'].map(m => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Document Type</Label><Select><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{['Purchase Order', 'Sales Order', 'AP Invoice', 'AR Invoice', 'Journal Entry', 'Leave Request', 'Business Partner'].map(m => <SelectItem key={m} value={m.toLowerCase().replace(/ /g, '-')}>{m}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Priority</Label><Select><SelectTrigger><SelectValue placeholder="Medium" /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
                  <div><Label>Branch Scope</Label><Select><SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger><SelectContent><SelectItem value="all">All Branches</SelectItem><SelectItem value="hq">HQ Only</SelectItem></SelectContent></Select></div>
                </div>
                <div className="flex items-center gap-2"><Switch id="active" defaultChecked /><Label htmlFor="active">Active</Label></div>
              </TabsContent>
              <TabsContent value="stages" className="mt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg"><Badge>1</Badge><span className="text-sm flex-1">Department Head Review</span><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg"><Badge>2</Badge><span className="text-sm flex-1">Finance Review</span><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg"><Badge>3</Badge><span className="text-sm flex-1">Director Approval</span></div>
                  <Button variant="outline" size="sm" className="w-full mt-2"><Plus className="h-4 w-4 mr-1" /> Add Stage</Button>
                </div>
              </TabsContent>
              <TabsContent value="conditions" className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Field</Label><Select><SelectTrigger><SelectValue placeholder="Amount" /></SelectTrigger><SelectContent><SelectItem value="amount">Amount</SelectItem><SelectItem value="discount">Discount %</SelectItem><SelectItem value="department">Department</SelectItem></SelectContent></Select></div>
                  <div><Label>Operator</Label><Select><SelectTrigger><SelectValue placeholder="Greater than" /></SelectTrigger><SelectContent><SelectItem value="gt">Greater than</SelectItem><SelectItem value="lt">Less than</SelectItem><SelectItem value="eq">Equals</SelectItem></SelectContent></Select></div>
                  <div><Label>Value</Label><Input placeholder="10000" /></div>
                </div>
                <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Add Condition</Button>
              </TabsContent>
            </Tabs>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => { setDialogOpen(false); toast.success('Template created'); }}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Module</TableHead><TableHead>Document</TableHead><TableHead>Stages</TableHead><TableHead>Threshold</TableHead><TableHead>Priority</TableHead><TableHead>Ver</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>{templates.map(t => (
          <TableRow key={t.id}>
            <TableCell className="font-mono text-xs">{t.code}</TableCell>
            <TableCell className="font-medium">{t.name}</TableCell>
            <TableCell><Badge variant="outline">{t.module}</Badge></TableCell>
            <TableCell className="text-xs">{t.docType}</TableCell>
            <TableCell>{t.stages}</TableCell>
            <TableCell className="text-xs">{t.threshold}</TableCell>
            <TableCell><Badge variant={t.priority === 'High' ? 'destructive' : 'secondary'}>{t.priority}</Badge></TableCell>
            <TableCell>v{t.version}</TableCell>
            <TableCell><Badge variant={t.active ? 'default' : 'secondary'}>{t.active ? 'Active' : 'Draft'}</Badge></TableCell>
            <TableCell><div className="flex gap-1"><Button variant="ghost" size="sm"><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm"><Copy className="h-3.5 w-3.5" /></Button></div></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </div>
  );
}
