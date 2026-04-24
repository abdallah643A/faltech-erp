import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserDefaults, DOCUMENT_TYPES, UserDocAuthorization } from '@/hooks/useUserDefaults';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Shield, Users, User } from 'lucide-react';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

export default function DocumentAuthorizations() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');

  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-profiles-doc-auth'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, email, full_name').order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const { docAuthorizations, loadingAuths, saveDocAuthorizations } = useUserDefaults(selectedUserId);

  // Local state for the authorization matrix
  const [authMatrix, setAuthMatrix] = useState<Record<string, {
    can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean;
    can_print: boolean; can_close: boolean; can_cancel: boolean; max_amount: string;
  }>>({});

  useEffect(() => {
    const matrix: typeof authMatrix = {};
    for (const dt of DOCUMENT_TYPES) {
      const existing = docAuthorizations.find(a => a.document_type === dt.code);
      matrix[dt.code] = {
        can_create: existing?.can_create ?? true,
        can_read: existing?.can_read ?? true,
        can_update: existing?.can_update ?? true,
        can_delete: existing?.can_delete ?? false,
        can_print: existing?.can_print ?? true,
        can_close: existing?.can_close ?? false,
        can_cancel: existing?.can_cancel ?? false,
        max_amount: existing?.max_amount?.toString() || '',
      };
    }
    setAuthMatrix(matrix);
  }, [docAuthorizations]);

  const handleToggle = (docType: string, field: string, value: boolean) => {
    setAuthMatrix(p => ({
      ...p,
      [docType]: { ...p[docType], [field]: value },
    }));
  };

  const handleAmountChange = (docType: string, value: string) => {
    setAuthMatrix(p => ({
      ...p,
      [docType]: { ...p[docType], max_amount: value },
    }));
  };

  const handleSave = () => {
    const items = DOCUMENT_TYPES.map(dt => ({
      document_type: dt.code,
      can_create: authMatrix[dt.code]?.can_create ?? true,
      can_read: authMatrix[dt.code]?.can_read ?? true,
      can_update: authMatrix[dt.code]?.can_update ?? true,
      can_delete: authMatrix[dt.code]?.can_delete ?? false,
      can_print: authMatrix[dt.code]?.can_print ?? true,
      can_close: authMatrix[dt.code]?.can_close ?? false,
      can_cancel: authMatrix[dt.code]?.can_cancel ?? false,
      max_amount: authMatrix[dt.code]?.max_amount ? parseFloat(authMatrix[dt.code].max_amount) : null,
    }));
    saveDocAuthorizations.mutate(items);
  };

  const handleFullAccess = () => {
    const matrix: typeof authMatrix = {};
    for (const dt of DOCUMENT_TYPES) {
      matrix[dt.code] = {
        can_create: true, can_read: true, can_update: true, can_delete: true,
        can_print: true, can_close: true, can_cancel: true, max_amount: '',
      };
    }
    setAuthMatrix(matrix);
  };

  const handleReadOnly = () => {
    const matrix: typeof authMatrix = {};
    for (const dt of DOCUMENT_TYPES) {
      matrix[dt.code] = {
        can_create: false, can_read: true, can_update: false, can_delete: false,
        can_print: true, can_close: false, can_cancel: false, max_amount: '',
      };
    }
    setAuthMatrix(matrix);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold">{isAr ? 'غير مصرح' : 'Access Denied'}</h2>
            <p className="text-muted-foreground mt-2">{isAr ? 'يتطلب صلاحية المسؤول' : 'Admin access required'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {isAr ? 'صلاحيات المستندات' : 'Document Authorizations'}
          </h1>
          <p className="text-muted-foreground">
            {isAr ? 'التحكم بصلاحيات الإنشاء والقراءة والتعديل والحذف لكل نوع مستند لكل مستخدم' : 'Control Create/Read/Update/Delete permissions per document type per user'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons
            data={DOCUMENT_TYPES.map(dt => {
              const row = authMatrix[dt.code];
              return row ? { document: dt.label, ...row } : { document: dt.label };
            })}
            columns={[
              { key: 'document', header: 'Document' },
              { key: 'can_create', header: 'Create' },
              { key: 'can_read', header: 'Read' },
              { key: 'can_update', header: 'Update' },
              { key: 'can_delete', header: 'Delete' },
              { key: 'can_print', header: 'Print' },
              { key: 'can_close', header: 'Close' },
              { key: 'can_cancel', header: 'Cancel' },
              { key: 'max_amount', header: 'Max Amount' },
            ] as ColumnDef[]}
            filename="doc-authorizations"
            title="Document Authorizations"
          />
          <SAPSyncButton entity="business_partner" />
        </div>
      </div>

      {/* User selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedUserId || '__none__'} onValueChange={v => setSelectedUserId(v === '__none__' ? undefined : v)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder={isAr ? 'اختر المستخدم' : 'Select User'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{isAr ? '— اختر مستخدم —' : '— Select User —'}</SelectItem>
              {allUsers.map(u => (
                <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUserId && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleFullAccess}>
              {isAr ? 'صلاحيات كاملة' : 'Full Access'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReadOnly}>
              {isAr ? 'قراءة فقط' : 'Read Only'}
            </Button>
          </div>
        )}
      </div>

      {!selectedUserId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{isAr ? 'اختر مستخدم لعرض وتعديل صلاحيات المستندات' : 'Select a user to view and edit document authorizations'}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{isAr ? 'مصفوفة الصلاحيات' : 'Authorization Matrix'}</CardTitle>
            <CardDescription>
              {isAr ? 'اختر الصلاحيات المطلوبة لكل نوع مستند' : 'Toggle permissions for each document type'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAuths ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px] sticky left-0 bg-background">{isAr ? 'المستند' : 'Document'}</TableHead>
                        <TableHead className="text-center">{isAr ? 'إنشاء' : 'Create'}</TableHead>
                        <TableHead className="text-center">{isAr ? 'قراءة' : 'Read'}</TableHead>
                        <TableHead className="text-center">{isAr ? 'تعديل' : 'Update'}</TableHead>
                        <TableHead className="text-center">{isAr ? 'حذف' : 'Delete'}</TableHead>
                        <TableHead className="text-center">{isAr ? 'طباعة' : 'Print'}</TableHead>
                        <TableHead className="text-center">{isAr ? 'إغلاق' : 'Close'}</TableHead>
                        <TableHead className="text-center">{isAr ? 'إلغاء' : 'Cancel'}</TableHead>
                        <TableHead className="text-center w-[140px]">{isAr ? 'الحد الأقصى' : 'Max Amount'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DOCUMENT_TYPES.map(dt => {
                        const row = authMatrix[dt.code];
                        if (!row) return null;
                        return (
                          <TableRow key={dt.code}>
                            <TableCell className="font-medium sticky left-0 bg-background">
                              {isAr ? dt.labelAr : dt.label}
                            </TableCell>
                            {['can_create', 'can_read', 'can_update', 'can_delete', 'can_print', 'can_close', 'can_cancel'].map(field => (
                              <TableCell key={field} className="text-center">
                                <Switch
                                  checked={(row as any)[field]}
                                  onCheckedChange={v => handleToggle(dt.code, field, v)}
                                />
                              </TableCell>
                            ))}
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                className="w-[120px] text-center"
                                placeholder="∞"
                                value={row.max_amount}
                                onChange={e => handleAmountChange(dt.code, e.target.value)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleSave} disabled={saveDocAuthorizations.isPending} className="gap-2">
                    {saveDocAuthorizations.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isAr ? 'حفظ الصلاحيات' : 'Save Authorizations'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
