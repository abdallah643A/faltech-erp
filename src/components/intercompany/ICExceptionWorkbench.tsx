import { useState } from 'react';
import { useICExceptions } from '@/hooks/useIntercompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const SEV_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'outline',
};

export default function ICExceptionWorkbench() {
  const { t } = useLanguage();
  const { exceptions, isLoading, resolveException } = useICExceptions();
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleResolve = () => {
    if (!resolveId) return;
    resolveException.mutate({ id: resolveId, notes }, { onSuccess: () => { setResolveId(null); setNotes(''); } });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ic.severity')}</TableHead>
                <TableHead>{t('ic.exceptionType')}</TableHead>
                <TableHead>{t('ic.title')}</TableHead>
                <TableHead>{t('ic.description')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('ic.retries')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('ic.noExceptions')}</TableCell></TableRow>
              ) : exceptions.map((ex: any) => (
                <TableRow key={ex.id}>
                  <TableCell><Badge variant={SEV_COLORS[ex.severity] || 'outline'}>{ex.severity}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{ex.exception_type?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{ex.title}</TableCell>
                  <TableCell className="text-xs max-w-[250px] truncate text-muted-foreground">{ex.description}</TableCell>
                  <TableCell><Badge variant={ex.status === 'resolved' ? 'default' : ex.status === 'open' ? 'destructive' : 'secondary'}>{ex.status}</Badge></TableCell>
                  <TableCell>{ex.retry_count}</TableCell>
                  <TableCell className="text-xs">{ex.created_at ? format(new Date(ex.created_at), 'dd/MM/yy HH:mm') : ''}</TableCell>
                  <TableCell>
                    {ex.status !== 'resolved' && (
                      <Button size="sm" variant="outline" onClick={() => { setResolveId(ex.id); setNotes(''); }}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />{t('ic.resolve')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!resolveId} onOpenChange={() => setResolveId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('ic.resolveException')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('ic.resolutionNotes')} rows={3} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResolveId(null)}>{t('common.cancel')}</Button>
              <Button onClick={handleResolve} disabled={resolveException.isPending}>{t('ic.markResolved')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
