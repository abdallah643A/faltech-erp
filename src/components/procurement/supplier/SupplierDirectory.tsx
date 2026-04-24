import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Star, MapPin, Phone, Building2, Filter } from 'lucide-react';
import { useSupplierSites } from '@/hooks/useSupplierManagement';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const categoryColors: Record<string, string> = {
  materials: 'bg-blue-100 text-blue-800',
  equipment: 'bg-purple-100 text-purple-800',
  subcontractor: 'bg-amber-100 text-amber-800',
  services: 'bg-green-100 text-green-800',
};

const availabilityColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  limited: 'bg-amber-100 text-amber-800',
  unavailable: 'bg-red-100 text-red-800',
};

export function SupplierDirectory() {
  const { supplierSites, isLoading, createSupplierSite, deleteSupplierSite } = useSupplierSites();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    vendor_name: '', vendor_code: '', project_id: '', category: 'materials',
    coverage_area: '', delivery_zone: '', site_contact_person: '', site_contact_phone: '',
    site_specific_terms: '', capacity_notes: '', is_preferred: false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name').order('name');
      return data || [];
    },
  });

  const filtered = supplierSites.filter(s => {
    const matchSearch = s.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.vendor_code?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || s.category === filterCategory;
    const matchProject = filterProject === 'all' || s.project_id === filterProject;
    return matchSearch && matchCategory && matchProject;
  });

  const uniqueVendors = new Set(supplierSites.map(s => s.vendor_name)).size;
  const uniqueProjects = new Set(supplierSites.filter(s => s.project_id).map(s => s.project_id)).size;
  const preferredCount = supplierSites.filter(s => s.is_preferred).length;

  const handleCreate = async () => {
    await createSupplierSite.mutateAsync(form);
    setShowCreate(false);
    setForm({ vendor_name: '', vendor_code: '', project_id: '', category: 'materials', coverage_area: '', delivery_zone: '', site_contact_person: '', site_contact_phone: '', site_specific_terms: '', capacity_notes: '', is_preferred: false });
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{uniqueVendors}</p>
          <p className="text-xs text-muted-foreground">Total Suppliers</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{uniqueProjects}</p>
          <p className="text-xs text-muted-foreground">Sites Covered</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{supplierSites.length}</p>
          <p className="text-xs text-muted-foreground">Site Mappings</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{preferredCount}</p>
          <p className="text-xs text-muted-foreground">Preferred Suppliers</p>
        </CardContent></Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Site/Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3 w-3 mr-1" /> Map Supplier</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-center py-6 text-muted-foreground">Loading...</p> :
          filtered.length === 0 ? <p className="text-center py-6 text-muted-foreground">No supplier mappings found.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Site/Project</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => {
                    const project = projects.find((p: any) => p.id === s.project_id);
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {s.is_preferred && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                            <div>
                              <p className="font-medium text-sm">{s.vendor_name}</p>
                              {s.vendor_code && <p className="text-xs text-muted-foreground">{s.vendor_code}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge className={categoryColors[s.category] || ''} variant="secondary">{s.category}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {project?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.coverage_area && <div className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" />{s.coverage_area}</div>}
                          {s.delivery_zone && <p className="text-xs text-muted-foreground">{s.delivery_zone}</p>}
                        </TableCell>
                        <TableCell>
                          {s.site_contact_person && <p className="text-xs">{s.site_contact_person}</p>}
                          {s.site_contact_phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{s.site_contact_phone}</div>}
                        </TableCell>
                        <TableCell><Badge className={availabilityColors[s.availability_status] || ''}>{s.availability_status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} className={`h-3 w-3 ${star <= (s.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Map Supplier to Site</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vendor Name *</Label>
              <Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
            </div>
            <div>
              <Label>Vendor Code</Label>
              <Input value={form.vendor_code} onChange={e => setForm(f => ({ ...f, vendor_code: e.target.value }))} />
            </div>
            <div>
              <Label>Site / Project</Label>
              <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Coverage Area</Label><Input value={form.coverage_area} onChange={e => setForm(f => ({ ...f, coverage_area: e.target.value }))} /></div>
            <div><Label>Delivery Zone</Label><Input value={form.delivery_zone} onChange={e => setForm(f => ({ ...f, delivery_zone: e.target.value }))} /></div>
            <div><Label>Site Contact Person</Label><Input value={form.site_contact_person} onChange={e => setForm(f => ({ ...f, site_contact_person: e.target.value }))} /></div>
            <div><Label>Site Contact Phone</Label><Input value={form.site_contact_phone} onChange={e => setForm(f => ({ ...f, site_contact_phone: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Site-Specific Terms</Label><Textarea value={form.site_specific_terms} onChange={e => setForm(f => ({ ...f, site_specific_terms: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Capacity Notes</Label><Textarea value={form.capacity_notes} onChange={e => setForm(f => ({ ...f, capacity_notes: e.target.value }))} /></div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={form.is_preferred} onChange={e => setForm(f => ({ ...f, is_preferred: e.target.checked }))} />
              <Label>Preferred Supplier</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.vendor_name || createSupplierSite.isPending}>Create Mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
