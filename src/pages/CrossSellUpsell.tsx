import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrossSell } from '@/hooks/useCrossSell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Plus, Target, TrendingUp, ShoppingBag, Zap, Brain, BarChart3 } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'date', header: 'Date' },
  { key: 'sale', header: 'Sale' },
];


const t: Record<string, Record<string, string>> = {
  title: { en: 'Smart Cross-Sell & Upsell', ar: 'البيع المتقاطع والترقية الذكي' },
  rules: { en: 'Rules', ar: 'القواعد' },
  aiTest: { en: 'AI Test', ar: 'اختبار الذكاء' },
  analytics: { en: 'Analytics', ar: 'التحليلات' },
  newRule: { en: 'New Rule', ar: 'قاعدة جديدة' },
  ruleName: { en: 'Rule Name', ar: 'اسم القاعدة' },
  ruleType: { en: 'Type', ar: 'النوع' },
  triggerItem: { en: 'Trigger Item', ar: 'المنتج المحفز' },
  recommendedItem: { en: 'Recommended Item', ar: 'المنتج الموصى به' },
  discount: { en: 'Discount %', ar: 'نسبة الخصم' },
  priority: { en: 'Priority', ar: 'الأولوية' },
  active: { en: 'Active', ar: 'نشط' },
  create: { en: 'Create', ar: 'إنشاء' },
  testBasket: { en: 'Test Basket Items', ar: 'اختبار سلة التسوق' },
  getRecommendations: { en: 'Get Recommendations', ar: 'احصل على التوصيات' },
  source: { en: 'Source', ar: 'المصدر' },
  accepted: { en: 'Accepted', ar: 'مقبول' },
  noRules: { en: 'No cross-sell rules yet', ar: 'لا توجد قواعد بعد' },
  totalSuggestions: { en: 'Total Suggestions', ar: 'إجمالي الاقتراحات' },
  acceptanceRate: { en: 'Acceptance Rate', ar: 'معدل القبول' },
  ruleBasedHits: { en: 'Rule-Based', ar: 'قائم على القواعد' },
  aiHits: { en: 'AI-Powered', ar: 'مدعوم بالذكاء' },
};

const ruleTypes = [
  { value: 'related', label: 'Related' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'service_plan', label: 'Service Plan' },
  { value: 'frequently_bought', label: 'Frequently Bought Together' },
];

