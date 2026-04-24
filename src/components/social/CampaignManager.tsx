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
import { Progress } from '@/components/ui/progress';
import { Plus, Play, Pause, BarChart3, Send, Users } from 'lucide-react';
import { useSocialCampaigns, useSocialTemplates } from '@/hooks/useSocialMessaging';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'secondary', scheduled: 'outline', sending: 'default', paused: 'outline', completed: 'default', cancelled: 'destructive',
};

export function CampaignManager() {
  const { data: campaigns = [] } = useSocialCampaigns();
  const { data: templates = [] } = useSocialTemplates();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    campaign_name: '', campaign_type: 'marketing', channel_type: 'whatsapp',
    template_id: '', custom_message: '', audience_criteria: '{}',
  });
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const handleCreate = async () => {
    if (!form.campaign_name) { toast.error('Name required'); return; }
    const { error } = await supabase.from('social_campaigns').insert({
      ...form,
      template_id: form.template_id || null,
      audience_criteria: JSON.parse(form.audience_criteria || '{}'),
      company_id: activeCompanyId,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['social-campaigns'] });
    setShowForm(false);
    toast.success('Campaign created');
  };

  const handleStatusChange = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'sending') updates.started_at = new Date().toISOString();
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    await supabase.from('social_campaigns').update(updates).eq('id', id);
    qc.invalidateQueries({ queryKey: ['social-campaigns'] });
    toast.success(`Campaign ${status}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Campaigns</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />New Campaign
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: campaigns.length, icon: BarChart3 },
          { label: 'Active', value: campaigns.filter(c => c.status === 'sending').length, icon: Play },
          { label: 'Draft', value: campaigns.filter(c => c.status === 'draft').length, icon: Send },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, icon: Users },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Channel</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Progress</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">No campaigns</TableCell></TableRow>
              ) : campaigns.map(c => {
                const pct = c.stats_targeted > 0 ? Math.round((c.stats_sent / c.stats_targeted) * 100) : 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.campaign_name}</TableCell>
                    <TableCell className="text-xs capitalize">{c.channel_type}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.campaign_type}</Badge></TableCell>
                    <TableCell><Badge variant={statusColors[c.status] as any || 'secondary'} className="text-[10px] capitalize">{c.status}</Badge></TableCell>
                    <TableCell>
                      <div className="w-24">
                        <Progress value={pct} className="h-1.5" />
                        <span className="text-[10px] text-muted-foreground">{c.stats_sent}/{c.stats_targeted}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status === 'draft' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(c.id, 'sending')}>
                            <Play className="h-3 w-3 mr-1" />Start
                          </Button>
                        )}
                        {c.status === 'sending' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(c.id, 'paused')}>
                            <Pause className="h-3 w-3 mr-1" />Pause
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Campaign Name</Label>
              <Input className="h-9" value={form.campaign_name} onChange={e => setForm({ ...form, campaign_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={form.channel_type} onValueChange={v => setForm({ ...form, channel_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.campaign_type} onValueChange={v => setForm({ ...form, campaign_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Template (optional)</Label>
              <Select value={form.template_id} onValueChange={v => setForm({ ...form, template_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Custom Message</Label>
              <Textarea className="min-h-[80px] text-sm" value={form.custom_message} onChange={e => setForm({ ...form, custom_message: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
