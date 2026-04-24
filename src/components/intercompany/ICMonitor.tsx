import { useICTransactions } from '@/hooks/useIntercompany';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default', posted: 'default', pending: 'outline', processing: 'secondary',
  failed: 'destructive', cancelled: 'secondary', reversed: 'secondary', draft: 'outline',
};

export default function ICMonitor() {
  const { t } = useLanguage();
  const { transactions, isLoading } = useICTransactions();
  const { companies } = useSAPCompanies();

  const companyName = (id: string) => companies.find(c => c.id === id)?.company_name || id?.slice(0, 8);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ic.txNumber')}</TableHead>
              <TableHead>{t('ic.type')}</TableHead>
              <TableHead>{t('ic.source')}</TableHead>
              <TableHead>{t('ic.sourceDoc')}</TableHead>
              <TableHead>{t('ic.target')}</TableHead>
              <TableHead>{t('ic.targetDoc')}</TableHead>
              <TableHead>{t('ic.amount')}</TableHead>
              <TableHead>{t('ic.mirrorStatus')}</TableHead>
              <TableHead>{t('ic.sourcePosting')}</TableHead>
              <TableHead>{t('ic.targetPosting')}</TableHead>
              <TableHead>{t('common.date')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">{t('ic.noTransactions')}</TableCell></TableRow>
            ) : transactions.map((tx: any) => (
              <TableRow key={tx.id}>
                <TableCell className="font-mono text-xs font-medium">{tx.transaction_number}</TableCell>
                <TableCell><Badge variant="outline">{tx.transaction_type?.replace(/_/g, ' ')}</Badge></TableCell>
                <TableCell className="text-sm">{companyName(tx.source_company_id)}</TableCell>
                <TableCell className="text-xs">{tx.source_doc_number || '—'}</TableCell>
                <TableCell className="text-sm">{companyName(tx.target_company_id)}</TableCell>
                <TableCell className="text-xs">{tx.target_doc_number || '—'}</TableCell>
                <TableCell className="text-right font-medium">{Number(tx.total_amount || 0).toLocaleString()} {tx.source_currency}</TableCell>
                <TableCell><Badge variant={STATUS_COLORS[tx.mirror_status] || 'outline'}>{tx.mirror_status}</Badge></TableCell>
                <TableCell><Badge variant={STATUS_COLORS[tx.source_posting_status] || 'outline'}>{tx.source_posting_status}</Badge></TableCell>
                <TableCell><Badge variant={STATUS_COLORS[tx.target_posting_status] || 'outline'}>{tx.target_posting_status}</Badge></TableCell>
                <TableCell className="text-xs">{tx.created_at ? format(new Date(tx.created_at), 'dd/MM/yy HH:mm') : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
