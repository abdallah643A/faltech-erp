import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Settings, Trash2, Edit, GripVertical } from 'lucide-react';

export default function ECMMetadataTemplates() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', document_type: '', department: '', description: '' });

  const { data: templates = [] } = useQuery({
    queryKey: ['ecm-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_metadata_templates').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ecm_metadata_templates').insert({
        ...form, created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecm-templates'] });
      toast.success('Template created');
      setShowNew(false);
      setForm({ name: '', document_type: '', department: '', description: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metadata Templates</h1>
          <p className="text-sm text-muted-foreground">Configure metadata fields per document type</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> New Template</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <Card key={t.id} className="border-border hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{t.description || 'No description'}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {t.document_type && <Badge variant="outline">{t.document_type}</Badge>}
                {t.department && <Badge variant="outline">{t.department}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <Card className="col-span-full border-dashed border-2">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No metadata templates yet</p>
              <Button variant="link" onClick={() => setShowNew(true)}>Create your first template</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Metadata Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Template Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={v => setForm(p => ({ ...p, document_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['general', 'contract', 'invoice', 'policy', 'report', 'letter', 'memo'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['Finance', 'HR', 'Legal', 'Procurement', 'Projects'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => create.mutate()} disabled={!form.name}>Create Template</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
