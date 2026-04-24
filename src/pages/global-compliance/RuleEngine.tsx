import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCountryPacks, useGlobalComplianceMutations, useRegulatoryRules } from '@/hooks/useGlobalCompliance';
import { FunctionSquare, Plus } from 'lucide-react';

export default function RuleEngine() {
  const { data: packs } = useCountryPacks();
  const { data: rules } = useRegulatoryRules();
  const { upsertRule } = useGlobalComplianceMutations();
  const [form, setForm] = useState({ country_pack_id: '', rule_code: '', rule_name: '', rule_domain: 'tax', formula_expression: 'round(net_amount * tax_rate, 2)', status: 'draft', version: 1 });
  return <div className="p-4 md:p-6 space-y-6"><div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold flex items-center gap-2"><FunctionSquare className="h-6 w-6 text-primary" /> Low-code Regulatory Rules</h1><p className="text-sm text-muted-foreground">Versioned formulas for tax, withholding, payroll, e-documents, banking and statutory reports</p></div><Dialog><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Rule</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>New Rule</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Pack</Label><Select value={form.country_pack_id} onValueChange={(v) => setForm({ ...form, country_pack_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(packs || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.pack_name}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-2"><div><Label>Code</Label><Input value={form.rule_code} onChange={(e) => setForm({ ...form, rule_code: e.target.value })} /></div><div><Label>Name</Label><Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} /></div></div><div><Label>Domain</Label><Select value={form.rule_domain} onValueChange={(v) => setForm({ ...form, rule_domain: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['tax','invoicing','e_documents','withholding','banking','payroll','statutory_reports'].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div><div><Label>Formula</Label><Textarea className="font-mono" value={form.formula_expression} onChange={(e) => setForm({ ...form, formula_expression: e.target.value })} /></div><Button className="w-full" onClick={() => upsertRule.mutate(form)}>Save</Button></div></DialogContent></Dialog></div><Card><CardHeader><CardTitle className="text-sm">Rules</CardTitle></CardHeader><CardContent className="space-y-2">{(rules || []).map((r: any) => <div key={r.id} className="p-3 border rounded-md"><div className="flex items-center gap-2"><Badge>{r.rule_domain}</Badge><Badge variant="outline">v{r.version}</Badge><Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>{r.status}</Badge></div><p className="font-medium text-sm mt-2">{r.rule_name}</p><p className="font-mono text-xs text-muted-foreground">{r.formula_expression}</p></div>)}{!rules?.length && <p className="text-sm text-muted-foreground text-center py-8">No rules configured</p>}</CardContent></Card></div>;
}
