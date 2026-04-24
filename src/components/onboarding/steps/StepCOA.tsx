import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, TreePine, ChevronRight, ChevronDown, Plus, Trash2, Search, Upload, Download, Edit2, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { IFRS_DEFAULT_COA, type IFRSAccount } from '@/lib/ifrs-default-coa';

interface Props {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const TYPE_COLORS: Record<string, string> = {
  'Assets': 'bg-blue-100 text-blue-800',
  'Liabilities': 'bg-red-100 text-red-800',
  'Equity': 'bg-purple-100 text-purple-800',
  'Revenue': 'bg-green-100 text-green-800',
  'Cost of Sales': 'bg-orange-100 text-orange-800',
  'Operating Expenses': 'bg-yellow-100 text-yellow-800',
  'Other Income': 'bg-emerald-100 text-emerald-800',
  'Other Expenses': 'bg-rose-100 text-rose-800',
};

export function StepCOA({ data, onChange }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<IFRSAccount>>({});

  const coaMethod: string = data.coa_method || '';
  const accounts: IFRSAccount[] = data.coa_accounts || [];

  const filteredAccounts = useMemo(() => {
    if (!search || !accounts.length) return accounts;
    const s = search.toLowerCase();
    return accounts.filter(a => a.code.includes(s) || a.name.toLowerCase().includes(s) || a.nameAr.includes(s));
  }, [accounts, search]);

  const visibleAccounts = useMemo(() => {
    if (!accounts.length) return [];
    if (search) return filteredAccounts;
    const hidden = new Set<string>();
    const collapsedCodes = new Set(Object.entries(collapsed).filter(([_, v]) => v).map(([k]) => k));
    for (const acc of accounts) {
      if (acc.parentCode && (hidden.has(acc.parentCode) || collapsedCodes.has(acc.parentCode))) {
        hidden.add(acc.code);
      }
    }
    return accounts.filter(a => !hidden.has(a.code));
  }, [accounts, collapsed, search, filteredAccounts]);

  const selectMethod = (method: string) => {
    onChange('coa_method', method);
    if (method === 'ifrs') {
      onChange('coa_accounts', [...IFRS_DEFAULT_COA]);
    } else if (method === 'custom') {
      onChange('coa_accounts', []);
    }
  };

  // If no method selected, show selection
  if (!coaMethod) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {isAr ? 'اختر كيفية إعداد دليل الحسابات الخاص بك:' : 'Choose how to set up your Chart of Accounts:'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => selectMethod('custom')}
            className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="h-16 w-16 mx-auto mb-4 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10">
              <TreePine className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-2">{isAr ? 'إنشاء دليل حسابات خاص' : 'Create My Own Chart of Accounts'}</h3>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'إنشاء يدوي أو استيراد من Excel' : 'Manual creation or import from Excel template'}
            </p>
          </button>
          <button
            onClick={() => selectMethod('ifrs')}
            className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="h-16 w-16 mx-auto mb-4 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-2">{isAr ? 'استخدام قالب IFRS الافتراضي' : 'Use IFRS Default Template'}</h3>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'قالب جاهز وفقاً للمعايير الدولية - قابل للتعديل' : 'Pre-built IFRS-compliant template - fully editable'}
            </p>
          </button>
        </div>
      </div>
    );
  }

  const toggleCollapse = (code: string) => {
    setCollapsed(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const hasChildren = (code: string) => accounts.some(a => a.parentCode === code);

  const startEdit = (acc: IFRSAccount) => {
    setEditingId(acc.code);
    setEditValues({ name: acc.name, nameAr: acc.nameAr, code: acc.code });
  };

  const saveEdit = (code: string) => {
    const updated = accounts.map(a => a.code === code ? { ...a, ...editValues } : a);
    onChange('coa_accounts', updated);
    setEditingId(null);
  };

  const toggleActive = (code: string) => {
    const updated = accounts.map(a => a.code === code ? { ...a, active: !a.active } : a);
    onChange('coa_accounts', updated);
  };

  const removeAccount = (code: string) => {
    const updated = accounts.filter(a => a.code !== code && a.parentCode !== code);
    onChange('coa_accounts', updated);
  };

  const addAccount = () => {
    const newAcc: IFRSAccount = {
      code: String(Math.max(...accounts.map(a => parseInt(a.code) || 0)) + 10),
      name: 'New Account',
      nameAr: 'حساب جديد',
      parentCode: null,
      type: 'Assets',
      group: 'Assets',
      level: 1,
      isTitle: false,
      currencyControl: 'All',
      active: true,
      cashFlowCategory: 'Operating',
    };
    onChange('coa_accounts', [...accounts, newAcc]);
  };

  const activeCount = accounts.filter(a => a.active).length;
  const postingCount = accounts.filter(a => !a.isTitle && a.active).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{accounts.length} {isAr ? 'حساب' : 'accounts'}</Badge>
          <Badge variant="secondary">{activeCount} {isAr ? 'نشط' : 'active'}</Badge>
          <Badge variant="secondary">{postingCount} {isAr ? 'ترحيل' : 'posting'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { onChange('coa_method', ''); onChange('coa_accounts', []); }}>
            {isAr ? 'تغيير الطريقة' : 'Change Method'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Upload className="h-3 w-3" />
            {isAr ? 'استيراد' : 'Import Excel'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-3 w-3" />
            {isAr ? 'تصدير' : 'Export'}
          </Button>
          <Button size="sm" onClick={addAccount} className="gap-1">
            <Plus className="h-3 w-3" />
            {isAr ? 'إضافة' : 'Add Account'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isAr ? 'بحث بالرمز أو الاسم...' : 'Search by code or name...'}
          className="pl-9 h-9"
        />
      </div>

      {/* Account Tree */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">{isAr ? 'الرمز' : 'Code'}</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-32">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground w-20">{isAr ? 'ترحيل' : 'Posting'}</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground w-20">{isAr ? 'نشط' : 'Active'}</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground w-20"></th>
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.map(acc => {
                  const isEditing = editingId === acc.code;
                  const indent = (acc.level - 1) * 20;
                  const expandable = hasChildren(acc.code);
                  const isCollapsed = collapsed[acc.code];

                  return (
                    <tr key={acc.code} className={`border-b hover:bg-muted/30 ${!acc.active ? 'opacity-50' : ''} ${acc.isTitle ? 'bg-muted/20 font-medium' : ''}`}>
                      <td className="px-3 py-1.5 font-mono text-xs">{acc.code}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
                          {expandable ? (
                            <button onClick={() => toggleCollapse(acc.code)} className="p-0.5 rounded hover:bg-muted">
                              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          ) : <span className="w-5" />}
                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1">
                              <Input value={editValues.name || ''} onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))} className="h-7 text-xs" />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(acc.code)}><Check className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                            </div>
                          ) : (
                            <span className="text-xs">{isAr ? acc.nameAr : acc.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[acc.type] || ''}`}>
                          {acc.type}
                        </Badge>
                      </td>
                      <td className="text-center px-3 py-1.5">
                        <span className={`text-[10px] ${acc.isTitle ? 'text-muted-foreground' : 'text-green-600 font-medium'}`}>
                          {acc.isTitle ? (isAr ? 'عنوان' : 'Title') : (isAr ? 'ترحيل' : 'Post')}
                        </span>
                      </td>
                      <td className="text-center px-3 py-1.5">
                        <Checkbox checked={acc.active} onCheckedChange={() => toggleActive(acc.code)} />
                      </td>
                      <td className="text-center px-3 py-1.5">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(acc)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          {!acc.isTitle && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeAccount(acc.code)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
