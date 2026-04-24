import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserDefaults, DOCUMENT_TYPES } from '@/hooks/useUserDefaults';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, User, Hash, Settings2, Users } from 'lucide-react';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { useToast } from '@/hooks/use-toast';

export default function UserDefaults() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');

  // Admin can select a user to configure
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-profiles-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, email, full_name').order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const {
    defaults, defaultSeries, loadingDefaults, loadingSeries,
    saveDefaults, saveDefaultSeries,
  } = useUserDefaults(selectedUserId);

  // Lookup data
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('id, warehouse_code, warehouse_name').order('warehouse_code');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: priceLists = [] } = useQuery({
    queryKey: ['price-lists-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('price_lists').select('id, list_num, list_name').order('list_num');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: taxCodes = [] } = useQuery({
    queryKey: ['tax-codes-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tax_codes').select('id, code, name').order('code');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['sales-employees-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_employees').select('id, employee_code, employee_name').order('employee_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: numberingSeries = [] } = useQuery({
    queryKey: ['numbering-series-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('numbering_series').select('*').eq('locked', false).order('object_code');
      if (error) throw error;
      return data || [];
    },
  });

  // Form state
  const [formDefaults, setFormDefaults] = useState({
    default_branch_id: '',
    default_warehouse: '',
    default_sales_employee_code: '',
    default_price_list: '',
    default_payment_terms: '',
    default_tax_group: '',
    sap_user_code: '',
  });

  const [seriesSelections, setSeriesSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (defaults) {
      setFormDefaults({
        default_branch_id: defaults.default_branch_id || '',
        default_warehouse: defaults.default_warehouse || '',
        default_sales_employee_code: defaults.default_sales_employee_code?.toString() || '',
        default_price_list: defaults.default_price_list?.toString() || '',
        default_payment_terms: defaults.default_payment_terms || '',
        default_tax_group: defaults.default_tax_group || '',
        sap_user_code: defaults.sap_user_code || '',
      });
    }
  }, [defaults]);

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const ds of defaultSeries) {
      map[ds.object_code] = ds.series.toString();
    }
    setSeriesSelections(map);
  }, [defaultSeries]);

  const handleSaveDefaults = () => {
    saveDefaults.mutate({
      default_branch_id: formDefaults.default_branch_id || null,
      default_warehouse: formDefaults.default_warehouse || null,
      default_sales_employee_code: formDefaults.default_sales_employee_code ? parseInt(formDefaults.default_sales_employee_code) : null,
      default_price_list: formDefaults.default_price_list ? parseInt(formDefaults.default_price_list) : null,
      default_payment_terms: formDefaults.default_payment_terms || null,
      default_tax_group: formDefaults.default_tax_group || null,
      sap_user_code: formDefaults.sap_user_code || null,
    } as any);
  };

  const handleSaveSeries = () => {
    const items = Object.entries(seriesSelections)
      .filter(([, val]) => val)
      .map(([objectCode, series]) => {
        const s = numberingSeries.find((ns: any) => ns.series.toString() === series);
        return { object_code: objectCode, series: parseInt(series), series_name: s?.series_name || '' };
      });
    saveDefaultSeries.mutate(items);
  };

  const getSeriesForDocument = (objectCode: string) => {
    return numberingSeries.filter((ns: any) => ns.object_code === objectCode);
  };

  const selectedUserLabel = useMemo(() => {
    if (!selectedUserId) return isAr ? 'المستخدم الحالي' : 'Current User';
    const u = allUsers.find(u => u.user_id === selectedUserId);
    return u ? `${u.full_name || u.email}` : selectedUserId;
  }, [selectedUserId, allUsers, isAr]);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            {isAr ? 'إعدادات المستخدم الافتراضية' : 'User Defaults'}
          </h1>
          <p className="text-muted-foreground">
            {isAr ? 'إعداد القيم الافتراضية والسلاسل المستندية لكل مستخدم' : 'Configure default values and document series per user'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedUserId || '__current__'} onValueChange={v => setSelectedUserId(v === '__current__' ? undefined : v)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={isAr ? 'اختر المستخدم' : 'Select User'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__current__">{isAr ? 'المستخدم الحالي (أنا)' : 'Current User (Me)'}</SelectItem>
                {allUsers.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <ExportImportButtons
            data={allUsers.map(u => ({ email: u.email, full_name: u.full_name }))}
            columns={[{ key: 'email', header: 'Email' }, { key: 'full_name', header: 'Full Name' }] as ColumnDef[]}
            filename="user-defaults"
            title="User Defaults"
          />
          <SAPSyncButton entity="business_partner" />
        </div>
      </div>

      <Badge variant="outline" className="gap-1">
        <User className="h-3 w-3" />
        {selectedUserLabel}
      </Badge>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings2 className="h-4 w-4" />
            {isAr ? 'الإعدادات العامة' : 'General Defaults'}
          </TabsTrigger>
          <TabsTrigger value="series" className="gap-2">
            <Hash className="h-4 w-4" />
            {isAr ? 'السلاسل الافتراضية' : 'Default Series'}
          </TabsTrigger>
        </TabsList>

        {/* General Defaults */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{isAr ? 'القيم الافتراضية' : 'Default Values'}</CardTitle>
              <CardDescription>{isAr ? 'يتم تطبيق هذه القيم تلقائياً عند إنشاء مستندات جديدة' : 'These values are auto-applied when creating new documents'}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDefaults ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SAP User Code */}
                  <div className="space-y-2">
                    <Label>{isAr ? 'كود مستخدم SAP' : 'SAP User Code'}</Label>
                    <Input
                      value={formDefaults.sap_user_code}
                      onChange={e => setFormDefaults(p => ({ ...p, sap_user_code: e.target.value }))}
                      placeholder="e.g. manager"
                    />
                  </div>

                  {/* Branch */}
                  <div className="space-y-2">
                    <Label>{isAr ? 'الفرع الافتراضي' : 'Default Branch'}</Label>
                     <Select value={formDefaults.default_branch_id || '__none__'} onValueChange={v => setFormDefaults(p => ({ ...p, default_branch_id: v === '__none__' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder={isAr ? 'اختر الفرع' : 'Select Branch'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {branches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name} {b.code ? `(${b.code})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Warehouse */}
                  <div className="space-y-2">
                    <Label>{isAr ? 'المستودع الافتراضي' : 'Default Warehouse'}</Label>
                     <Select value={formDefaults.default_warehouse || '__none__'} onValueChange={v => setFormDefaults(p => ({ ...p, default_warehouse: v === '__none__' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder={isAr ? 'اختر المستودع' : 'Select Warehouse'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {warehouses.map((w: any) => (
                          <SelectItem key={w.id} value={w.warehouse_code}>{w.warehouse_code} - {w.warehouse_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sales Employee */}
                  <div className="space-y-2">
                    <Label>{isAr ? 'موظف المبيعات الافتراضي' : 'Default Sales Employee'}</Label>
                     <Select value={formDefaults.default_sales_employee_code || '__none__'} onValueChange={v => setFormDefaults(p => ({ ...p, default_sales_employee_code: v === '__none__' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder={isAr ? 'اختر الموظف' : 'Select Employee'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {salesEmployees.map((se: any) => (
                          <SelectItem key={se.id} value={se.employee_code?.toString()}>{se.employee_name} ({se.employee_code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price List */}
                  <div className="space-y-2">
                    <Label>{isAr ? 'قائمة الأسعار الافتراضية' : 'Default Price List'}</Label>
                     <Select value={formDefaults.default_price_list || '__none__'} onValueChange={v => setFormDefaults(p => ({ ...p, default_price_list: v === '__none__' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder={isAr ? 'اختر القائمة' : 'Select Price List'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {priceLists.map((pl: any) => (
                          <SelectItem key={pl.id} value={pl.list_num?.toString()}>{pl.list_name} ({pl.list_num})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Terms */}
                  <div className="space-y-2">
                    <Label>{isAr ? 'شروط الدفع الافتراضية' : 'Default Payment Terms'}</Label>
                    <Input
                      value={formDefaults.default_payment_terms}
                      onChange={e => setFormDefaults(p => ({ ...p, default_payment_terms: e.target.value }))}
                      placeholder="e.g. Net 30"
                    />
                  </div>

                  {/* Tax Group */}
                  <div className="space-y-2">
                    <Label>{isAr ? 'المجموعة الضريبية الافتراضية' : 'Default Tax Group'}</Label>
                     <Select value={formDefaults.default_tax_group || '__none__'} onValueChange={v => setFormDefaults(p => ({ ...p, default_tax_group: v === '__none__' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder={isAr ? 'اختر المجموعة' : 'Select Tax Group'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {taxCodes.map((tc: any) => (
                          <SelectItem key={tc.id} value={tc.code}>{tc.code} - {tc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button onClick={handleSaveDefaults} disabled={saveDefaults.isPending} className="gap-2">
                  {saveDefaults.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isAr ? 'حفظ الإعدادات' : 'Save Defaults'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Series */}
        <TabsContent value="series">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                {isAr ? 'السلسلة الافتراضية لكل نوع مستند' : 'Default Series per Document Type'}
              </CardTitle>
              <CardDescription>
                {isAr ? 'عند إنشاء مستند جديد، سيتم اختيار السلسلة المحددة هنا تلقائياً' : 'When creating a new document, the series selected here will be auto-applied'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSeries ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">{isAr ? 'نوع المستند' : 'Document Type'}</TableHead>
                        <TableHead>{isAr ? 'السلسلة الافتراضية' : 'Default Series'}</TableHead>
                        <TableHead>{isAr ? 'البادئة' : 'Prefix'}</TableHead>
                        <TableHead>{isAr ? 'الرقم التالي' : 'Next No.'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DOCUMENT_TYPES.map(dt => {
                        const available = getSeriesForDocument(dt.code);
                        const selectedSeries = seriesSelections[dt.code] || '';
                        const selectedSeriesObj = available.find((s: any) => s.series.toString() === selectedSeries);
                        return (
                          <TableRow key={dt.code}>
                            <TableCell className="font-medium">{isAr ? dt.labelAr : dt.label}</TableCell>
                            <TableCell>
                              <Select
                                value={selectedSeries || '__none__'}
                                onValueChange={v => setSeriesSelections(p => ({ ...p, [dt.code]: v === '__none__' ? '' : v }))}
                              >
                                <SelectTrigger className="w-[220px]">
                                  <SelectValue placeholder={isAr ? 'اختر السلسلة' : 'Select Series'} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">—</SelectItem>
                                  {available.map((s: any) => (
                                    <SelectItem key={s.series} value={s.series.toString()}>
                                      {s.series_name} ({s.series})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {selectedSeriesObj?.prefix || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {selectedSeriesObj?.next_no || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end mt-6">
                    <Button onClick={handleSaveSeries} disabled={saveDefaultSeries.isPending} className="gap-2">
                      {saveDefaultSeries.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isAr ? 'حفظ السلاسل' : 'Save Series'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
