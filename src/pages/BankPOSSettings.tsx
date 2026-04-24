import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useBankPOS } from '@/hooks/useBankPOS';
import BankPOSPaymentDialog from '@/components/pos/BankPOSPaymentDialog';
import CPMSQuickSteps from '@/components/cpms/CPMSQuickSteps';
import { Smartphone, Plus, RefreshCw, Settings, CreditCard, CheckCircle2, XCircle, Clock, Wifi, WifiOff, Trash2, TestTube, Activity, Signal } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800', declined: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800', cancelled: 'bg-muted text-muted-foreground',
};
const healthColors: Record<string, string> = { healthy: 'text-green-600', degraded: 'text-yellow-600', error: 'text-red-600', unknown: 'text-muted-foreground' };
const connectionColors: Record<string, string> = { online: 'text-green-600', offline: 'text-red-600', unknown: 'text-muted-foreground' };

const POS_STEPS = [
  { step: 1, title: 'Configure Terminals', titleAr: 'إعداد الأجهزة', description: 'Register POS terminals with IDs, names, providers, and locations.' },
  { step: 2, title: 'Set Provider Credentials', titleAr: 'إعداد بيانات المزود', description: 'Enter API credentials for your payment provider (or use Mock mode).' },
  { step: 3, title: 'Initiate Payment', titleAr: 'بدء الدفع', description: 'From POS checkout, click "Send to POS" to push amount to terminal.' },
  { step: 4, title: 'Customer Taps Card', titleAr: 'العميل يمرر البطاقة', description: 'Customer presents their card on the POS machine.' },
  { step: 5, title: 'Auto-Record Payment', titleAr: 'تسجيل تلقائي', description: 'Approved transactions are recorded with full details and reconciliation data.' },
];

