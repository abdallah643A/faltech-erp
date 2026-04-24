import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { Plus, RefreshCw, Pencil, Trash2, Building2, Search, Phone, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Client {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  type: string;
  cr_number?: string;
  vat_number?: string;
  is_active: boolean;
}

const typeLabels: Record<string, string> = {
  government: 'Government', private: 'Private', commercial: 'Commercial', semi_government: 'Semi-Government',
};

export default function CPMSClients() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<any>({
    name: '', contact_person: '', email: '', phone: '', address: '', city: '',
    type: 'private', cr_number: '', vat_number: '', is_active: true,
  });

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('cpms_clients' as any).select('*').order('name');
    setClients((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSave = async () => {
    if (!form.name) return;
    if (editClient?.id) {
      const { error } = await supabase.from('cpms_clients' as any).update(form).eq('id', editClient.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Client updated' });
    } else {
      const { error } = await supabase.from('cpms_clients' as any).insert(form);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Client created' });
    }
    setShowForm(false);
    setEditClient(null);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    await supabase.from('cpms_clients' as any).delete().eq('id', id);
    toast({ title: 'Client deleted' });
    fetchClients();
  };

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Construction Clients
          </h1>
          <p className="text-sm text-muted-foreground">إدارة العملاء</p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons
            data={filtered}
            columns={[
              { key: 'name', header: 'Name' }, { key: 'contact_person', header: 'Contact Person' },
              { key: 'email', header: 'Email' }, { key: 'phone', header: 'Phone' },
              { key: 'type', header: 'Type' }, { key: 'city', header: 'City' },
              { key: 'cr_number', header: 'CR Number' }, { key: 'vat_number', header: 'VAT Number' },
              { key: 'address', header: 'Address' }, { key: 'is_active', header: 'Active' },
            ]}
            filename="cpms-clients"
            title="CPMS Clients"
            onImport={async (rows) => {
              const mapped = rows.map((r: any) => ({
                name: r['Name'] || r.name || '',
                contact_person: r['Contact Person'] || r.contact_person || null,
                email: r['Email'] || r.email || null,
                phone: r['Phone'] || r.phone || null,
                type: r['Type'] || r.type || 'private',
                city: r['City'] || r.city || null,
                cr_number: r['CR Number'] || r.cr_number || null,
                vat_number: r['VAT Number'] || r.vat_number || null,
                address: r['Address'] || r.address || null,
                is_active: r['Active'] !== false && r['Active'] !== 'false',
              })).filter((r: any) => r.name);
              if (mapped.length > 0) {
                const { error } = await supabase.from('cpms_clients' as any).insert(mapped);
                if (error) throw error;
              }
              fetchClients();
            }}
          />
          <Button onClick={() => { setEditClient(null); setForm({ name: '', type: 'private', is_active: true }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Client
          </Button>
          <Button variant="outline" onClick={fetchClients}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Clients</p><p className="text-2xl font-bold">{clients.length}</p></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Government</p><p className="text-2xl font-bold">{clients.filter(c => c.type === 'government').length}</p></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Private</p><p className="text-2xl font-bold">{clients.filter(c => c.type === 'private').length}</p></CardContent></Card>
        <Card className="border-l-4 border-l-orange-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Commercial</p><p className="text-2xl font-bold">{clients.filter(c => c.type === 'commercial').length}</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>City</TableHead>
                <TableHead>CR / VAT</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><RefreshCw className="animate-spin h-5 w-5 mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No clients</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {c.contact_person && <p className="text-sm">{c.contact_person}</p>}
                      {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</p>}
                      {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[c.type] || c.type}</Badge></TableCell>
                  <TableCell>{c.city || '-'}</TableCell>
                  <TableCell className="text-xs">{c.cr_number || '-'} / {c.vat_number || '-'}</TableCell>
                  <TableCell><Badge className={c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditClient(c); setForm(c); setShowForm(true); }}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editClient ? 'Edit Client' : 'Add Client'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person || ''} onChange={e => setForm((f: any) => ({ ...f, contact_person: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{t('common.email')}</Label><Input type="email" value={form.email || ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{t('common.phone')}</Label><Input value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>{t('common.type')}</Label>
              <Select value={form.type} onValueChange={v => setForm((f: any) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>City</Label><Input value={form.city || ''} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} /></div>
            <div className="space-y-2"><Label>CR Number</Label><Input value={form.cr_number || ''} onChange={e => setForm((f: any) => ({ ...f, cr_number: e.target.value }))} /></div>
            <div className="space-y-2"><Label>VAT Number</Label><Input value={form.vat_number || ''} onChange={e => setForm((f: any) => ({ ...f, vat_number: e.target.value }))} /></div>
            <div className="space-y-2 col-span-2"><Label>Address</Label><Input value={form.address || ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.name}>{t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
