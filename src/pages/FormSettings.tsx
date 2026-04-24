import { useState } from 'react';
import { useFormSettings } from '@/hooks/useFormSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const FORM_KEYS = [
  { key: 'sales_orders', label: 'Sales Orders' },
  { key: 'ar_invoices', label: 'AR Invoices' },
  { key: 'business_partners', label: 'Business Partners' },
  { key: 'items', label: 'Items' },
  { key: 'leads', label: 'Leads' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'material_requests', label: 'Material Requests' },
  { key: 'purchase_orders', label: 'Purchase Orders' },
  { key: 'incoming_payments', label: 'Incoming Payments' },
  { key: 'journal_entries', label: 'Journal Entries' },
];

const COMMON_COLUMNS: Record<string, string[]> = {
  sales_orders: ['doc_num', 'customer_name', 'doc_date', 'total', 'status', 'contract_number', 'payment_terms', 'currency'],
  ar_invoices: ['doc_num', 'customer_name', 'doc_date', 'total', 'balance_due', 'status', 'currency'],
  business_partners: ['card_code', 'card_name', 'card_type', 'phone', 'email', 'city', 'balance'],
  items: ['item_code', 'item_name', 'item_group', 'price', 'quantity_on_hand', 'warehouse'],
  leads: ['name', 'company', 'email', 'phone', 'status', 'source', 'score'],
  opportunities: ['name', 'stage', 'value', 'probability', 'expected_close', 'owner'],
  material_requests: ['mr_number', 'project_name', 'department', 'status', 'due_out_date'],
  purchase_orders: ['po_number', 'vendor_name', 'doc_date', 'total', 'status'],
  incoming_payments: ['doc_num', 'customer_name', 'total_amount', 'payment_method', 'doc_date'],
  journal_entries: ['entry_number', 'reference', 'posting_date', 'total_debit', 'status'],
};

export default function FormSettings() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedForm, setSelectedForm] = useState('sales_orders');
  const { settings, isLoading, saveSettings } = useFormSettings(selectedForm);

  const columns = COMMON_COLUMNS[selectedForm] || [];
  const [visibleCols, setVisibleCols] = useState<string[]>(settings?.visible_columns || columns);
  const [rowsPerPage, setRowsPerPage] = useState(settings?.rows_per_page || 20);
  const [sortBy, setSortBy] = useState(settings?.sort_by || '');
  const [sortDir, setSortDir] = useState(settings?.sort_direction || 'asc');

  const handleSave = () => {
    saveSettings.mutate({
      visible_columns: visibleCols,
      rows_per_page: rowsPerPage,
      sort_by: sortBy,
      sort_direction: sortDir,
    });
  };

  const handleReset = () => {
    setVisibleCols(columns);
    setRowsPerPage(20);
    setSortBy('');
    setSortDir('asc');
    toast({ title: 'Settings reset to defaults' });
  };

  // Sync state when form/settings change
  const handleFormChange = (key: string) => {
    setSelectedForm(key);
    setVisibleCols(COMMON_COLUMNS[key] || []);
    setRowsPerPage(20);
    setSortBy('');
    setSortDir('asc');
  };

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Form Settings</h1>
        <p className="text-muted-foreground">Customize your view for each transaction form — columns, sorting, and display preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Form Selector */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5" />Forms</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0.5">
              {FORM_KEYS.map(fk => (
                <button key={fk.key} onClick={() => handleFormChange(fk.key)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedForm === fk.key ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                  {fk.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings Panel */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{FORM_KEYS.find(f => f.key === selectedForm)?.label} Settings</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
                <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="columns">
                <TabsList><TabsTrigger value="columns">Visible Columns</TabsTrigger><TabsTrigger value="display">Display</TabsTrigger></TabsList>

                <TabsContent value="columns" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Toggle which columns appear in the table view</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {columns.map(col => (
                      <div key={col} className="flex items-center justify-between border rounded-lg p-3">
                        <Label className="text-sm capitalize">{col.replace(/_/g, ' ')}</Label>
                        <Switch checked={visibleCols.includes(col)} onCheckedChange={checked => {
                          setVisibleCols(checked ? [...visibleCols, col] : visibleCols.filter(c => c !== col));
                        }} />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="display" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Rows Per Page</Label>
                      <Select value={String(rowsPerPage)} onValueChange={v => setRowsPerPage(+v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Default Sort Column</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {columns.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sort Direction</Label>
                      <Select value={sortDir} onValueChange={setSortDir}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
