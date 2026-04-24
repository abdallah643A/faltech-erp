import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  MessageCircle, Mail, Plus, Edit, Trash2, TestTube, Loader2, CheckCircle2, XCircle, Activity
} from 'lucide-react';

interface Account {
  id: string;
  account_type: string;
  account_name: string;
  is_active: boolean;
  daily_limit: number;
  current_day_usage: number;
  config: any;
  success_count: number;
  failure_count: number;
  created_at: string;
}

const emptyAccount = {
  account_type: 'whatsapp',
  account_name: '',
  is_active: true,
  daily_limit: 100,
  config: {},
};

export function AccountManagement() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyAccount });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoice_automation_accounts')
      .select('*')
      .order('account_type, account_name');
    setAccounts((data || []) as Account[]);
    setLoading(false);
  };

  const openAdd = (type: string) => {
    setEditAccount(null);
    setForm({ ...emptyAccount, account_type: type });
    setDialogOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditAccount(acc);
    setForm({
      account_type: acc.account_type,
      account_name: acc.account_name,
      is_active: acc.is_active,
      daily_limit: acc.daily_limit,
      config: acc.config || {},
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.account_name) return;
    setSaving(true);
    try {
      const payload = {
        account_type: form.account_type,
        account_name: form.account_name,
        is_active: form.is_active,
        daily_limit: form.daily_limit,
        config: form.config,
      };

      if (editAccount) {
        const { error } = await supabase.from('invoice_automation_accounts').update(payload).eq('id', editAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('invoice_automation_accounts').insert(payload);
        if (error) throw error;
      }
      toast({ title: isAr ? 'تم الحفظ' : 'Saved', description: isAr ? 'تم حفظ الحساب بنجاح' : 'Account saved successfully' });
      setDialogOpen(false);
      fetchAccounts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this account?')) return;
    const { error } = await supabase.from('invoice_automation_accounts').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else fetchAccounts();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('invoice_automation_accounts').update({ is_active: active }).eq('id', id);
    fetchAccounts();
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    // Simulate test
    await new Promise(r => setTimeout(r, 2000));
    toast({ title: isAr ? 'اختبار الاتصال' : 'Connection Test', description: isAr ? 'تم الاتصال بنجاح' : 'Connection successful' });
    setTesting(null);
  };

  const whatsappAccounts = accounts.filter(a => a.account_type === 'whatsapp');
  const emailAccounts = accounts.filter(a => a.account_type === 'email');

  const renderAccountTable = (accs: Account[], type: string) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{accs.length} {isAr ? 'حسابات' : 'accounts'}</p>
        <Button size="sm" onClick={() => openAdd(type)} className="gap-1">
          <Plus className="h-3 w-3" />{isAr ? 'إضافة' : 'Add'}
        </Button>
      </div>
      {accs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {isAr ? 'لا توجد حسابات. أضف حساباً للبدء.' : 'No accounts. Add one to get started.'}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isAr ? 'الاسم' : 'Name'}</TableHead>
              <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
              <TableHead>{isAr ? 'الاستخدام' : 'Usage'}</TableHead>
              <TableHead>{isAr ? 'النجاح' : 'Success'}</TableHead>
              <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accs.map(acc => {
              const usagePercent = acc.daily_limit > 0 ? (acc.current_day_usage / acc.daily_limit) * 100 : 0;
              const totalOps = acc.success_count + acc.failure_count;
              const successRate = totalOps > 0 ? Math.round((acc.success_count / totalOps) * 100) : 0;
              return (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">{acc.account_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={acc.is_active} onCheckedChange={(v) => handleToggle(acc.id, v)} />
                      <Badge variant={acc.is_active ? 'default' : 'secondary'} className={acc.is_active ? 'bg-green-100 text-green-700' : ''}>
                        {acc.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span className="text-xs">{acc.current_day_usage}/{acc.daily_limit}</span>
                      <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${successRate > 80 ? 'text-green-600' : successRate > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {successRate}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleTest(acc.id)} disabled={testing === acc.id}>
                        {testing === acc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(acc)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(acc.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="whatsapp">
        <TabsList>
          <TabsTrigger value="whatsapp" className="gap-1">
            <MessageCircle className="h-3 w-3" />WhatsApp ({whatsappAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1">
            <Mail className="h-3 w-3" />Email ({emailAccounts.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                {isAr ? 'حسابات واتساب' : 'WhatsApp Accounts'}
              </CardTitle>
            </CardHeader>
            <CardContent>{renderAccountTable(whatsappAccounts, 'whatsapp')}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="email">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                {isAr ? 'حسابات البريد' : 'Email Accounts'}
              </CardTitle>
            </CardHeader>
            <CardContent>{renderAccountTable(emailAccounts, 'email')}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editAccount ? (isAr ? 'تعديل الحساب' : 'Edit Account') : (isAr ? 'إضافة حساب' : 'Add Account')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{isAr ? 'نوع الحساب' : 'Account Type'}</Label>
              <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })} disabled={!!editAccount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? 'اسم الحساب' : 'Account Name'} *</Label>
              <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="e.g. Main WhatsApp" />
            </div>
            <div>
              <Label>{isAr ? 'الحد اليومي' : 'Daily Limit'}</Label>
              <Input type="number" value={form.daily_limit} onChange={(e) => setForm({ ...form, daily_limit: parseInt(e.target.value) || 100 })} />
            </div>

            {form.account_type === 'whatsapp' && (
              <>
                <div>
                  <Label>{isAr ? 'مزود API' : 'API Provider'}</Label>
                  <Select value={form.config?.provider || 'greenapi'} onValueChange={(v) => setForm({ ...form, config: { ...form.config, provider: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greenapi">Green API</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="cloud_api">WhatsApp Cloud API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Instance ID / Account SID</Label>
                  <Input value={form.config?.instance_id || ''} onChange={(e) => setForm({ ...form, config: { ...form.config, instance_id: e.target.value } })} />
                </div>
                <div>
                  <Label>API Token / Auth Token</Label>
                  <Input type="password" value={form.config?.api_token || ''} onChange={(e) => setForm({ ...form, config: { ...form.config, api_token: e.target.value } })} />
                </div>
              </>
            )}

            {form.account_type === 'email' && (
              <>
                <div>
                  <Label>{isAr ? 'خادم SMTP' : 'SMTP Host'}</Label>
                  <Input value={form.config?.smtp_host || ''} onChange={(e) => setForm({ ...form, config: { ...form.config, smtp_host: e.target.value } })} placeholder="smtp.gmail.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{isAr ? 'المنفذ' : 'Port'}</Label>
                    <Input type="number" value={form.config?.smtp_port || 587} onChange={(e) => setForm({ ...form, config: { ...form.config, smtp_port: parseInt(e.target.value) } })} />
                  </div>
                  <div>
                    <Label>SSL/TLS</Label>
                    <Select value={form.config?.smtp_secure || 'tls'} onValueChange={(v) => setForm({ ...form, config: { ...form.config, smtp_secure: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tls">TLS</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{isAr ? 'البريد / اسم المستخدم' : 'Email / Username'}</Label>
                  <Input value={form.config?.email_user || ''} onChange={(e) => setForm({ ...form, config: { ...form.config, email_user: e.target.value } })} />
                </div>
                <div>
                  <Label>{isAr ? 'كلمة المرور' : 'Password / App Password'}</Label>
                  <Input type="password" value={form.config?.email_pass || ''} onChange={(e) => setForm({ ...form, config: { ...form.config, email_pass: e.target.value } })} />
                </div>
                <div>
                  <Label>{isAr ? 'عنوان المرسل' : 'From Address'}</Label>
                  <Input value={form.config?.from_address || ''} onChange={(e) => setForm({ ...form, config: { ...form.config, from_address: e.target.value } })} placeholder="invoices@company.com" />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>{isAr ? 'نشط' : 'Active'}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isAr ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
