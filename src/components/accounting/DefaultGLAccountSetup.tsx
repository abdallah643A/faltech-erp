import { useState } from 'react';
import { useGLAccountDefaults } from '@/hooks/useGLAccountDefaults';
import { ACCOUNT_TYPE_LABELS } from '@/services/sapPostingEngine';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Search, ShoppingCart, Package, Settings2, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const AREA_CONFIG = {
  sales: { icon: DollarSign, label: 'Sales', labelAr: 'المبيعات', color: 'text-green-600' },
  purchasing: { icon: ShoppingCart, label: 'Purchasing', labelAr: 'المشتريات', color: 'text-blue-600' },
  general: { icon: Settings2, label: 'General', labelAr: 'عام', color: 'text-orange-600' },
  inventory: { icon: Package, label: 'Inventory', labelAr: 'المخزون', color: 'text-purple-600' },
};

export default function DefaultGLAccountSetup() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { defaults, isLoading, updateDefault, accounts } = useGLAccountDefaults();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleEdit = (row: any) => {
    setEditingId(row.id);
    setEditCode(row.acct_code || '');
  };

  const handleSave = (row: any) => {
    const acct = accounts.find((a: any) => a.acct_code === editCode);
    updateDefault.mutate({ id: row.id, acct_code: editCode, acct_name: acct?.acct_name || '' });
    setEditingId(null);
  };

  const filteredAccounts = accounts.filter((a: any) =>
    !searchTerm || a.acct_code?.includes(searchTerm) || a.acct_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderAreaTable = (area: string) => {
    const areaDefaults = defaults.filter(d => d.functional_area === area);
    if (areaDefaults.length === 0) return <p className="text-muted-foreground text-sm py-4">No account types configured for this area.</p>;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">{isAr ? 'نوع الحساب' : 'Account Type'}</TableHead>
            <TableHead>{isAr ? 'الوصف' : 'Description'}</TableHead>
            <TableHead className="w-[200px]">{isAr ? 'كود الحساب' : 'G/L Account'}</TableHead>
            <TableHead className="w-[200px]">{isAr ? 'اسم الحساب' : 'Account Name'}</TableHead>
            <TableHead className="w-[100px]">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {areaDefaults.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <span className="font-medium">{ACCOUNT_TYPE_LABELS[row.account_type] || row.account_type}</span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.description}</TableCell>
              <TableCell>
                {editingId === row.id ? (
                  <Select value={editCode} onValueChange={setEditCode}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="h-8 mb-2"
                        />
                      </div>
                      {filteredAccounts.slice(0, 50).map((a: any) => (
                        <SelectItem key={a.acct_code} value={a.acct_code}>
                          {a.acct_code} - {a.acct_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={row.acct_code ? 'default' : 'destructive'} className="font-mono">
                    {row.acct_code || 'Not Set'}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">{row.acct_name || '-'}</TableCell>
              <TableCell>
                {editingId === row.id ? (
                  <Button size="sm" onClick={() => handleSave(row)}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
                    {isAr ? 'تعديل' : 'Edit'}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {isAr ? 'تحديد الحسابات الافتراضية' : 'Default G/L Account Determination'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? 'حدد الحسابات الافتراضية لكل منطقة وظيفية. تُستخدم هذه عند عدم تطابق أي قاعدة متقدمة.'
              : 'Define default accounts for each functional area. These are used when no advanced rule matches.'}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales">
            <TabsList className="grid grid-cols-4 w-full">
              {Object.entries(AREA_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const count = defaults.filter(d => d.functional_area === key && d.acct_code).length;
                const total = defaults.filter(d => d.functional_area === key).length;
                return (
                  <TabsTrigger key={key} value={key} className="gap-2">
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                    {isAr ? cfg.labelAr : cfg.label}
                    <Badge variant="outline" className="ml-1 text-xs">{count}/{total}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.keys(AREA_CONFIG).map(area => (
              <TabsContent key={area} value={area} className="mt-4">
                {renderAreaTable(area)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
