import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DOC_TYPES = [
  'Sales Order', 'AR Invoice', 'Delivery Note', 'Purchase Order', 'AP Invoice',
  'Goods Receipt', 'Credit Memo', 'Journal Entry', 'Incoming Payment', 'Outgoing Payment',
];

interface PrintPref {
  id?: string;
  document_type: string;
  default_layout: string;
  copies: number;
  print_logo: boolean;
  print_as: string;
}

export default function PrintPreferences() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(DOC_TYPES[0]);
  const [form, setForm] = useState<PrintPref>({ document_type: DOC_TYPES[0], default_layout: 'Standard', copies: 1, print_logo: true, print_as: 'PDF' });

  const { data: prefs = [] } = useQuery({
    queryKey: ['print_preferences', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase.from('print_preferences').select('*').eq('company_id', activeCompanyId);
      if (error) throw error;
      return data as PrintPref[];
    },
    enabled: !!activeCompanyId,
  });

  useEffect(() => {
    const existing = prefs.find(p => p.document_type === selected);
    if (existing) setForm(existing);
    else setForm({ document_type: selected, default_layout: 'Standard', copies: 1, print_logo: true, print_as: 'PDF' });
  }, [selected, prefs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('print_preferences').upsert(
        { company_id: activeCompanyId!, document_type: form.document_type, default_layout: form.default_layout, copies: form.copies, print_logo: form.print_logo, print_as: form.print_as },
        { onConflict: 'company_id,document_type' }
      );
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['print_preferences'] }); toast.success('Saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!activeCompanyId) return <div className="p-6 text-muted-foreground">Please select a company first.</div>;

  return (
    <div className="space-y-4 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'تفضيلات الطباعة' : 'Print Preferences'}</h1>
          <p className="text-muted-foreground text-sm">Configure print settings per document type</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} size="sm"><Save className="h-4 w-4 mr-1" /> Save</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg bg-background p-2 space-y-0.5">
          {DOC_TYPES.map(dt => (
            <button
              key={dt}
              onClick={() => setSelected(dt)}
              className={cn(
                'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                selected === dt ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              {dt}
            </button>
          ))}
        </div>

        <div className="col-span-2 border rounded-lg bg-background p-6 space-y-4">
          <h3 className="font-semibold text-foreground">{selected}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Default Report Layout</Label>
              <select value={form.default_layout} onChange={e => setForm(f => ({ ...f, default_layout: e.target.value }))} className="h-8 border rounded px-2 text-sm bg-background w-48">
                <option value="Standard">Standard</option><option value="Compact">Compact</option><option value="Detailed">Detailed</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Copies</Label>
              <Input type="number" min={1} max={10} value={form.copies} onChange={e => setForm(f => ({ ...f, copies: parseInt(e.target.value) || 1 }))} className="h-8 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Print Logo</Label>
              <input type="checkbox" checked={form.print_logo} onChange={e => setForm(f => ({ ...f, print_logo: e.target.checked }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Print As</Label>
              <select value={form.print_as} onChange={e => setForm(f => ({ ...f, print_as: e.target.value }))} className="h-8 border rounded px-2 text-sm bg-background w-48">
                <option value="PDF">PDF</option><option value="HTML">HTML</option><option value="Word">Word</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
