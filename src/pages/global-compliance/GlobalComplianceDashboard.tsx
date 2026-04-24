import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGlobalComplianceMutations, useGlobalComplianceStats } from '@/hooks/useGlobalCompliance';
import { Globe2, ShieldCheck, Building2, FileText, Languages, CalendarDays, Landmark, ScrollText } from 'lucide-react';

const pages = [
  { title: 'Country Packs', href: '/global-compliance/country-packs', icon: Globe2, desc: 'Reusable regulatory packs for tax, e-docs, payroll, banking and reports' },
  { title: 'Rule Engine', href: '/global-compliance/rule-engine', icon: ShieldCheck, desc: 'Low-code formula rules with versions and effective dates' },
  { title: 'Legal Entities', href: '/global-compliance/legal-entities', icon: Building2, desc: 'Hybrid tenant defaults with legal entity overrides' },
  { title: 'Calendars & Languages', href: '/global-compliance/localization', icon: Languages, desc: 'Regional calendars, language packs, RTL, print terms' },
  { title: 'Statutory Reports', href: '/global-compliance/statutory', icon: ScrollText, desc: 'Configurable obligations, due dates and output formats' },
];

export default function GlobalComplianceDashboard() {
  const { data } = useGlobalComplianceStats();
  const { seedGenericPacks } = useGlobalComplianceMutations();
  return <div className="p-4 md:p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Globe2 className="h-6 w-6 text-primary" /> Global Compliance Layer</h1><p className="text-sm text-muted-foreground">Configurable country-by-country localization without hardcoded one-country logic</p></div><Button onClick={() => seedGenericPacks.mutate()} disabled={seedGenericPacks.isPending}>Seed Generic Packs</Button></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Metric title="Country Packs" value={data?.packs.count || 0} icon={Globe2} /><Metric title="Rules" value={data?.rules.count || 0} icon={ShieldCheck} /><Metric title="Legal Entities" value={data?.entities.count || 0} icon={Building2} /><Metric title="Reports" value={data?.reports.count || 0} icon={FileText} /></div>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{pages.map((p) => <Card key={p.href}><CardContent className="p-4 space-y-3"><div className="flex gap-3"><div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center"><p.icon className="h-5 w-5 text-primary" /></div><div><h3 className="font-semibold">{p.title}</h3><p className="text-xs text-muted-foreground">{p.desc}</p></div></div><Button asChild variant="outline" size="sm" className="w-full"><Link to={p.href}>Open</Link></Button></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle className="text-sm">Framework Coverage</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{['VAT/GST','Withholding','E-Invoicing','E-Documents','Banking Formats','Payroll Rules','Statutory Reports','Language Packs','Regional Calendars','Legal Entity Controls'].map((x) => <Badge key={x} variant="outline">{x}</Badge>)}</CardContent></Card>
  </div>;
}
function Metric({ title, value, icon: Icon }: any) { return <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{title}</p><Icon className="h-4 w-4 text-primary" /></div><p className="text-2xl font-bold">{value}</p></CardContent></Card>; }
