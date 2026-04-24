import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Building2, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Server, Database, User, Lock } from 'lucide-react';
import { useSAPCompanies, type SAPCompany } from '@/hooks/useSAPCompanies';
import { useToast } from '@/hooks/use-toast';

export function SAPCompanyManager() {
  const { allCompanies, isLoadingAll, createCompany, updateCompany, deleteCompany } = useSAPCompanies();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    database_name: '',
    service_layer_url: '',
    username: '',
    password: '',
    localization: 'UK International',
    version: '',
    is_active: true,
    is_default: false,
  });

  const resetForm = () => {
    setForm({
      company_name: '', database_name: '', service_layer_url: '',
      username: '', password: '', localization: 'UK International',
      version: '', is_active: true, is_default: false,
    });
    setEditingId(null);
    setShowPassword(false);
  };

  const handleEdit = (company: SAPCompany) => {
    setForm({
      company_name: company.company_name,
      database_name: company.database_name,
      service_layer_url: company.service_layer_url,
      username: company.username,
      password: company.password,
      localization: company.localization || 'UK International',
      version: company.version || '',
      is_active: company.is_active,
      is_default: company.is_default,
    });
    setEditingId(company.id);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.company_name || !form.database_name || !form.service_layer_url || !form.username || !form.password) {
      toast({ title: 'Missing Fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    if (editingId) {
      updateCompany.mutate({ id: editingId, ...form } as any);
    } else {
      createCompany.mutate(form as any);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this company?')) {
      deleteCompany.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>SAP B1 Companies</CardTitle>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Company
          </Button>
        </div>
        <CardDescription>
          Configure multiple SAP B1 company connections. Users can be assigned to one or more companies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingAll ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : allCompanies.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No SAP companies configured. Click "Add Company" to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Database</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCompanies.map(company => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">
                    {company.company_name}
                    {company.is_default && <Badge variant="outline" className="ml-2 text-[9px]">Default</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{company.database_name}</TableCell>
                  <TableCell className="text-xs truncate max-w-[200px]">{company.service_layer_url}</TableCell>
                  <TableCell className="text-xs">{company.username}</TableCell>
                  <TableCell>
                    <Badge variant={company.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {company.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(company)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(company.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Company' : 'Add SAP Company'}</DialogTitle>
            <DialogDescription>Configure SAP B1 Service Layer connection for this company.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            {[
              { id: 'company_name', label: 'Company Name', icon: Building2, placeholder: 'Al-rajhi CO. for Steel' },
              { id: 'database_name', label: 'Database Name', icon: Database, placeholder: 'KWT' },
              { id: 'service_layer_url', label: 'Service Layer URL', icon: Server, placeholder: 'https://server:50000/b1s/v1' },
              { id: 'username', label: 'Username', icon: User, placeholder: 'manager' },
            ].map(field => (
              <div key={field.id} className="grid grid-cols-[140px_1fr] items-center gap-2">
                <Label className="text-sm flex items-center gap-1.5">
                  <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {field.label}
                </Label>
                <Input
                  value={(form as any)[field.id]}
                  onChange={(e) => setForm(prev => ({ ...prev, [field.id]: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
            <div className="grid grid-cols-[140px_1fr] items-center gap-2">
              <Label className="text-sm flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  className="h-8 text-sm pr-8"
                  placeholder="Enter password"
                />
                <Button
                  type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-2">
              <Label className="text-sm">Localization</Label>
              <Input
                value={form.localization}
                onChange={(e) => setForm(prev => ({ ...prev, localization: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-2">
              <Label className="text-sm">Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(prev => ({ ...prev, is_active: v }))} />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-2">
              <Label className="text-sm">Default</Label>
              <Switch checked={form.is_default} onCheckedChange={(v) => setForm(prev => ({ ...prev, is_default: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={createCompany.isPending || updateCompany.isPending}>
              {(createCompany.isPending || updateCompany.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
