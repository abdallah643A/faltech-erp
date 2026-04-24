import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface BP { id: string; card_name: string; card_code?: string; }
interface Link { id: string; parent_bp_id: string; child_bp_id: string; relationship_type: string; ownership_percent?: number; }

export default function CRMAccountHierarchy() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Link>>({ relationship_type: 'subsidiary' });
  const [search, setSearch] = useState('');

  const { data: bps = [] } = useQuery({
    queryKey: ['bps-for-hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_partners').select('id, card_name, card_code').limit(2000);
      if (error) throw error;
      return (data ?? []) as BP[];
    },
  });

  const { data: links = [] } = useQuery({
    queryKey: ['account-hierarchies'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('crm_account_hierarchies' as any).select('*') as any);
      if (error) throw error;
      return (data ?? []) as Link[];
    },
  });

  const bpMap = useMemo(() => new Map(bps.map(b => [b.id, b])), [bps]);
  const childrenOf = useMemo(() => {
    const m = new Map<string, Link[]>();
    for (const l of links) {
      if (!m.has(l.parent_bp_id)) m.set(l.parent_bp_id, []);
      m.get(l.parent_bp_id)!.push(l);
    }
    return m;
  }, [links]);
  const childIds = useMemo(() => new Set(links.map(l => l.child_bp_id)), [links]);
  const roots = useMemo(() => {
    const parentIds = new Set(links.map(l => l.parent_bp_id));
    return Array.from(parentIds).filter(id => !childIds.has(id)).map(id => bpMap.get(id)).filter(Boolean) as BP[];
  }, [links, childIds, bpMap]);

  const filteredRoots = useMemo(() => {
    if (!search.trim()) return roots;
    const q = search.toLowerCase();
    return roots.filter(b => b.card_name?.toLowerCase().includes(q) || b.card_code?.toLowerCase().includes(q));
  }, [roots, search]);

  const save = useMutation({
    mutationFn: async (l: Partial<Link>) => {
      if (!l.parent_bp_id || !l.child_bp_id) throw new Error('Pick both accounts');
      if (l.parent_bp_id === l.child_bp_id) throw new Error('Parent and child must differ');
      const { error } = await (supabase.from('crm_account_hierarchies' as any).insert(l) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['account-hierarchies'] }); setOpen(false); setForm({ relationship_type: 'subsidiary' }); toast.success(isAr ? 'تم الربط' : 'Linked'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('crm_account_hierarchies' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['account-hierarchies'] }); toast.success(isAr ? 'تم الإلغاء' : 'Removed'); },
  });

  const renderNode = (bpId: string, depth: number, linkId?: string) => {
    const bp = bpMap.get(bpId);
    if (!bp) return null;
    const children = childrenOf.get(bpId) || [];
    return (
      <div key={`${bpId}-${linkId || 'root'}`}>
        <div className="flex items-center justify-between py-2 border-b hover:bg-muted/30 px-2 rounded" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {children.length > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{bp.card_name}</div>
              {bp.card_code && <div className="text-[11px] text-muted-foreground font-mono">{bp.card_code}</div>}
            </div>
            {children.length > 0 && <Badge variant="outline" className="text-[10px]">{children.length} {isAr ? 'فرعي' : 'subs'}</Badge>}
          </div>
          {linkId && <Button size="sm" variant="ghost" onClick={() => { if (confirm(isAr ? 'إلغاء الربط؟' : 'Unlink?')) remove.mutate(linkId); }}><Trash2 className="h-3.5 w-3.5" /></Button>}
        </div>
        {children.map((l) => renderNode(l.child_bp_id, depth + 1, l.id))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" />{isAr ? 'هرم الحسابات' : 'Account Hierarchies'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'ربط المقرات الرئيسية بالشركات التابعة' : 'Link parent companies to their subsidiaries'}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />{isAr ? 'ربط جديد' : 'New Link'}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? 'الهرم الكامل' : 'Full Hierarchy'} ({roots.length} {isAr ? 'شركة أم' : 'parents'})</CardTitle>
          <Input placeholder={isAr ? 'بحث...' : 'Search root accounts...'} value={search} onChange={(e) => setSearch(e.target.value)} className="mt-2" />
        </CardHeader>
        <CardContent>
          {filteredRoots.length === 0
            ? <p className="text-sm text-muted-foreground py-6 text-center">{isAr ? 'لا توجد روابط بعد.' : 'No account links yet.'}</p>
            : filteredRoots.map((bp) => renderNode(bp.id, 0))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'ربط حسابين' : 'Link Two Accounts'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{isAr ? 'الشركة الأم' : 'Parent account'}</Label>
              <Select value={form.parent_bp_id} onValueChange={(v) => setForm({ ...form, parent_bp_id: v })}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                <SelectContent>{bps.slice(0, 500).map(b => <SelectItem key={b.id} value={b.id}>{b.card_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{isAr ? 'الشركة التابعة' : 'Child account'}</Label>
              <Select value={form.child_bp_id} onValueChange={(v) => setForm({ ...form, child_bp_id: v })}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                <SelectContent>{bps.slice(0, 500).map(b => <SelectItem key={b.id} value={b.id}>{b.card_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{isAr ? 'نوع العلاقة' : 'Relationship'}</Label>
                <Select value={form.relationship_type} onValueChange={(v) => setForm({ ...form, relationship_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subsidiary">Subsidiary</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                    <SelectItem value="division">Division</SelectItem>
                    <SelectItem value="franchise">Franchise</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{isAr ? 'نسبة الملكية %' : 'Ownership %'}</Label><Input type="number" value={form.ownership_percent ?? ''} onChange={(e) => setForm({ ...form, ownership_percent: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{isAr ? 'ربط' : 'Link'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
