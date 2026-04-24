import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Database, Plus, MoreVertical, Trash2, Edit, CheckCircle, XCircle,
  Loader2, RefreshCw, Server, Eye, EyeOff, TestTube,
} from 'lucide-react';
import { useExternalSAPDatabase, SAPDatabaseConnection } from '@/hooks/useExternalSAPDatabase';
import { format } from 'date-fns';

const emptyConnection: Partial<SAPDatabaseConnection> = {
  name: '', name_ar: '', service_layer_url: '', company_db: '', username: '', password: '',
  is_active: true, is_primary: false,
};

export default function SAPDatabases() {
  const { language } = useLanguage();
  const {
    connections, loading, fetchConnections, saveConnection,
    deleteConnection, testConnection, syncItems,
  } = useExternalSAPDatabase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editConn, setEditConn] = useState<Partial<SAPDatabaseConnection>>(emptyConnection);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveConnection(editConn);
    setSaving(false);
    if (ok) {
      setDialogOpen(false);
      setEditConn(emptyConnection);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    await testConnection(id);
    setTesting(null);
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    await syncItems(id);
    setSyncing(null);
    fetchConnections();
  };

  const handleEdit = (conn: SAPDatabaseConnection) => {
    setEditConn(conn);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'قواعد بيانات SAP الخارجية' : 'External SAP Databases'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة اتصالات قواعد بيانات SAP المتعددة للبيع من مخازن أخرى' : 'Manage multiple SAP database connections for selling from external stock'}
          </p>
        </div>
        <Button className="gap-2" onClick={() => { setEditConn(emptyConnection); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          {language === 'ar' ? 'إضافة قاعدة بيانات' : 'Add Database'}
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </CardContent>
          </Card>
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {language === 'ar' ? 'لا توجد قواعد بيانات خارجية' : 'No External Databases'}
              </h3>
              <p className="text-muted-foreground max-w-sm">
                {language === 'ar' ? 'أضف اتصال قاعدة بيانات SAP خارجية للبيع من مخازن أخرى' : 'Add an external SAP database connection to sell from other warehouses'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'قاعدة البيانات' : 'Database'}</TableHead>
                  <TableHead className="col-mobile-hidden">{language === 'ar' ? 'الرابط' : 'URL'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="col-mobile-hidden">{language === 'ar' ? 'آخر مزامنة' : 'Last Sync'}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((conn) => (
                  <TableRow key={conn.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {conn.name}
                        {conn.is_primary && <Badge variant="outline" className="text-xs">Primary</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{conn.company_db}</TableCell>
                    <TableCell className="col-mobile-hidden text-xs text-muted-foreground truncate max-w-[200px]">
                      {conn.service_layer_url}
                    </TableCell>
                    <TableCell>
                      <Badge className={conn.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                        {conn.is_active ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="col-mobile-hidden text-xs text-muted-foreground">
                      {conn.last_sync_at ? format(new Date(conn.last_sync_at), 'MMM d, HH:mm') : 'Never'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(conn)}>
                            <Edit className="h-4 w-4 mr-2" /> {language === 'ar' ? 'تعديل' : 'Edit'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTest(conn.id)} disabled={testing === conn.id}>
                            {testing === conn.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                            {language === 'ar' ? 'اختبار الاتصال' : 'Test Connection'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSync(conn.id)} disabled={syncing === conn.id}>
                            {syncing === conn.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            {language === 'ar' ? 'مزامنة الأصناف' : 'Sync Items'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteConnection(conn.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> {language === 'ar' ? 'حذف' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editConn.id
                ? language === 'ar' ? 'تعديل قاعدة البيانات' : 'Edit Database Connection'
                : language === 'ar' ? 'إضافة قاعدة بيانات جديدة' : 'Add New Database Connection'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'أدخل بيانات الاتصال بقاعدة بيانات SAP الخارجية' : 'Enter connection details for the external SAP B1 database'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم الاتصال' : 'Connection Name'} *</Label>
                <Input value={editConn.name || ''} onChange={(e) => setEditConn({ ...editConn, name: e.target.value })} placeholder="e.g. Factory DB" />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'}</Label>
                <Input value={editConn.name_ar || ''} onChange={(e) => setEditConn({ ...editConn, name_ar: e.target.value })} placeholder="مثال: قاعدة بيانات المصنع" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Server className="h-3.5 w-3.5" /> Service Layer URL *</Label>
              <Input value={editConn.service_layer_url || ''} onChange={(e) => setEditConn({ ...editConn, service_layer_url: e.target.value })} placeholder="https://sap-server:50000/b1s/v1" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Database className="h-3.5 w-3.5" /> Company Database *</Label>
              <Input value={editConn.company_db || ''} onChange={(e) => setEditConn({ ...editConn, company_db: e.target.value })} placeholder="SBODEMOUS" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input value={editConn.username || ''} onChange={(e) => setEditConn({ ...editConn, username: e.target.value })} placeholder="manager" />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={editConn.password || ''} onChange={(e) => setEditConn({ ...editConn, password: e.target.value })} />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={editConn.is_active ?? true} onCheckedChange={(v) => setEditConn({ ...editConn, is_active: v })} />
                <Label>{language === 'ar' ? 'نشط' : 'Active'}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editConn.is_primary ?? false} onCheckedChange={(v) => setEditConn({ ...editConn, is_primary: v })} />
                <Label>{language === 'ar' ? 'أساسي' : 'Primary'}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving || !editConn.name || !editConn.service_layer_url || !editConn.company_db || !editConn.username || !editConn.password}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
