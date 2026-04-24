import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useIndustryAI } from '@/hooks/useIndustryAI';
import { useToast } from '@/hooks/use-toast';
import { Wand2, FileText, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface QuoteLine {
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export default function SalesQuoteBuilder() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [lines, setLines] = useState<QuoteLine[]>([{ itemCode: '', description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  const [notes, setNotes] = useState('');
  const { analyze, isLoading: aiLoading, result: aiSuggestion, reset } = useIndustryAI();

  const { data: customers = [] } = useQuery({
    queryKey: ['bp-quote', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('business_partners').select('id, card_code, card_name').eq('card_type', 'customer');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(200);
      return data || [];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items-quote', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('items').select('id, item_code, description, default_price, item_group');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(500);
      return data || [];
    },
  });

  const addLine = () => setLines([...lines, { itemCode: '', description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof QuoteLine, value: any) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    if (field === 'itemCode') {
      const item = items.find((it: any) => it.item_code === value);
      if (item) {
        updated[i].description = item.description || '';
        updated[i].unitPrice = item.default_price || 0;
      }
    }
    setLines(updated);
  };

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100), 0);

  const generateAISuggestion = () => {
    const customer = customers.find((c: any) => c.card_code === selectedCustomer);
    analyze('quote_optimization', {
      customerName: customer?.card_name || selectedCustomer,
      lines: lines.map(l => ({ item: l.itemCode, desc: l.description, qty: l.quantity, price: l.unitPrice })),
      subtotal,
      notes,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intelligent Quote Builder</h1>
          <p className="text-muted-foreground">AI-powered quote generation with optimal pricing & product bundles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Quote Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.card_code}>{c.card_name} ({c.card_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-4 w-4 mr-1" /> Add Line</Button>
                </div>
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Select value={line.itemCode} onValueChange={v => updateLine(i, 'itemCode', v)}>
                        <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                        <SelectContent>
                          {items.map((it: any) => (
                            <SelectItem key={it.id} value={it.item_code}>{it.item_code} - {it.description}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input placeholder="Description" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Qty" value={line.quantity} onChange={e => updateLine(i, 'quantity', +e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Price" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', +e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Input type="number" placeholder="Disc%" value={line.discount} onChange={e => updateLine(i, 'discount', +e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center border-t pt-4">
                <Textarea placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} className="max-w-sm" />
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="text-2xl font-bold text-foreground">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={generateAISuggestion} disabled={aiLoading || !selectedCustomer} className="w-full mb-4">
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Generate Suggestions
              </Button>
              {aiSuggestion ? (
                <div className="prose prose-sm max-w-none text-foreground">
                  <ReactMarkdown>{aiSuggestion}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a customer and add items, then click to get AI-powered pricing suggestions, bundle recommendations, and optimal terms.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
