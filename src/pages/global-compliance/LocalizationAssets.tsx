import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGlobalComplianceMutations, useLocalizationAssets } from '@/hooks/useGlobalCompliance';
import { CalendarDays, Languages, Landmark, WalletCards, Plus } from 'lucide-react';

export default function LocalizationAssets() {
  const { data } = useLocalizationAssets();
  const { upsertCalendar, upsertLanguage, upsertBanking, upsertPayroll } = useGlobalComplianceMutations();
  const seed = () => {
    upsertCalendar.mutate({ calendar_code: 'GENERIC', calendar_name: 'Generic Regional Calendar', country_code: 'GLOBAL', weekend_days: [5,6], fiscal_year_start_month: 1, holidays: [{ date: '2026-01-01', name: 'New Year' }] });
    upsertLanguage.mutate({ language_code: 'en', language_name: 'English', country_code: 'GLOBAL', direction: 'ltr', labels: { invoice: 'Invoice', tax: 'Tax' } });
    upsertLanguage.mutate({ language_code: 'ar', language_name: 'Arabic', country_code: 'GLOBAL', direction: 'rtl', labels: { invoice: 'فاتورة', tax: 'ضريبة' } });
    upsertBanking.mutate({ format_code: 'ISO20022_GENERIC', format_name: 'Generic ISO20022 Payment File', country_code: 'GLOBAL', standard: 'ISO20022', file_extension: 'xml' });
    upsertPayroll.mutate({ rule_set_code: 'PAYROLL_GENERIC', rule_set_name: 'Generic Payroll Rule Set', earnings_rules: [{ code: 'basic', formula: 'monthly_salary' }], deduction_rules: [{ code: 'social', formula: 'basic * rate' }] });
  };
  return <div className="p-4 md:p-6 space-y-6"><div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Languages className="h-6 w-6 text-primary" /> Calendars, Languages, Banking & Payroll</h1><p className="text-sm text-muted-foreground">Regional calendars, language packs, banking file formats and payroll rules</p></div><Button onClick={seed}><Plus className="h-4 w-4 mr-2" /> Seed Assets</Button></div><Section title="Regional Calendars" icon={CalendarDays} rows={data?.calendars || []} primary="calendar_name" secondary={(r: any) => `${r.country_code} · FY starts month ${r.fiscal_year_start_month}`} badge="calendar_code" /><Section title="Language Packs" icon={Languages} rows={data?.languages || []} primary="language_name" secondary={(r: any) => `${r.language_code} · ${r.direction.toUpperCase()} · ${r.date_format}`} badge="country_code" /><Section title="Banking Formats" icon={Landmark} rows={data?.banking || []} primary="format_name" secondary={(r: any) => `${r.standard} · ${r.format_type} · .${r.file_extension}`} badge="format_code" /><Section title="Payroll Rule Sets" icon={WalletCards} rows={data?.payroll || []} primary="rule_set_name" secondary={(r: any) => `${r.global_country_packs?.pack_name || 'Generic'} · v${r.version}`} badge="status" /></div>;
}
function Section({ title, icon: Icon, rows, primary, secondary, badge }: any) { return <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /> {title}</CardTitle></CardHeader><CardContent className="space-y-2">{rows.map((r: any) => <div key={r.id} className="flex items-center gap-3 p-3 border rounded-md"><div className="flex-1"><p className="font-medium text-sm">{r[primary]}</p><p className="text-xs text-muted-foreground">{secondary(r)}</p></div><Badge variant="outline">{r[badge] || '—'}</Badge></div>)}{!rows.length && <p className="text-sm text-muted-foreground text-center py-8">No records yet</p>}</CardContent></Card>; }
