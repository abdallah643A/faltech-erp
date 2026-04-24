import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useSocialTemplates } from '@/hooks/useSocialMessaging';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const categories = ['sales', 'collections', 'service', 'marketing', 'logistics', 'reminders', 'general'];
const channelTypes = ['all', 'whatsapp', 'telegram', 'sms', 'email'];
const variables = [
  '{{customer_name}}', '{{document_number}}', '{{document_date}}', '{{due_date}}',
  '{{amount}}', '{{currency}}', '{{salesperson}}', '{{branch}}', '{{company_name}}',
];

export function TemplateManager() {
  const { data: templates = [] } = useSocialTemplates();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ template_name: '', category: 'general', channel_type: 'all', body_text: '', subject: '' });
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const handleSave = async () => {
    if (!form.template_name || !form.body_text) { toast.error('Name and body required'); return; }
    const payload = {
      ...form,
      channel_type: form.channel_type === 'all' ? null : form.channel_type,
      company_id: activeCompanyId,
      created_by: user?.id,
      variables: variables.filter(v => form.body_text.includes(v)).map(v => ({ key: v, label: v.replace(/[{}]/g, '') })),
    };

    if (editId) {
      const { error } = await supabase.from('social_templates').update(payload).eq('id', editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('social_templates').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    qc.invalidateQueries({ queryKey: ['social-templates'] });
    setShowForm(false);
    setEditId(null);
    setForm({ template_name: '', category: 'general', channel_type: 'all', body_text: '', subject: '' });
    toast.success(editId ? 'Template updated' : 'Template created');
  };

  const handleEdit = (t: any) => {
    setEditId(t.id);
    setForm({ template_name: t.template_name, category: t.category, channel_type: t.channel_type || 'all', body_text: t.body_text, subject: t.subject || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('social_templates').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['social-templates'] });
    toast.success('Template deleted');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Message Templates</h2>
        <Button size="sm" onClick={() => { setEditId(null); setForm({ template_name: '', category: 'general', channel_type: 'all', body_text: '', subject: '' }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />New Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Channel</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">No templates yet</TableCell></TableRow>
              ) : templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs font-medium">{t.template_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge></TableCell>
                  <TableCell className="text-xs capitalize">{t.channel_type || 'All'}</TableCell>
                  <TableCell><Badge variant={t.approval_status === 'approved' ? 'default' : 'secondary'} className="text-[10px] capitalize">{t.approval_status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(t)}><Edit className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Template Name</Label>
              <Input className="h-9" value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={form.channel_type} onValueChange={v => setForm({ ...form, channel_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{channelTypes.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Subject (optional)</Label>
              <Input className="h-9" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Body</Label>
              <Textarea className="min-h-[120px] text-sm" value={form.body_text} onChange={e => setForm({ ...form, body_text: e.target.value })} placeholder="Dear {{customer_name}},&#10;&#10;Your invoice {{document_number}} is due on {{due_date}}..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Available variables:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {variables.map(v => (
                  <Badge key={v} variant="outline" className="text-[10px] cursor-pointer hover:bg-accent"
                    onClick={() => setForm({ ...form, body_text: form.body_text + v })}>{v}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
