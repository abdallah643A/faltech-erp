import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Settings, Phone, Bot, MessageSquare, Facebook, Instagram, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { useSocialChannels } from '@/hooks/useSocialMessaging';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const channelConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  whatsapp: { icon: Phone, label: 'WhatsApp Business', color: 'text-green-500' },
  telegram: { icon: Bot, label: 'Telegram', color: 'text-blue-500' },
  sms: { icon: Phone, label: 'SMS Gateway', color: 'text-orange-500' },
  facebook: { icon: Facebook, label: 'Facebook Messenger', color: 'text-blue-600' },
  instagram: { icon: Instagram, label: 'Instagram Direct', color: 'text-pink-500' },
  email: { icon: Mail, label: 'Email', color: 'text-muted-foreground' },
  webhook: { icon: MessageSquare, label: 'Custom Webhook', color: 'text-purple-500' },
};

export function ChannelSettings() {
  const { data: channels = [] } = useSocialChannels();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ channel_type: 'whatsapp', channel_name: '', default_sender: '' });
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const handleCreate = async () => {
    if (!form.channel_name) { toast.error('Channel name required'); return; }
    const { error } = await supabase.from('social_channels').insert({
      ...form,
      company_id: activeCompanyId,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['social-channels'] });
    setShowForm(false);
    toast.success('Channel added');
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('social_channels').update({ is_active: !active }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['social-channels'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Channel Configuration</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />Add Channel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No channels configured. Add your first messaging channel.</p>
            </CardContent>
          </Card>
        ) : channels.map(ch => {
          const config = channelConfig[ch.channel_type] || channelConfig.webhook;
          const Icon = config.icon;
          return (
            <Card key={ch.id}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <CardTitle className="text-sm">{ch.channel_name}</CardTitle>
                  </div>
                  {ch.is_active ? (
                    <Badge variant="default" className="text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <p className="text-xs text-muted-foreground">{config.label}</p>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Inbound:</span>
                    {ch.is_inbound_enabled ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Outbound:</span>
                    {ch.is_outbound_enabled ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </div>
                <div className="flex gap-1 pt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => toggleActive(ch.id, ch.is_active)}>
                    {ch.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Settings className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Available Channels (not yet configured) */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Available Channels</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(channelConfig).map(([type, cfg]) => {
              const isConfigured = channels.some(c => c.channel_type === type);
              return (
                <div key={type} className={`flex items-center gap-2 p-3 rounded-lg border ${isConfigured ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/50 cursor-pointer'}`}
                  onClick={() => {
                    if (!isConfigured) {
                      setForm({ channel_type: type, channel_name: cfg.label, default_sender: '' });
                      setShowForm(true);
                    }
                  }}>
                  <cfg.icon className={`h-5 w-5 ${cfg.color}`} />
                  <div>
                    <p className="text-xs font-medium">{cfg.label}</p>
                    {isConfigured && <span className="text-[10px] text-muted-foreground">Configured</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Channel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Channel Type</Label>
              <Select value={form.channel_type} onValueChange={v => setForm({ ...form, channel_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(channelConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Display Name</Label>
              <Input className="h-9" value={form.channel_name} onChange={e => setForm({ ...form, channel_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Default Sender (phone/handle)</Label>
              <Input className="h-9" value={form.default_sender} onChange={e => setForm({ ...form, default_sender: e.target.value })} placeholder="+966..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Add Channel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
