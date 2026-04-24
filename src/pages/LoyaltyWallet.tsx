import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLoyaltyPrograms, useLoyaltyTiers, useCustomerWallets, useLoyaltyTransactions } from '@/hooks/useLoyaltyWallet';
import { Plus, Star, Trophy, Wallet, History, Gift, Users, TrendingUp, Crown, Award, Coins } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';

export default function LoyaltyWallet() {
  const { t } = useLanguage();
  const { programs, isLoading, createProgram, updateProgram, deleteProgram } = useLoyaltyPrograms();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', points_per_currency: 1, points_expiry_days: 365, cashback_enabled: false, cashback_percent: 0, min_transaction_amount: 0 });
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  const selectedProgram = programs.find((p: any) => p.id === selectedProgramId);
  const { tiers, upsertTier } = useLoyaltyTiers(selectedProgramId || undefined);
  const { wallets } = useCustomerWallets(selectedProgramId || undefined);
  const { transactions } = useLoyaltyTransactions(selectedWalletId || undefined);

  const handleCreate = () => {
    createProgram.mutate(newProgram, {
      onSuccess: () => { setShowCreateDialog(false); setNewProgram({ name: '', points_per_currency: 1, points_expiry_days: 365, cashback_enabled: false, cashback_percent: 0, min_transaction_amount: 0 }); }
    });
  };

  const tierIcons = [Star, Award, Crown, Trophy];
  const tierColors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2'];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> Customer Loyalty Wallet</h1>
          <p className="text-muted-foreground">Manage loyalty programs, tiers, points, cashback, and customer lifetime value</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Program</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Loyalty Program</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Program Name</Label><Input value={newProgram.name} onChange={e => setNewProgram(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Gold Rewards" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Points per SAR</Label><Input type="number" value={newProgram.points_per_currency} onChange={e => setNewProgram(p => ({ ...p, points_per_currency: Number(e.target.value) }))} /></div>
                <div><Label>Expiry (days)</Label><Input type="number" value={newProgram.points_expiry_days} onChange={e => setNewProgram(p => ({ ...p, points_expiry_days: Number(e.target.value) }))} /></div>
              </div>
              <div><Label>Min Transaction Amount</Label><Input type="number" value={newProgram.min_transaction_amount} onChange={e => setNewProgram(p => ({ ...p, min_transaction_amount: Number(e.target.value) }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={newProgram.cashback_enabled} onCheckedChange={v => setNewProgram(p => ({ ...p, cashback_enabled: v }))} /><Label>Enable Cashback</Label></div>
              {newProgram.cashback_enabled && <div><Label>Cashback %</Label><Input type="number" value={newProgram.cashback_percent} onChange={e => setNewProgram(p => ({ ...p, cashback_percent: Number(e.target.value) }))} /></div>}
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!newProgram.name || createProgram.isPending}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-full bg-primary/10"><Gift className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Programs</p><p className="text-2xl font-bold">{programs.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-full bg-green-100"><Users className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Enrolled Customers</p><p className="text-2xl font-bold">{wallets.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-full bg-amber-100"><Coins className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Total Points Active</p><p className="text-2xl font-bold">{wallets.reduce((sum: number, w: any) => sum + (w.points_balance || 0), 0).toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-full bg-blue-100"><TrendingUp className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Lifetime Value</p><p className="text-2xl font-bold">{wallets.reduce((sum: number, w: any) => sum + (w.total_purchases || 0), 0).toLocaleString()} SAR</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Programs */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">Programs</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {programs.map((p: any) => (
              <div key={p.id} onClick={() => { setSelectedProgramId(p.id); setSelectedWalletId(null); }}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedProgramId === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{p.name}</span>
                  <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{p.points_per_currency} pts/SAR · Expiry: {p.points_expiry_days}d</div>
              </div>
            ))}
            {programs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No programs yet</p>}
          </CardContent>
        </Card>

        {/* Right: Details */}
        <div className="lg:col-span-3">
          {selectedProgram ? (
            <Tabs defaultValue="tiers">
              <TabsList>
                <TabsTrigger value="tiers"><Trophy className="h-4 w-4 mr-1" /> Tiers</TabsTrigger>
                <TabsTrigger value="customers"><Users className="h-4 w-4 mr-1" /> Customers</TabsTrigger>
                <TabsTrigger value="transactions"><History className="h-4 w-4 mr-1" /> Transactions</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="tiers" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Tier Levels</CardTitle>
                    <Button size="sm" onClick={() => upsertTier.mutate({ name: 'New Tier', tier_order: tiers.length, min_points: 0, earning_multiplier: 1.0 })}><Plus className="h-3 w-3 mr-1" /> Add Tier</Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {tiers.map((tier: any, i: number) => {
                        const Icon = tierIcons[Math.min(i, tierIcons.length - 1)];
                        return (
                          <Card key={tier.id} className="relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: tierColors[Math.min(i, tierColors.length - 1)] }} />
                            <CardContent className="pt-6 text-center space-y-2">
                              <Icon className="h-8 w-8 mx-auto" style={{ color: tierColors[Math.min(i, tierColors.length - 1)] }} />
                              <Input value={tier.name} className="text-center font-bold" onChange={e => upsertTier.mutate({ id: tier.id, name: e.target.value })} />
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><Label className="text-xs">Min Points</Label><Input type="number" value={tier.min_points} onChange={e => upsertTier.mutate({ id: tier.id, min_points: Number(e.target.value) })} /></div>
                                <div><Label className="text-xs">Multiplier</Label><Input type="number" step="0.1" value={tier.earning_multiplier} onChange={e => upsertTier.mutate({ id: tier.id, earning_multiplier: Number(e.target.value) })} /></div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    {tiers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Add tier levels to organize customer loyalty ranks</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customers" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Enrolled Customers ({wallets.length})</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead className="text-right">Points Balance</TableHead>
                          <TableHead className="text-right">Lifetime Points</TableHead>
                          <TableHead className="text-right">Total Purchases</TableHead>
                          <TableHead className="text-right">Purchases</TableHead>
                          <TableHead>Last Purchase</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wallets.map((w: any) => (
                          <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedWalletId(w.id)}>
                            <TableCell className="font-medium">{w.customer_name}</TableCell>
                            <TableCell>{w.customer_code}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{(w.points_balance || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{(w.lifetime_points || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{(w.total_purchases || 0).toLocaleString()} SAR</TableCell>
                            <TableCell className="text-right">{w.purchase_count || 0}</TableCell>
                            <TableCell>{w.last_purchase_at ? format(new Date(w.last_purchase_at), 'dd/MM/yyyy') : '—'}</TableCell>
                          </TableRow>
                        ))}
                        {wallets.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No enrolled customers yet. Points are earned automatically on POS sales.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">{selectedWalletId ? 'Customer Transactions' : 'Select a customer to view transactions'}</CardTitle></CardHeader>
                  <CardContent>
                    {selectedWalletId ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                            <TableHead className="text-right">Balance After</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((t: any) => (
                            <TableRow key={t.id}>
                              <TableCell>{format(new Date(t.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                              <TableCell><Badge variant={t.transaction_type === 'earn' ? 'default' : t.transaction_type === 'redeem' ? 'destructive' : 'secondary'}>{t.transaction_type}</Badge></TableCell>
                              <TableCell className={`text-right font-bold ${t.transaction_type === 'earn' ? 'text-green-600' : t.transaction_type === 'redeem' ? 'text-red-600' : ''}`}>{t.transaction_type === 'earn' ? '+' : '-'}{Math.abs(t.points)}</TableCell>
                              <TableCell className="text-right">{t.balance_after}</TableCell>
                              <TableCell>{t.source_document_number || t.source_module || '—'}</TableCell>
                              <TableCell className="text-muted-foreground">{t.description}</TableCell>
                            </TableRow>
                          ))}
                          {transactions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions yet</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    ) : <p className="text-center text-muted-foreground py-8">Click on a customer in the Customers tab to view their transaction history</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Program Settings</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Program Name</Label><Input value={selectedProgram.name} onChange={e => updateProgram.mutate({ id: selectedProgram.id, name: e.target.value })} /></div>
                      <div><Label>Points per SAR</Label><Input type="number" value={selectedProgram.points_per_currency} onChange={e => updateProgram.mutate({ id: selectedProgram.id, points_per_currency: Number(e.target.value) })} /></div>
                      <div><Label>Expiry Days</Label><Input type="number" value={selectedProgram.points_expiry_days} onChange={e => updateProgram.mutate({ id: selectedProgram.id, points_expiry_days: Number(e.target.value) })} /></div>
                      <div><Label>Min Transaction Amount</Label><Input type="number" value={selectedProgram.min_transaction_amount || 0} onChange={e => updateProgram.mutate({ id: selectedProgram.id, min_transaction_amount: Number(e.target.value) })} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={selectedProgram.cashback_enabled} onCheckedChange={v => updateProgram.mutate({ id: selectedProgram.id, cashback_enabled: v })} />
                      <Label>Enable Cashback</Label>
                    </div>
                    {selectedProgram.cashback_enabled && <div><Label>Cashback %</Label><Input type="number" value={selectedProgram.cashback_percent || 0} onChange={e => updateProgram.mutate({ id: selectedProgram.id, cashback_percent: Number(e.target.value) })} /></div>}
                    <div className="flex items-center gap-2">
                      <Switch checked={selectedProgram.is_active} onCheckedChange={v => updateProgram.mutate({ id: selectedProgram.id, is_active: v })} />
                      <Label>Program Active</Label>
                    </div>
                    <div className="pt-4 border-t"><Button variant="destructive" size="sm" onClick={() => { deleteProgram.mutate(selectedProgram.id); setSelectedProgramId(null); }}>Delete Program</Button></div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card><CardContent className="py-16 text-center text-muted-foreground"><Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>Select a loyalty program or create a new one</p></CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
