import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle, Package, ArrowDown, ArrowUp } from 'lucide-react';
import { useSiteInventory, useSiteMaterialTxns, calculateWastage } from '@/hooks/useSiteMaterials';
import { useCPMS } from '@/hooks/useCPMS';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SiteMaterialsPage() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { inventory, createItem } = useSiteInventory(selectedProjectId);
  const { txns, createTxn } = useSiteMaterialTxns(selectedProjectId);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showTxnDialog, setShowTxnDialog] = useState(false);
  const [itemForm, setItemForm] = useState({ item_code: '', item_description: '', unit: 'EA', boq_quantity: 0, unit_cost: 0, valuation_method: 'WAC', site_location: '' });
  const [txnForm, setTxnForm] = useState({ site_inventory_id: '', txn_type: 'receipt', quantity: 0, unit_cost: 0, reference_doc: '', notes: '' });

  const invData = inventory.data || [];
  const txnData = txns.data || [];

  const totalItems = invData.length;
  const criticalWaste = invData.filter((i: any) => calculateWastage(i.boq_quantity, i.consumed_quantity).status === 'critical').length;
  const totalStockValue = invData.reduce((s: number, i: any) => s + ((i.current_stock || 0) * (i.unit_cost || 0)), 0);

  const handleCreateItem = () => {
    if (!selectedProjectId) return;
    createItem.mutate({ ...itemForm, project_id: selectedProjectId });
    setShowItemDialog(false);
    setItemForm({ item_code: '', item_description: '', unit: 'EA', boq_quantity: 0, unit_cost: 0, valuation_method: 'WAC', site_location: '' });
  };

  const handleCreateTxn = () => {
    if (!selectedProjectId) return;
    createTxn.mutate({ ...txnForm, project_id: selectedProjectId });
    setShowTxnDialog(false);
    setTxnForm({ site_inventory_id: '', txn_type: 'receipt', quantity: 0, unit_cost: 0, reference_doc: '', notes: '' });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Site Material Management</h1>
            <p className="text-muted-foreground">Project-tagged inventory, wastage tracking & FIFO/WAC valuation</p>
          </div>
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.id} value={p.id!}>{p.code} - {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{totalItems}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Stock Value</p><p className="text-2xl font-bold">{totalStockValue.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><p className="text-sm text-muted-foreground">Critical Wastage</p></div><p className="text-2xl font-bold text-destructive">{criticalWaste}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Transactions</p><p className="text-2xl font-bold">{txnData.length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="inventory">
          <TabsList>
            <TabsTrigger value="inventory">Site Inventory</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
                <DialogTrigger asChild><Button disabled={!selectedProjectId}><Plus className="h-4 w-4 mr-2" />Add Item</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Site Inventory Item</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Item Code</Label><Input value={itemForm.item_code} onChange={e => setItemForm({ ...itemForm, item_code: e.target.value })} /></div>
                      <div><Label>{t('common.description')}</Label><Input value={itemForm.item_description} onChange={e => setItemForm({ ...itemForm, item_description: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><Label>BOQ Qty</Label><Input type="number" value={itemForm.boq_quantity} onChange={e => setItemForm({ ...itemForm, boq_quantity: Number(e.target.value) })} /></div>
                      <div><Label>Unit Cost</Label><Input type="number" value={itemForm.unit_cost} onChange={e => setItemForm({ ...itemForm, unit_cost: Number(e.target.value) })} /></div>
                      <div><Label>Valuation</Label>
                        <Select value={itemForm.valuation_method} onValueChange={v => setItemForm({ ...itemForm, valuation_method: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="FIFO">FIFO</SelectItem><SelectItem value="WAC">WAC</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Site Location</Label><Input value={itemForm.site_location} onChange={e => setItemForm({ ...itemForm, site_location: e.target.value })} /></div>
                    <Button onClick={handleCreateItem} className="w-full">Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>{t('common.description')}</TableHead><TableHead className="text-right">BOQ Qty</TableHead>
                  <TableHead className="text-right">Received</TableHead><TableHead className="text-right">Consumed</TableHead><TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Wastage %</TableHead><TableHead>{t('common.status')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invData.map((i: any) => {
                    const w = calculateWastage(i.boq_quantity, i.consumed_quantity);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono">{i.item_code}</TableCell>
                        <TableCell>{i.item_description}</TableCell>
                        <TableCell className="text-right">{i.boq_quantity}</TableCell>
                        <TableCell className="text-right">{i.received_quantity}</TableCell>
                        <TableCell className="text-right">{i.consumed_quantity}</TableCell>
                        <TableCell className="text-right font-semibold">{i.current_stock}</TableCell>
                        <TableCell className="text-right">{w.wastagePct.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Badge variant={w.status === 'critical' ? 'destructive' : w.status === 'warning' ? 'secondary' : 'outline'}>
                            {w.status === 'critical' ? 'Critical' : w.status === 'warning' ? 'Warning' : 'OK'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {invData.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No site inventory items</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showTxnDialog} onOpenChange={setShowTxnDialog}>
                <DialogTrigger asChild><Button disabled={!selectedProjectId}><Plus className="h-4 w-4 mr-2" />Record Transaction</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Material Transaction</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Inventory Item</Label>
                      <Select value={txnForm.site_inventory_id} onValueChange={v => setTxnForm({ ...txnForm, site_inventory_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>{invData.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.item_code} - {i.item_description}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>{t('common.type')}</Label>
                        <Select value={txnForm.txn_type} onValueChange={v => setTxnForm({ ...txnForm, txn_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="receipt">Receipt</SelectItem><SelectItem value="issue">Issue</SelectItem>
                            <SelectItem value="return">Return</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Quantity</Label><Input type="number" value={txnForm.quantity} onChange={e => setTxnForm({ ...txnForm, quantity: Number(e.target.value) })} /></div>
                    </div>
                    <div><Label>Reference Doc</Label><Input value={txnForm.reference_doc} onChange={e => setTxnForm({ ...txnForm, reference_doc: e.target.value })} /></div>
                    <Button onClick={handleCreateTxn} className="w-full">Record</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('common.date')}</TableHead><TableHead>{t('common.type')}</TableHead><TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">{t('common.total')}</TableHead><TableHead>Reference</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {txnData.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{new Date(t.txn_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {t.txn_type === 'receipt' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                          {t.txn_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{t.quantity}</TableCell>
                      <TableCell className="text-right">{(t.unit_cost || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(t.total_cost || 0).toLocaleString()}</TableCell>
                      <TableCell>{t.reference_doc}</TableCell>
                    </TableRow>
                  ))}
                  {txnData.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
