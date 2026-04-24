import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

const docTypes = ['manual', 'drawing', 'certificate', 'invoice', 'warranty', 'maintenance', 'compliance', 'photo'];

const AssetDocumentLibrary = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ equipment_id: '', document_type: 'manual', title: '', file_url: '', expiry_date: '' });

  const fetchData = async () => {
    const [eq, dc] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_documents' as any).select('*').eq('is_current', true).order('created_at', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setDocs((dc.data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.equipment_id || !form.title) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_documents' as any).insert({
      ...form, expiry_date: form.expiry_date || null,
      company_id: activeCompanyId, uploaded_by: user?.id, version: 1, is_current: true,
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Document added' }); setShowAdd(false); fetchData();
  };

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const filtered = filterType ? docs.filter(d => d.document_type === filterType) : docs;
  const expiringSoon = docs.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 30 * 86400000) && new Date(d.expiry_date) > new Date());

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Document Library</h1><p className="text-sm text-muted-foreground">Manuals, certificates, invoices, version-controlled attachments</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />Add Document</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><FileText className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{docs.length}</div><div className="text-xs text-muted-foreground">Total Documents</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{expiringSoon.length}</div><div className="text-xs text-muted-foreground">Expiring in 30 Days</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{new Set(docs.map(d => d.equipment_id)).size}</div><div className="text-xs text-muted-foreground">Assets with Docs</div></CardContent></Card>
        <Card><CardContent className="pt-4">
          <Select value={filterType} onValueChange={setFilterType}><SelectTrigger><SelectValue placeholder="Filter by Type" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{docTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        </CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Title</TableHead><TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead>Version</TableHead><TableHead>Expiry</TableHead><TableHead>Added</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell>{eqName(d.equipment_id)}</TableCell>
                <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                <TableCell>v{d.version}</TableCell>
                <TableCell>{d.expiry_date ? <span className={new Date(d.expiry_date) < new Date() ? 'text-red-600 font-medium' : ''}>{format(new Date(d.expiry_date), 'yyyy-MM-dd')}</span> : '-'}</TableCell>
                <TableCell>{format(new Date(d.created_at), 'yyyy-MM-dd')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select Asset" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Select value={form.document_type} onValueChange={v => setForm({ ...form, document_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{docTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="File URL" value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} />
            <div><label className="text-xs">Expiry Date (optional)</label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetDocumentLibrary;
