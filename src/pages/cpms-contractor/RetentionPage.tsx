import { useRetentionLedger } from '@/hooks/useContractorSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShieldCheck } from 'lucide-react';

export default function RetentionPage() {
  const { language } = useLanguage(); const isAr = language === 'ar';
  const { data = [], isLoading } = useRetentionLedger();

  const totals = data.reduce((a: any, r: any) => {
    const amt = Number(r.amount);
    if (r.movement_type === 'withhold') a.withheld += amt;
    else if (r.movement_type.startsWith('release')) a.released += amt;
    return a;
  }, { withheld: 0, released: 0 });

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />{isAr ? 'دفتر الضمانات المحتجزة' : 'Retention Ledger'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'محتجزات العميل والمقاولين الفرعيين' : 'Client & subcontractor retention movements'}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? 'محتجز' : 'Withheld'}</p><p className="text-2xl font-bold">{totals.withheld.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? 'مفرج عنه' : 'Released'}</p><p className="text-2xl font-bold text-emerald-600">{totals.released.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isAr ? 'الرصيد' : 'Balance'}</p><p className="text-2xl font-bold text-primary">{(totals.withheld - totals.released).toLocaleString()}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>{isAr ? 'الحركات' : 'Movements'}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Party</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.movement_date}</TableCell>
                    <TableCell><Badge variant="outline">{r.party}</Badge></TableCell>
                    <TableCell>{r.movement_type}</TableCell>
                    <TableCell className="text-right font-semibold">{Number(r.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reference}</TableCell>
                  </TableRow>
                ))}
                {!data.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">{isAr ? 'لا توجد حركات' : 'No retention movements yet'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
