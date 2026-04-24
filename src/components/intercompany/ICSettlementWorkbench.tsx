import { useICSettlements } from '@/hooks/useIntercompany';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  posted: 'default', approved: 'default', pending_approval: 'secondary', draft: 'outline', cancelled: 'secondary',
};

export default function ICSettlementWorkbench() {
  const { t } = useLanguage();
  const { settlements, isLoading } = useICSettlements();
  const { companies } = useSAPCompanies();

  const companyName = (id: string) => companies.find(c => c.id === id)?.company_name || id?.slice(0, 8);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ic.settlementNo')}</TableHead>
              <TableHead>{t('ic.type')}</TableHead>
              <TableHead>{t('ic.source')}</TableHead>
              <TableHead>{t('ic.target')}</TableHead>
              <TableHead>{t('ic.dueTo')}</TableHead>
              <TableHead>{t('ic.dueFrom')}</TableHead>
              <TableHead>{t('ic.netAmount')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('ic.settlementDate')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('ic.noSettlements')}</TableCell></TableRow>
            ) : settlements.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs font-medium">{s.settlement_number}</TableCell>
                <TableCell><Badge variant="outline">{s.settlement_type}</Badge></TableCell>
                <TableCell>{companyName(s.source_company_id)}</TableCell>
                <TableCell>{companyName(s.target_company_id)}</TableCell>
                <TableCell className="text-right">{Number(s.due_to_amount || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">{Number(s.due_from_amount || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{Number(s.net_amount || 0).toLocaleString()} {s.settlement_currency}</TableCell>
                <TableCell><Badge variant={STATUS_COLORS[s.status] || 'outline'}>{s.status}</Badge></TableCell>
                <TableCell className="text-xs">{s.settlement_date ? format(new Date(s.settlement_date), 'dd/MM/yyyy') : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
