import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSQLServerConnections, SQLServerConnection } from '@/hooks/useSQLServerQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Plus, Trash2, TestTube, Loader2, Server, CheckCircle, XCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';

const emptyConn: Partial<SQLServerConnection> = {
  name: '', sql_host: '', sql_port: 1433, sql_database: '', username: '', password: '',
  sql_encrypt: true, sql_trust_cert: false, is_active: true,
};

export function SQLServerConfig() {
  const { language } = useLanguage();
  const { connections, isLoading, saveConnection, deleteConnection, testConnection } = useSQLServerConnections();
  const [editConn, setEditConn] = useState<Partial<SQLServerConnection>>(emptyConn);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async () => {
    if (!editConn.name || !editConn.sql_host || !editConn.sql_database || !editConn.username || !editConn.password) return;
    setSaving(true);
    const ok = await saveConnection(editConn);
    setSaving(false);
    if (ok) { setDialogOpen(false); setEditConn(emptyConn); }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    await testConnection(id);
    setTesting(null);
  };

  const handleEdit = (conn: SQLServerConnection) => {
    setEditConn(conn);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>{language === 'ar' ? 'اتصالات SQL Server' : 'SQL Server Connections'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إدارة اتصالات SQL Server المباشرة لقراءة بيانات SAP B1' : 'Manage direct SQL Server connections for reading SAP B1 data'}
              </CardDescription>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditConn(emptyConn); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة اتصال' : 'Add Connection'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editConn.id ? (language === 'ar' ? 'تعديل الاتصال' : 'Edit Connection') : (language === 'ar' ? 'اتصال جديد' : 'New SQL Server Connection')}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="connection" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="connection">{language === 'ar' ? 'الاتصال' : 'Connection'}</TabsTrigger>
                  <TabsTrigger value="security">{language === 'ar' ? 'الأمان' : 'Security'}</TabsTrigger>
                </TabsList>
                <TabsContent value="connection" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>{language === 'ar' ? 'اسم الاتصال' : 'Connection Name'}</Label>
                      <Input value={editConn.name || ''} onChange={e => setEditConn(p => ({ ...p, name: e.target.value }))} placeholder="SAP Production DB" />
                    </div>
                    <div className="col-span-2">
                      <Label>{language === 'ar' ? 'المضيف' : 'Host / IP Address'}</Label>
                      <Input value={editConn.sql_host || ''} onChange={e => setEditConn(p => ({ ...p, sql_host: e.target.value }))} placeholder="192.168.1.100 or sql.company.com" />
                    </div>
                    <div>
                      <Label>{language === 'ar' ? 'المنفذ' : 'Port'}</Label>
                      <Input type="number" value={editConn.sql_port || 1433} onChange={e => setEditConn(p => ({ ...p, sql_port: parseInt(e.target.value) || 1433 }))} />
                    </div>
                    <div>
                      <Label>{language === 'ar' ? 'قاعدة البيانات' : 'Database Name'}</Label>
                      <Input value={editConn.sql_database || ''} onChange={e => setEditConn(p => ({ ...p, sql_database: e.target.value }))} placeholder="SBODemoSA" />
                    </div>
                    <div>
                      <Label>{language === 'ar' ? 'اسم المستخدم' : 'Username'}</Label>
                      <Input value={editConn.username || ''} onChange={e => setEditConn(p => ({ ...p, username: e.target.value }))} placeholder="sa" />
                    </div>
                    <div>
                      <Label>{language === 'ar' ? 'كلمة المرور' : 'Password'}</Label>
                      <div className="relative">
                        <Input type={showPassword ? 'text' : 'password'} value={editConn.password || ''} onChange={e => setEditConn(p => ({ ...p, password: e.target.value }))} />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="security" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{language === 'ar' ? 'تشفير SSL/TLS' : 'SSL/TLS Encryption'}</p>
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'تشفير الاتصال بالخادم' : 'Encrypt connection to server'}</p>
                    </div>
                    <Switch checked={editConn.sql_encrypt ?? true} onCheckedChange={v => setEditConn(p => ({ ...p, sql_encrypt: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{language === 'ar' ? 'الوثوق بالشهادة' : 'Trust Server Certificate'}</p>
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'قبول شهادات SSL الموقعة ذاتياً' : 'Accept self-signed SSL certificates'}</p>
                    </div>
                    <Switch checked={editConn.sql_trust_cert ?? false} onCheckedChange={v => setEditConn(p => ({ ...p, sql_trust_cert: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{language === 'ar' ? 'نشط' : 'Active'}</p>
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'تمكين هذا الاتصال' : 'Enable this connection'}</p>
                    </div>
                    <Switch checked={editConn.is_active ?? true} onCheckedChange={v => setEditConn(p => ({ ...p, is_active: v }))} />
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">⚠️ {language === 'ar' ? 'ملاحظة أمان' : 'Security Note'}</p>
                    {language === 'ar' 
                      ? 'يتم تخزين بيانات الاعتماد مشفرة. اتصالات SQL Server للقراءة فقط - لا يُسمح بعمليات الكتابة.'
                      : 'Credentials are stored encrypted. SQL Server connections are read-only — no write operations are allowed.'}
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={handleSave} disabled={saving || !editConn.name || !editConn.sql_host || !editConn.sql_database}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : connections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{language === 'ar' ? 'لا توجد اتصالات SQL Server' : 'No SQL Server Connections'}</p>
            <p className="text-sm mt-1">{language === 'ar' ? 'أضف اتصال SQL Server لقراءة بيانات SAP B1 مباشرة' : 'Add a SQL Server connection to read SAP B1 data directly'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map(conn => (
              <div key={conn.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{conn.name}</span>
                      <Badge variant={conn.is_active ? 'default' : 'secondary'} className="text-xs">
                        {conn.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'معطل' : 'Disabled')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {conn.sql_host}:{conn.sql_port} / {conn.sql_database}
                    </p>
                    {conn.last_sync_at && (
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'آخر اتصال:' : 'Last tested:'} {new Date(conn.last_sync_at).toLocaleString()}
                      </p>
                    )}
                    {conn.last_sync_error && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                        <XCircle className="h-3 w-3" /> {conn.last_sync_error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleTest(conn.id)} disabled={testing === conn.id}>
                    {testing === conn.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                    <span className="ml-1 hidden sm:inline">{language === 'ar' ? 'اختبار' : 'Test'}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(conn)}>
                    <RefreshCw className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteConnection(conn.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
