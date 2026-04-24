import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, PenLine } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Props {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const MASTER_DATA_SECTIONS = [
  { key: 'bp_groups', label: 'Business Partner Groups', labelAr: 'مجموعات شركاء الأعمال', defaults: ['Customers', 'Vendors', 'Leads'] },
  { key: 'customer_groups', label: 'Customer Groups', labelAr: 'مجموعات العملاء', defaults: ['Retail', 'Wholesale', 'Corporate', 'Government'] },
  { key: 'vendor_groups', label: 'Vendor Groups', labelAr: 'مجموعات الموردين', defaults: ['Raw Materials', 'Services', 'Subcontractors', 'Equipment'] },
  { key: 'warehouses', label: 'Warehouses', labelAr: 'المستودعات', defaults: ['Main Warehouse', 'Raw Materials Store', 'Finished Goods'] },
  { key: 'item_groups', label: 'Item Groups', labelAr: 'مجموعات الأصناف', defaults: ['Raw Materials', 'Finished Goods', 'Services', 'Consumables'] },
  { key: 'uom', label: 'Units of Measure', labelAr: 'وحدات القياس', defaults: ['Each', 'KG', 'Liter', 'Meter', 'Piece', 'Box', 'Set'] },
  { key: 'cost_centers', label: 'Cost Centers', labelAr: 'مراكز التكلفة', defaults: ['Head Office', 'Operations', 'Sales', 'IT'] },
  { key: 'departments', label: 'Departments', labelAr: 'الأقسام', defaults: ['Finance', 'HR', 'Operations', 'Sales', 'IT', 'Administration'] },
  { key: 'branches', label: 'Branches', labelAr: 'الفروع', defaults: ['Main Branch'] },
  { key: 'payment_methods', label: 'Payment Methods', labelAr: 'طرق الدفع', defaults: ['Cash', 'Bank Transfer', 'Check', 'Credit Card'] },
  { key: 'payment_terms', label: 'Payment Terms', labelAr: 'شروط الدفع', defaults: ['Immediate', 'Net 15', 'Net 30', 'Net 60', 'Net 90'] },
  { key: 'banks', label: 'Banks', labelAr: 'البنوك', defaults: ['AlRajhi Bank', 'National Commercial Bank', 'Riyad Bank'] },
  { key: 'tax_codes', label: 'Tax Codes', labelAr: 'رموز الضريبة', defaults: ['VAT 15%', 'VAT 0%', 'Exempt', 'Reverse Charge'] },
  { key: 'currencies', label: 'Currencies', labelAr: 'العملات', defaults: ['SAR', 'USD', 'EUR', 'GBP', 'AED'] },
  { key: 'projects', label: 'Projects', labelAr: 'المشاريع', defaults: [] },
  { key: 'sales_employees', label: 'Sales Employees', labelAr: 'موظفو المبيعات', defaults: [] },
];

export function StepMasterData({ data, onChange }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const getItems = (key: string): string[] => {
    if (data[`md_${key}`]) return data[`md_${key}`];
    const section = MASTER_DATA_SECTIONS.find(s => s.key === key);
    return section?.defaults || [];
  };

  const setItems = (key: string, items: string[]) => {
    onChange(`md_${key}`, items);
  };

  const addItem = (key: string) => {
    const items = getItems(key);
    setItems(key, [...items, '']);
  };

  const removeItem = (key: string, idx: number) => {
    const items = getItems(key);
    setItems(key, items.filter((_, i) => i !== idx));
  };

  const updateItem = (key: string, idx: number, value: string) => {
    const items = [...getItems(key)];
    items[idx] = value;
    setItems(key, items);
  };

  const handleUploadClick = (key: string) => {
    setUploadTarget(key);
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text
          .split(/[\r\n]+/)
          .map(l => l.trim())
          .filter(l => l.length > 0);

        if (lines.length === 0) {
          toast({ title: isAr ? 'الملف فارغ' : 'File is empty', variant: 'destructive' });
          return;
        }

        const existing = getItems(uploadTarget);
        const merged = [...existing, ...lines];
        setItems(uploadTarget, merged);
        toast({
          title: isAr ? 'تم الاستيراد' : 'Imported',
          description: isAr
            ? `تمت إضافة ${lines.length} عنصر`
            : `${lines.length} items added`,
        });
      } catch {
        toast({ title: isAr ? 'خطأ في قراءة الملف' : 'Error reading file', variant: 'destructive' });
      }
    };
    reader.readAsText(file);

    // Reset so same file can be re-selected
    e.target.value = '';
    setUploadTarget(null);
  }, [uploadTarget, data, onChange, isAr, toast]);

  return (
    <div className="space-y-4">
      {/* Hidden file input for CSV/TXT upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.tsv"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-sm text-muted-foreground">
        {isAr
          ? 'قم بإعداد البيانات الرئيسية الأولية. جميع الحقول اختيارية ويمكن تعديلها لاحقاً.'
          : 'Set up initial master data. All fields are optional and can be modified later.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MASTER_DATA_SECTIONS.map(section => {
          const items = getItems(section.key);
          return (
            <Card key={section.key} className="overflow-hidden">
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{isAr ? section.labelAr : section.label}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <Input
                      value={item}
                      onChange={e => updateItem(section.key, idx, e.target.value)}
                      className="h-7 text-xs"
                      placeholder={isAr ? 'اسم العنصر' : 'Item name'}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeItem(section.key, idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs w-full mt-1">
                      <Plus className="h-3 w-3" />
                      {isAr ? 'إضافة' : 'Add'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    <DropdownMenuItem onClick={() => addItem(section.key)} className="gap-2 text-xs">
                      <PenLine className="h-3.5 w-3.5" />
                      {isAr ? 'إضافة يدوية' : 'Add Manually'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUploadClick(section.key)} className="gap-2 text-xs">
                      <Upload className="h-3.5 w-3.5" />
                      {isAr ? 'استيراد من ملف (CSV/TXT)' : 'Import from File (CSV/TXT)'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