export default function BankPOSSettings() {
  const { t, language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const { toast } = useToast();
  const { pingTerminal } = useBankPOS();
  const [terminals, setTerminals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showTerminalForm, setShowTerminalForm] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [terminalForm, setTerminalForm] = useState({
    terminal_id: '', terminal_name: '', location: '', provider: 'geidea', is_mock: true, is_active: true, default_currency: 'SAR', cashier_station: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [termRes, txnRes, settRes] = await Promise.all([
      supabase.from('bank_pos_terminals').select('*').order('terminal_name'),
      supabase.from('bank_pos_payments').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('bank_pos_settings').select('*'),
    ]);
    setTerminals((termRes.data || []) as any[]);
    setTransactions((txnRes.data || []) as any[]);
    const s: Record<string, string> = {};
    ((settRes.data || []) as any[]).forEach((r: any) => { s[r.setting_key] = r.setting_value || ''; });
    setSettings(s);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const updateSetting = async (key: string, value: string) => {
    await supabase.from('bank_pos_settings').update({ setting_value: value, updated_at: new Date().toISOString() } as any).eq('setting_key', key);
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({ title: 'Setting updated' });
  };

  const saveTerminal = async () => {
    const { error } = await supabase.from('bank_pos_terminals').insert(terminalForm as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Terminal added' });
    setShowTerminalForm(false);
    setTerminalForm({ terminal_id: '', terminal_name: '', location: '', provider: 'geidea', is_mock: true, is_active: true, default_currency: 'SAR', cashier_station: '' });
    await loadData();
  };

  const deleteTerminal = async (id: string) => {
    await supabase.from('bank_pos_terminals').delete().eq('id', id);
    toast({ title: 'Terminal deleted' });
    await loadData();
  };

  return (
    <div className="space-y-6 page-enter">
      <CPMSQuickSteps moduleName="Bank POS Terminal Management" moduleNameAr="إدارة أجهزة نقاط البيع" steps={POS_STEPS}
        tips={['Use Mock mode for testing.', 'Each terminal needs a unique Terminal ID.', 'Multiple providers supported: Geidea, HyperPay, mada.']}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Smartphone className="h-7 w-7 text-primary" />{lang === 'ar' ? 'إدارة أجهزة نقاط البيع' : 'Bank POS Terminal Management'}</h1>
          <p className="text-muted-foreground">{lang === 'ar' ? 'إدارة الأجهزة والمعاملات' : 'Manage terminals, providers, and transactions'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTestDialog(true)}><TestTube className="h-4 w-4 mr-1" /> Test Payment</Button>
          <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
        </div>
      </div>

      <Tabs defaultValue="terminals">
        <TabsList>
          <TabsTrigger value="terminals" className="gap-1"><Smartphone className="h-4 w-4" /> Terminals</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1"><CreditCard className="h-4 w-4" /> Transactions</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="terminals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{lang === 'ar' ? 'الأجهزة المسجلة' : 'Registered Terminals'}</CardTitle>
              <Button size="sm" onClick={() => setShowTerminalForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Terminal</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Terminal ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Location / Station</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Connection</TableHead>
                    <TableHead>Last Transaction</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terminals.map((tr: any) => (
                    <TableRow key={tr.id}>
                      <TableCell className="font-mono text-sm">{tr.terminal_id}</TableCell>
                      <TableCell>{tr.terminal_name}</TableCell>
                      <TableCell><Badge variant="outline">{tr.provider}</Badge></TableCell>
                      <TableCell>{tr.location || '-'}{tr.cashier_station && <span className="text-xs text-muted-foreground ml-1">({tr.cashier_station})</span>}</TableCell>
                      <TableCell><Badge variant={tr.is_mock ? 'secondary' : 'default'}>{tr.is_mock ? 'Mock' : 'Live'}</Badge></TableCell>
                      <TableCell><span className={`flex items-center gap-1 text-xs ${healthColors[tr.terminal_health || 'unknown']}`}><Activity className="h-3 w-3" />{tr.terminal_health || 'unknown'}</span></TableCell>
                      <TableCell><span className={`flex items-center gap-1 text-xs ${connectionColors[tr.connection_status || 'unknown']}`}>{tr.connection_status === 'online' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{tr.connection_status || 'unknown'}</span></TableCell>
                      <TableCell className="text-xs">{tr.last_transaction_at ? formatDistanceToNow(new Date(tr.last_transaction_at), { addSuffix: true }) : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => pingTerminal(tr.id)} title="Ping"><Signal className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTerminal(tr.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent POS Transactions</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Amount</TableHead>
                      <TableHead>Card</TableHead><TableHead>Auth Code</TableHead><TableHead>Provider</TableHead>
                      <TableHead>Source</TableHead><TableHead>Recon</TableHead><TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No transactions yet</TableCell></TableRow>
                    ) : transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">{format(new Date(tx.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">{tx.transaction_ref}</TableCell>
                        <TableCell className="font-semibold">{Number(tx.amount).toLocaleString()} {tx.currency}</TableCell>
                        <TableCell>{tx.card_type && <span className="text-xs">{tx.card_type} ****{tx.card_last_four}</span>}</TableCell>
                        <TableCell className="font-mono text-xs">{tx.auth_code || '-'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{tx.provider || 'geidea'}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{tx.source_module}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{tx.reconciliation_status || 'unreconciled'}</Badge></TableCell>
                        <TableCell><Badge className={statusColors[tx.status] || ''}>{tx.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle className="text-base">Provider API Configuration</CardTitle><CardDescription>Configure API credentials for live mode. Mock mode works without credentials.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div><p className="font-medium">API Mode</p><p className="text-xs text-muted-foreground">Switch between Mock (testing) and Live (production)</p></div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{settings.geidea_mode === 'live' ? 'Live' : 'Mock'}</span>
                  <Switch checked={settings.geidea_mode === 'live'} onCheckedChange={(checked) => updateSetting('geidea_mode', checked ? 'live' : 'mock')} />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Merchant ID</Label><Input value={settings.geidea_merchant_id || ''} onChange={e => setSettings(s => ({ ...s, geidea_merchant_id: e.target.value }))} onBlur={() => updateSetting('geidea_merchant_id', settings.geidea_merchant_id)} placeholder="Enter Merchant ID" /></div>
                <div className="space-y-2"><Label>API Key</Label><Input type="password" value={settings.geidea_api_key || ''} onChange={e => setSettings(s => ({ ...s, geidea_api_key: e.target.value }))} onBlur={() => updateSetting('geidea_api_key', settings.geidea_api_key)} placeholder="Enter API Key" /></div>
                <div className="space-y-2"><Label>API Password</Label><Input type="password" value={settings.geidea_api_password || ''} onChange={e => setSettings(s => ({ ...s, geidea_api_password: e.target.value }))} onBlur={() => updateSetting('geidea_api_password', settings.geidea_api_password)} placeholder="Enter API Password" /></div>
                <div className="space-y-2"><Label>Base URL</Label><Input value={settings.geidea_base_url || ''} onChange={e => setSettings(s => ({ ...s, geidea_base_url: e.target.value }))} onBlur={() => updateSetting('geidea_base_url', settings.geidea_base_url)} /></div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Default Terminal</Label><Select value={settings.default_terminal_id || ''} onValueChange={v => updateSetting('default_terminal_id', v)}><SelectTrigger><SelectValue placeholder="Select default terminal" /></SelectTrigger><SelectContent>{terminals.map((t: any) => <SelectItem key={t.terminal_id} value={t.terminal_id}>{t.terminal_name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Payment Timeout (seconds)</Label><Input type="number" value={settings.payment_timeout_seconds || '120'} onChange={e => setSettings(s => ({ ...s, payment_timeout_seconds: e.target.value }))} onBlur={() => updateSetting('payment_timeout_seconds', settings.payment_timeout_seconds)} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Terminal Dialog */}
      <Dialog open={showTerminalForm} onOpenChange={setShowTerminalForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add POS Terminal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Terminal ID</Label><Input value={terminalForm.terminal_id} onChange={e => setTerminalForm(f => ({ ...f, terminal_id: e.target.value }))} placeholder="e.g., GD-001" /></div>
              <div className="space-y-2"><Label>Terminal Name</Label><Input value={terminalForm.terminal_name} onChange={e => setTerminalForm(f => ({ ...f, terminal_name: e.target.value }))} placeholder="e.g., Reception" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Provider</Label><Select value={terminalForm.provider} onValueChange={v => setTerminalForm(f => ({ ...f, provider: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="geidea">Geidea</SelectItem><SelectItem value="hyperpay">HyperPay</SelectItem><SelectItem value="mada">mada</SelectItem><SelectItem value="generic">Generic</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Default Currency</Label><Select value={terminalForm.default_currency} onValueChange={v => setTerminalForm(f => ({ ...f, default_currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SAR">SAR</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="AED">AED</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={terminalForm.location} onChange={e => setTerminalForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Main Office" /></div>
              <div className="space-y-2"><Label>Cashier Station</Label><Input value={terminalForm.cashier_station} onChange={e => setTerminalForm(f => ({ ...f, cashier_station: e.target.value }))} placeholder="e.g., Counter 1" /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={terminalForm.is_mock} onCheckedChange={v => setTerminalForm(f => ({ ...f, is_mock: v }))} /><Label>Mock Mode</Label></div>
              <div className="flex items-center gap-2"><Switch checked={terminalForm.is_active} onCheckedChange={v => setTerminalForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
            </div>
            <Button onClick={saveTerminal} className="w-full">Save Terminal</Button>
          </div>
        </DialogContent>
      </Dialog>

      <BankPOSPaymentDialog open={showTestDialog} onOpenChange={setShowTestDialog} amount={100} sourceModule="test" customerName="Test Customer" sourceDocumentNumber="TEST-001" onPaymentComplete={() => loadData()} />
    </div>
  );
}
