import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPES = ['Journal Entry', 'AR Invoice', 'AP Invoice', 'Sales Order', 'Purchase Order', 'Delivery', 'Goods Receipt', 'Credit Memo'];

const SETTINGS_KEYS = [
  { key: 'manage_freight', label: 'Manage Freight', type: 'checkbox' },
  { key: 'calculate_gross_profit', label: 'Calculate Gross Profit', type: 'checkbox' },
  { key: 'enable_discount', label: 'Enable Discount', type: 'checkbox' },
  { key: 'base_document', label: 'Base Document Required', type: 'checkbox' },
  { key: 'copy_remarks', label: 'Copy Remarks from Base', type: 'checkbox' },
  { key: 'rounding_method', label: 'Rounding Method', type: 'select', options: ['Commercial', 'Tax', 'Rounding to Denominator'] },
];

export default function DocumentSettings() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState(DOC_TYPES[0]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const { data: dbSettings = [] } = useQuery({
    queryKey: ['general_settings', activeCompanyId, 'doc_settings'],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase.from('general_settings')
        .select('*').eq('company_id', activeCompanyId).eq('setting_group', 'doc_settings');
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  useEffect(() => {
    const map: Record<string, string> = {};
    dbSettings.filter((s: any) => s.setting_key.startsWith(selectedDoc + '.')).forEach((s: any) => {
      map[s.setting_key.replace(selectedDoc + '.', '')] = s.setting_value || '';
    });
    setSettings(map);
  }, [selectedDoc, dbSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from('general_settings').upsert(
          { company_id: activeCompanyId!, setting_group: 'doc_settings', setting_key: `${selectedDoc}.${key}`, setting_value: value },
          { onConflict: 'company_id,setting_group,setting_key' }
        );
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['general_settings'] }); toast.success('Saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!activeCompanyId) return <div className="p-6 text-muted-foreground">Please select a company first.</div>;

  return (
    <div className="space-y-4 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'إعدادات المستندات' : 'Document Settings'}</h1>
          <p className="text-muted-foreground text-sm">Configure behavior per document type</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} size="sm"><Save className="h-4 w-4 mr-1" /> Save</Button>
      </div>

      <Tabs defaultValue="per-document">
        <TabsList><TabsTrigger value="per-document">Per Document</TabsTrigger><TabsTrigger value="general">General</TabsTrigger></TabsList>

        <TabsContent value="per-document" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Label>Document Type:</Label>
            <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)} className="h-9 border rounded px-3 text-sm bg-background">
              {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="border rounded-lg bg-background p-4 space-y-3">
            {SETTINGS_KEYS.map(({ key, label, type, options }) => (
              <div className="flex items-center justify-between py-2 border-b last:border-0" key={key}>
                <Label className="text-sm">{label}</Label>
                {type === 'checkbox' ? (
                  <input type="checkbox" checked={settings[key] === 'true'} onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked ? 'true' : 'false' }))} />
                ) : (
                  <select value={settings[key] || options?.[0] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} className="h-8 border rounded px-2 text-sm bg-background w-52">
                    {options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="general" className="border rounded-lg bg-background p-4 mt-4">
          <p className="text-muted-foreground text-sm">General document settings like base currency display and print logo are configured under Print Preferences.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
