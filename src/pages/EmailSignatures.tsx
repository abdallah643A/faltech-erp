import { useState } from 'react';
import DOMPurify from 'dompurify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Star, PenLine, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EmailSignatures() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [previewSig, setPreviewSig] = useState<any>(null);
  const [form, setForm] = useState({ name: 'Default', signature_html: '', is_default: false });

  const { data: signatures = [] } = useQuery({
    queryKey: ['email-signatures', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_signatures').select('*').eq('user_id', user!.id).order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, user_id: user!.id };
      if (form.is_default) {
        await supabase.from('email_signatures').update({ is_default: false }).eq('user_id', user!.id);
      }
      if (editing) {
        const { error } = await supabase.from('email_signatures').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_signatures').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
      setShowDialog(false);
      setEditing(null);
      toast({ title: editing ? 'Signature updated' : 'Signature created' });
    },
  });

  const deleteSig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_signatures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
      toast({ title: 'Signature deleted' });
    },
  });

  const openEdit = (sig: any) => {
    setEditing(sig);
    setForm({ name: sig.name, signature_html: sig.signature_html, is_default: sig.is_default });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Signatures</h1>
          <p className="text-muted-foreground">Manage your email signatures for templates</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', signature_html: '', is_default: false }); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />New Signature
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {signatures.map((sig: any) => (
          <Card key={sig.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{sig.name}</CardTitle>
                  {sig.is_default && <Badge variant="default" className="gap-1"><Star className="h-3 w-3" />Default</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setPreviewSig(sig); setShowPreview(true); }}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(sig)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteSig.mutate(sig.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground border rounded p-3 bg-muted/30 max-h-24 overflow-hidden" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sig.signature_html || '<em>No content</em>') }} />
            </CardContent>
          </Card>
        ))}
        {signatures.length === 0 && (
          <Card className="col-span-2"><CardContent className="py-12 text-center text-muted-foreground">
            No signatures yet. Create your first email signature.
          </CardContent></Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit Signature' : 'New Signature'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.name')}</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Work Signature" />
              </div>
              <div className="space-y-2 flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_default} onCheckedChange={v => setForm(p => ({ ...p, is_default: v }))} />
                  <Label>Set as default</Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Signature (HTML)</Label>
              <Textarea value={form.signature_html} onChange={e => setForm(p => ({ ...p, signature_html: e.target.value }))} rows={8} className="font-mono text-sm" placeholder='<p>Best regards,<br/><strong>John Doe</strong><br/>Sales Manager</p>' />
            </div>
            {form.signature_html && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded p-3 bg-muted/30" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.signature_html) }} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader><DialogTitle>Preview: {previewSig?.name}</DialogTitle></DialogHeader>
          <div className="border rounded p-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewSig?.signature_html || '') }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