export default function CrossSellPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const { rules, logs, isLoading, createRule, getRecommendations } = useCrossSell();
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState<any>({ rule_name: '', rule_type: 'related', trigger_item_code: '', recommended_item_code: '', recommended_item_name: '', discount_percent: 0, priority: 0, is_active: true });
  const [testInput, setTestInput] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      const items = testInput.split(',').map(s => s.trim()).filter(Boolean);
      const recs = await getRecommendations(items);
      setTestResults(recs);
    } finally {
      setTesting(false);
    }
  };

  const totalLogs = (logs || []).length;
  const acceptedLogs = (logs || []).filter((l: any) => l.was_accepted).length;
  const ruleLogs = (logs || []).filter((l: any) => l.source === 'rule').length;
  const aiLogs = (logs || []).filter((l: any) => l.source === 'ai').length;

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-amber-500" />{t.title[lang]}</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="cross-sell-upsell" title="Cross Sell Upsell" />
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t.newRule[lang]}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.newRule[lang]}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t.ruleName[lang]}</Label><Input value={newRule.rule_name} onChange={e => setNewRule((p: any) => ({ ...p, rule_name: e.target.value }))} /></div>
              <div><Label>{t.ruleType[lang]}</Label>
                <Select value={newRule.rule_type} onValueChange={v => setNewRule((p: any) => ({ ...p, rule_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ruleTypes.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t.triggerItem[lang]}</Label><Input value={newRule.trigger_item_code} onChange={e => setNewRule((p: any) => ({ ...p, trigger_item_code: e.target.value }))} /></div>
              <div><Label>{t.recommendedItem[lang]} Code</Label><Input value={newRule.recommended_item_code} onChange={e => setNewRule((p: any) => ({ ...p, recommended_item_code: e.target.value }))} /></div>
              <div><Label>{t.recommendedItem[lang]} Name</Label><Input value={newRule.recommended_item_name} onChange={e => setNewRule((p: any) => ({ ...p, recommended_item_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t.discount[lang]}</Label><Input type="number" value={newRule.discount_percent} onChange={e => setNewRule((p: any) => ({ ...p, discount_percent: Number(e.target.value) }))} /></div>
                <div><Label>{t.priority[lang]}</Label><Input type="number" value={newRule.priority} onChange={e => setNewRule((p: any) => ({ ...p, priority: Number(e.target.value) }))} /></div>
              </div>
              <Button className="w-full" onClick={() => createRule.mutate(newRule, { onSuccess: () => setShowCreate(false) })}>{t.create[lang]}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><Target className="h-5 w-5 mx-auto mb-1 text-blue-500" /><p className="text-xs text-muted-foreground">{t.totalSuggestions[lang]}</p><p className="text-xl font-bold">{totalLogs}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" /><p className="text-xs text-muted-foreground">{t.acceptanceRate[lang]}</p><p className="text-xl font-bold">{totalLogs ? ((acceptedLogs / totalLogs) * 100).toFixed(1) : 0}%</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><ShoppingBag className="h-5 w-5 mx-auto mb-1 text-purple-500" /><p className="text-xs text-muted-foreground">{t.ruleBasedHits[lang]}</p><p className="text-xl font-bold">{ruleLogs}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Brain className="h-5 w-5 mx-auto mb-1 text-amber-500" /><p className="text-xs text-muted-foreground">{t.aiHits[lang]}</p><p className="text-xl font-bold">{aiLogs}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">{t.rules[lang]}</TabsTrigger>
          <TabsTrigger value="test"><Zap className="h-3 w-3 mr-1" />{t.aiTest[lang]}</TabsTrigger>
          <TabsTrigger value="analytics">{t.analytics[lang]}</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          {!(rules?.length) ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t.noRules[lang]}</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>
              <th className="p-3 text-left">{t.ruleName[lang]}</th>
              <th className="p-3 text-left">{t.ruleType[lang]}</th>
              <th className="p-3 text-left">{t.triggerItem[lang]}</th>
              <th className="p-3 text-left">{t.recommendedItem[lang]}</th>
              <th className="p-3 text-right">{t.discount[lang]}</th>
              <th className="p-3 text-right">{t.priority[lang]}</th>
              <th className="p-3">{t.active[lang]}</th>
            </tr></thead><tbody>
              {(rules || []).map((r: any) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.rule_name}</td>
                  <td className="p-3"><Badge variant="outline" className="capitalize">{r.rule_type}</Badge></td>
                  <td className="p-3 font-mono text-xs">{r.trigger_item_code || r.trigger_category || '-'}</td>
                  <td className="p-3">{r.recommended_item_name || r.recommended_item_code}</td>
                  <td className="p-3 text-right">{r.discount_percent || 0}%</td>
                  <td className="p-3 text-right">{r.priority}</td>
                  <td className="p-3"><Badge className={r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>{r.is_active ? 'Yes' : 'No'}</Badge></td>
                </tr>
              ))}
            </tbody></table></div></CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="test">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Brain className="h-5 w-5" />AI + Rule-Based Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t.testBasket[lang]} (comma-separated item codes)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={testInput} onChange={e => setTestInput(e.target.value)} placeholder="ITEM-001, ITEM-002" />
                  <Button onClick={handleTest} disabled={testing || !testInput}>{testing ? '...' : t.getRecommendations[lang]}</Button>
                </div>
              </div>
              {testResults.length > 0 && (
                <div className="space-y-2">
                  {testResults.map((r, i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{r.item_name || r.recommended_item_name}</p>
                          <p className="text-xs text-muted-foreground">{r.reason || r.rule_type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{r.source}</Badge>
                          {r.discount_percent > 0 && <Badge className="bg-green-100 text-green-800">-{r.discount_percent}%</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics">
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">{t.source[lang]}</th>
            <th className="p-3 text-left">{t.triggerItem[lang]}</th>
            <th className="p-3 text-left">{t.recommendedItem[lang]}</th>
            <th className="p-3">{t.accepted[lang]}</th>
            <th className="p-3 text-right">Sale</th>
          </tr></thead><tbody>
            {(logs || []).slice(0, 50).map((l: any) => (
              <tr key={l.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-xs">{new Date(l.created_at).toLocaleDateString()}</td>
                <td className="p-3"><Badge variant="outline">{l.source}</Badge></td>
                <td className="p-3 font-mono text-xs">{l.trigger_item_code || '-'}</td>
                <td className="p-3">{l.recommended_item_name || l.recommended_item_code}</td>
                <td className="p-3">{l.was_accepted ? '✅' : '❌'}</td>
                <td className="p-3 text-right">{l.sale_amount ? `${l.sale_amount} SAR` : '-'}</td>
              </tr>
            ))}
          </tbody></table></div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
