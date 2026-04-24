import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAlerts, SAPAlert } from '@/hooks/useAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Bell, BellRing, Plus, Trash2, Eye, EyeOff, CheckCircle, XCircle, Loader2, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const CATEGORIES = ['general', 'inventory', 'finance', 'sales', 'procurement', 'hr'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const FREQUENCIES = ['realtime', 'daily', 'weekly'];
const OPERATORS = [
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
  { value: 'contains', label: 'Contains' },
];
const ENTITIES = ['business_partners', 'items', 'sales_orders', 'ar_invoices', 'incoming_payments', 'leads', 'opportunities', 'inventory_transactions'];

const priorityIcon = (p: string) => {
  switch (p) {
    case 'critical': return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'medium': return <Info className="h-4 w-4 text-blue-500" />;
    default: return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

const priorityColor = (p: string) => {
  switch (p) {
    case 'critical': return 'destructive';
    case 'high': return 'default';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

export default function AlertsManagement() {
  const { language } = useLanguage();
  const {
    alertRules, loadingRules,
    alertInstances, loadingInstances,
    newCount,
    createRule, updateRule, deleteRule,
    acknowledgeInstance, dismissInstance,
  } = useAlerts();

  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<SAPAlert> | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [form, setForm] = useState({
    alert_name: '',
    alert_type: 'threshold',
    category: 'general',
    priority: 'medium',
    condition_field: '',
    condition_operator: 'gt',
    condition_value: '',
    target_entity: '',
    message_template: '',
    frequency: 'realtime',
    is_active: true,
  });

  const openNew = () => {
    setEditingRule(null);
    setForm({
      alert_name: '', alert_type: 'threshold', category: 'general', priority: 'medium',
      condition_field: '', condition_operator: 'gt', condition_value: '',
      target_entity: '', message_template: '', frequency: 'realtime', is_active: true,
    });
    setShowDialog(true);
  };

  const openEdit = (rule: SAPAlert) => {
    setEditingRule(rule);
    setForm({
      alert_name: rule.alert_name,
      alert_type: rule.alert_type,
      category: rule.category,
      priority: rule.priority,
      condition_field: rule.condition_field || '',
      condition_operator: rule.condition_operator || 'gt',
      condition_value: rule.condition_value || '',
      target_entity: rule.target_entity || '',
      message_template: rule.message_template || '',
      frequency: rule.frequency,
      is_active: rule.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editingRule?.id) {
      updateRule.mutate({ id: editingRule.id, ...form });
    } else {
      createRule.mutate(form);
    }
    setShowDialog(false);
  };

  const filteredInstances = alertInstances.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" />
            {language === 'ar' ? 'إدارة التنبيهات' : 'Alerts Management'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تنبيهات نظام SAP B1 - القواعد والإشعارات' : 'SAP B1-style system alerts — rules & notifications'}
          </p>
        </div>
        {newCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {newCount} {language === 'ar' ? 'تنبيه جديد' : 'new alerts'}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="instances">
        <TabsList>
          <TabsTrigger value="instances" className="gap-2">
            <Bell className="h-4 w-4" />
            {language === 'ar' ? 'التنبيهات' : 'Alert Inbox'} {newCount > 0 && `(${newCount})`}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <BellRing className="h-4 w-4" />
            {language === 'ar' ? 'القواعد' : 'Alert Rules'}
          </TabsTrigger>
        </TabsList>

        {/* ALERT INBOX */}
        <TabsContent value="instances">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All Status'}</SelectItem>
                    <SelectItem value="new">{language === 'ar' ? 'جديد' : 'New'}</SelectItem>
                    <SelectItem value="acknowledged">{language === 'ar' ? 'تم الاطلاع' : 'Acknowledged'}</SelectItem>
                    <SelectItem value="dismissed">{language === 'ar' ? 'تم التجاهل' : 'Dismissed'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All Categories'}</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="secondary">{filteredInstances.length} {language === 'ar' ? 'تنبيه' : 'alerts'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingInstances ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
              ) : filteredInstances.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  {language === 'ar' ? 'لا توجد تنبيهات' : 'No alerts to display'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredInstances.map((inst) => (
                    <div key={inst.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${inst.status === 'new' ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                      {priorityIcon(inst.priority)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{inst.title}</span>
                          <Badge variant={priorityColor(inst.priority) as any} className="text-[10px]">{inst.priority}</Badge>
                          <Badge variant="outline" className="text-[10px]">{inst.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{inst.message}</p>
                        <span className="text-[10px] text-muted-foreground">{new Date(inst.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-1">
                        {inst.status === 'new' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Acknowledge" onClick={() => acknowledgeInstance.mutate(inst.id)}>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Dismiss" onClick={() => dismissInstance.mutate(inst.id)}>
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALERT RULES */}
        <TabsContent value="rules">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">{language === 'ar' ? 'قواعد التنبيهات' : 'Alert Rules'}</CardTitle>
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'إضافة قاعدة' : 'Add Rule'}</Button>
            </CardHeader>
            <CardContent>
              {loadingRules ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : alertRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد قواعد' : 'No alert rules configured'}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التكرار' : 'Frequency'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertRules.map((rule) => (
                      <TableRow key={rule.id} className="cursor-pointer" onClick={() => openEdit(rule)}>
                        <TableCell className="font-medium">{rule.alert_name}</TableCell>
                        <TableCell><Badge variant="outline">{rule.alert_type}</Badge></TableCell>
                        <TableCell>{rule.category}</TableCell>
                        <TableCell><Badge variant={priorityColor(rule.priority) as any}>{rule.priority}</Badge></TableCell>
                        <TableCell>{rule.is_active ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TableCell>
                        <TableCell>{rule.frequency}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteRule.mutate(rule.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RULE DIALOG */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? (language === 'ar' ? 'تعديل قاعدة' : 'Edit Alert Rule') : (language === 'ar' ? 'إضافة قاعدة' : 'New Alert Rule')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.alert_name} onChange={e => setForm(f => ({ ...f, alert_name: e.target.value }))} /></div>
              <div><Label>Type</Label>
                <Select value={form.alert_type} onValueChange={v => setForm(f => ({ ...f, alert_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="threshold">Threshold</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Target Entity</Label>
              <Select value={form.target_entity} onValueChange={v => setForm(f => ({ ...f, target_entity: v }))}>
                <SelectTrigger><SelectValue placeholder="Select entity..." /></SelectTrigger>
                <SelectContent>{ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Field</Label><Input value={form.condition_field} onChange={e => setForm(f => ({ ...f, condition_field: e.target.value }))} placeholder="e.g. quantity" /></div>
              <div><Label>Operator</Label>
                <Select value={form.condition_operator} onValueChange={v => setForm(f => ({ ...f, condition_operator: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input value={form.condition_value} onChange={e => setForm(f => ({ ...f, condition_value: e.target.value }))} /></div>
            </div>
            <div><Label>Message Template</Label><Textarea value={form.message_template} onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))} placeholder="Use {{field}} for dynamic values" rows={2} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.alert_name}>{editingRule ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
