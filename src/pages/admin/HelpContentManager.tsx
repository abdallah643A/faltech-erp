import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Video, BookOpen, Eye } from 'lucide-react';

interface HelpContent {
  id: string;
  page_key: string;
  page_route: string;
  title_en: string;
  title_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  bullets_en: string[];
  bullets_ar: string[];
  video_url: string | null;
  video_duration_seconds: number | null;
  documentation_url: string | null;
  auto_popup_enabled: boolean;
  is_active: boolean;
  last_updated_at: string;
}

const emptyForm = {
  page_key: '',
  page_route: '',
  title_en: '',
  title_ar: '',
  description_en: '',
  description_ar: '',
  bullets_en: '',
  bullets_ar: '',
  video_url: '',
  video_duration_seconds: '',
  documentation_url: '',
  auto_popup_enabled: true,
  is_active: true,
};

export default function HelpContentManager() {
  const [items, setItems] = useState<HelpContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [viewStats, setViewStats] = useState<{ page_key: string; watched: number; dismissed: number }[]>([]);
  const [showStats, setShowStats] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('page_help_content').select('*').order('page_key');
    setItems((data as HelpContent[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleEdit = (item: HelpContent) => {
    setEditingId(item.id);
    setForm({
      page_key: item.page_key,
      page_route: item.page_route,
      title_en: item.title_en,
      title_ar: item.title_ar || '',
      description_en: item.description_en || '',
      description_ar: item.description_ar || '',
      bullets_en: (item.bullets_en || []).join('\n'),
      bullets_ar: (item.bullets_ar || []).join('\n'),
      video_url: item.video_url || '',
      video_duration_seconds: item.video_duration_seconds?.toString() || '',
      documentation_url: item.documentation_url || '',
      auto_popup_enabled: item.auto_popup_enabled,
      is_active: item.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = {
      page_key: form.page_key,
      page_route: form.page_route,
      title_en: form.title_en,
      title_ar: form.title_ar || null,
      description_en: form.description_en || null,
      description_ar: form.description_ar || null,
      bullets_en: form.bullets_en.split('\n').filter(Boolean),
      bullets_ar: form.bullets_ar.split('\n').filter(Boolean),
      video_url: form.video_url || null,
      video_duration_seconds: form.video_duration_seconds ? parseInt(form.video_duration_seconds) : null,
      documentation_url: form.documentation_url || null,
      auto_popup_enabled: form.auto_popup_enabled,
      is_active: form.is_active,
      last_updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from('page_help_content').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success('Help content updated');
    } else {
      const { error } = await supabase.from('page_help_content').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Help content created');
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this help content?')) return;
    await supabase.from('page_help_content').delete().eq('id', id);
    toast.success('Deleted');
    fetchItems();
  };

  const fetchStats = async () => {
    const { data } = await supabase.from('user_help_preferences').select('page_key, video_watched, dont_show_again');
    if (!data) return;
    const map: Record<string, { watched: number; dismissed: number }> = {};
    (data as any[]).forEach(r => {
      if (!map[r.page_key]) map[r.page_key] = { watched: 0, dismissed: 0 };
      if (r.video_watched) map[r.page_key].watched++;
      if (r.dont_show_again) map[r.page_key].dismissed++;
    });
    setViewStats(Object.entries(map).map(([page_key, v]) => ({ page_key, ...v })));
    setShowStats(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Help Content Manager</h1>
          <p className="text-sm text-muted-foreground">Manage page help guides, videos, and descriptions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <Eye className="h-4 w-4 mr-1" /> View Stats
          </Button>
          <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Help Content
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page Key</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Title (EN)</TableHead>
                <TableHead>Video</TableHead>
                <TableHead>Auto Popup</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.page_key}</TableCell>
                  <TableCell className="font-mono text-xs">{item.page_route}</TableCell>
                  <TableCell>{item.title_en}</TableCell>
                  <TableCell>
                    {item.video_url ? <Badge variant="secondary"><Video className="h-3 w-3 mr-1" /> Yes</Badge> : <span className="text-muted-foreground text-xs">None</span>}
                  </TableCell>
                  <TableCell><Badge variant={item.auto_popup_enabled ? 'default' : 'outline'}>{item.auto_popup_enabled ? 'On' : 'Off'}</Badge></TableCell>
                  <TableCell><Badge variant={item.is_active ? 'default' : 'destructive'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No help content yet. Click "Add Help Content" to create your first guide.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} Help Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Page Key *</Label>
                <Input value={form.page_key} onChange={e => setForm(f => ({ ...f, page_key: e.target.value }))} placeholder="e.g. cpms-schedule-planning" />
              </div>
              <div>
                <Label>Page Route *</Label>
                <Input value={form.page_route} onChange={e => setForm(f => ({ ...f, page_route: e.target.value }))} placeholder="e.g. /cpms/schedule-planning" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title (English) *</Label>
                <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} />
              </div>
              <div>
                <Label>Title (Arabic)</Label>
                <Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Description (English)</Label>
                <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Description (Arabic)</Label>
                <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Key Actions (English, one per line)</Label>
                <Textarea value={form.bullets_en} onChange={e => setForm(f => ({ ...f, bullets_en: e.target.value }))} rows={4} placeholder="Create phases and WBS&#10;Set planned dates&#10;Monitor progress" />
              </div>
              <div>
                <Label>Key Actions (Arabic, one per line)</Label>
                <Textarea value={form.bullets_ar} onChange={e => setForm(f => ({ ...f, bullets_ar: e.target.value }))} rows={4} dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Video URL (YouTube or embed)</Label>
                <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <div>
                <Label>Video Duration (seconds)</Label>
                <Input type="number" value={form.video_duration_seconds} onChange={e => setForm(f => ({ ...f, video_duration_seconds: e.target.value }))} placeholder="180" />
              </div>
            </div>
            <div>
              <Label>Documentation / FAQ URL</Label>
              <Input value={form.documentation_url} onChange={e => setForm(f => ({ ...f, documentation_url: e.target.value }))} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.auto_popup_enabled} onCheckedChange={v => setForm(f => ({ ...f, auto_popup_enabled: v }))} />
                <Label>Auto Popup</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.page_key || !form.page_route || !form.title_en}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help Guide Watch Stats</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Videos Watched</TableHead>
                <TableHead>Dismissed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewStats.map(s => (
                <TableRow key={s.page_key}>
                  <TableCell className="font-mono text-xs">{s.page_key}</TableCell>
                  <TableCell><Badge variant="secondary">{s.watched}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{s.dismissed}</Badge></TableCell>
                </TableRow>
              ))}
              {viewStats.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No data yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
