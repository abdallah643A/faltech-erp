import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, TrendingDown, DollarSign, Globe, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const labels: Record<string, Record<string, string>> = {
  en: { title: 'Multi-Currency Dashboard', subtitle: 'Real-time foreign exchange tracking and exposure analysis', refresh: 'Refresh Rates', currency: 'Currency', rate: 'Rate', change: 'Change (24h)', exposure: 'Exposure', unrealizedGL: 'Unrealized G/L', totalExposure: 'Total FX Exposure', unrealizedGain: 'Unrealized Gain', unrealizedLoss: 'Unrealized Loss', highRisk: 'High Risk Currencies', receivables: 'Receivables', payables: 'Payables', net: 'Net' },
  ar: { title: 'لوحة العملات المتعددة', subtitle: 'تتبع أسعار الصرف في الوقت الفعلي وتحليل التعرض', refresh: 'تحديث الأسعار', currency: 'العملة', rate: 'السعر', change: 'التغير (24 ساعة)', exposure: 'التعرض', unrealizedGL: 'أرباح/خسائر غير محققة', totalExposure: 'إجمالي التعرض', unrealizedGain: 'أرباح غير محققة', unrealizedLoss: 'خسائر غير محققة', highRisk: 'عملات عالية المخاطر', receivables: 'مستحقات', payables: 'دائنة', net: 'صافي' },
  ur: { title: 'ملٹی کرنسی ڈیش بورڈ', subtitle: 'ریئل ٹائم زرمبادلہ ٹریکنگ اور ایکسپوژر تجزیہ', refresh: 'شرح تازہ کریں', currency: 'کرنسی', rate: 'شرح', change: 'تبدیلی (24 گھنٹے)', exposure: 'ایکسپوژر', unrealizedGL: 'غیر محقق نفع/نقصان', totalExposure: 'کل FX ایکسپوژر', unrealizedGain: 'غیر محقق نفع', unrealizedLoss: 'غیر محقق نقصان', highRisk: 'زیادہ خطرے والی کرنسیاں', receivables: 'قابل وصول', payables: 'قابل ادائیگی', net: 'خالص' },
  hi: { title: 'मल्टी-करेंसी डैशबोर्ड', subtitle: 'रीयल-टाइम विदेशी मुद्रा ट्रैकिंग और एक्सपोज़र विश्लेषण', refresh: 'दरें रिफ्रेश करें', currency: 'मुद्रा', rate: 'दर', change: 'परिवर्तन (24 घंटे)', exposure: 'एक्सपोज़र', unrealizedGL: 'अवास्तविक लाभ/हानि', totalExposure: 'कुल FX एक्सपोज़र', unrealizedGain: 'अवास्तविक लाभ', unrealizedLoss: 'अवास्तविक हानि', highRisk: 'उच्च जोखिम मुद्राएँ', receivables: 'प्राप्य', payables: 'देय', net: 'शुद्ध' },
};

const currencyData = [
  { code: 'USD', name: 'US Dollar', rate: 3.7500, change: 0.0012, receivables: 450000, payables: 280000, unrealized: 12500 },
  { code: 'EUR', name: 'Euro', rate: 4.0850, change: -0.0235, receivables: 180000, payables: 95000, unrealized: -8200 },
  { code: 'GBP', name: 'British Pound', rate: 4.7200, change: 0.0180, receivables: 75000, payables: 120000, unrealized: -3400 },
  { code: 'AED', name: 'UAE Dirham', rate: 1.0204, change: 0.0001, receivables: 320000, payables: 180000, unrealized: 450 },
  { code: 'INR', name: 'Indian Rupee', rate: 0.0446, change: -0.0003, receivables: 5000000, payables: 2000000, unrealized: -15600 },
  { code: 'PKR', name: 'Pakistani Rupee', rate: 0.0134, change: -0.0001, receivables: 800000, payables: 500000, unrealized: -2100 },
];

export function MultiCurrencyDashboard() {
  const { language } = useLanguage();
  const l = labels[language] || labels.en;

  const totalExposure = currencyData.reduce((s, c) => s + Math.abs(c.receivables - c.payables) * c.rate, 0);
  const totalGain = currencyData.filter(c => c.unrealized > 0).reduce((s, c) => s + c.unrealized, 0);
  const totalLoss = Math.abs(currencyData.filter(c => c.unrealized < 0).reduce((s, c) => s + c.unrealized, 0));
  const highRisk = currencyData.filter(c => Math.abs(c.change / c.rate) > 0.003).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">{l.title}</h3><p className="text-sm text-muted-foreground">{l.subtitle}</p></div>
        <Button size="sm" variant="outline" className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />{l.refresh}</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><Globe className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-muted-foreground">{l.totalExposure}</span></div><p className="text-xl font-bold">{Math.round(totalExposure).toLocaleString()} SAR</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><TrendingUp className="h-3.5 w-3.5 text-success" /><span className="text-xs text-muted-foreground">{l.unrealizedGain}</span></div><p className="text-xl font-bold text-success">{totalGain.toLocaleString()} SAR</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><TrendingDown className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-muted-foreground">{l.unrealizedLoss}</span></div><p className="text-xl font-bold text-destructive">{totalLoss.toLocaleString()} SAR</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><AlertTriangle className="h-3.5 w-3.5 text-warning" /><span className="text-xs text-muted-foreground">{l.highRisk}</span></div><p className="text-2xl font-bold">{highRisk}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{l.currency}</TableHead><TableHead>{l.rate}</TableHead><TableHead>{l.change}</TableHead>
              <TableHead>{l.receivables}</TableHead><TableHead>{l.payables}</TableHead><TableHead>{l.net}</TableHead><TableHead>{l.unrealizedGL}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {currencyData.map(c => (
                <TableRow key={c.code}>
                  <TableCell><div className="flex items-center gap-2"><Badge variant="outline">{c.code}</Badge><span className="text-xs text-muted-foreground">{c.name}</span></div></TableCell>
                  <TableCell className="font-mono">{c.rate.toFixed(4)}</TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 text-xs ${c.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {c.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {c.change >= 0 ? '+' : ''}{c.change.toFixed(4)}
                    </span>
                  </TableCell>
                  <TableCell>{c.receivables.toLocaleString()}</TableCell>
                  <TableCell>{c.payables.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">{(c.receivables - c.payables).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`font-bold ${c.unrealized >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {c.unrealized >= 0 ? '+' : ''}{c.unrealized.toLocaleString()} SAR
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
