import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, Loader2, Building2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

export default function PaymentMeansSettings() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['payment-means-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_means_accounts')
        .select('*')
        .order('acct_code');
      if (error) throw error;
      return data;
    },
  });

  const handleSyncFromSAP = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sap-sync', {
        body: { action: 'sync', entity: 'payment_means', direction: 'from_sap' },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: language === 'ar' ? 'تمت المزامنة' : 'Sync Complete', description: `Synced: ${data.synced || 0}, Created: ${data.created || 0}` });
        queryClient.invalidateQueries({ queryKey: ['payment-means-accounts'] });
      } else {
        toast({ title: 'Sync Failed', description: data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Sync Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('payment_means_accounts')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['payment-means-accounts'] });
    }
  };

  const filtered = (accounts || []).filter(a =>
    a.acct_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.acct_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'إعدادات وسائل الدفع' : 'Payment Means Settings'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة حسابات البنك / الأستاذ العام من SAP B1' : 'Manage G/L bank accounts synced from SAP B1'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSyncFromSAP} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {language === 'ar' ? 'مزامنة من SAP' : 'Sync from SAP'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/sync-error-logs')}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'سجل الأخطاء' : 'Error Logs'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>{language === 'ar' ? 'حسابات الأستاذ العام (مالية)' : 'G/L Accounts (Finance)'}</CardTitle>
            </div>
            <Badge variant="secondary">{filtered.length} {language === 'ar' ? 'حساب' : 'accounts'}</Badge>
          </div>
          <CardDescription>
            {language === 'ar'
              ? 'الحسابات المالية من SAP B1 (OACT) - حيث Finanse = Y'
              : 'Financial accounts from SAP B1 (OACT) where Finance = Y'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' ? 'بحث...' : 'Search accounts...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا توجد حسابات. قم بالمزامنة من SAP أولاً.' : 'No accounts found. Sync from SAP first.'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">{language === 'ar' ? 'رمز الحساب' : 'Account Code'}</TableHead>
                    <TableHead>{language === 'ar' ? 'اسم الحساب' : 'Account Name'}</TableHead>
                    <TableHead className="w-[80px] text-center">{language === 'ar' ? 'المزامنة' : 'Sync'}</TableHead>
                    <TableHead className="w-[100px] text-center">{language === 'ar' ? 'نشط' : 'Active'}</TableHead>
                    <TableHead className="w-[180px]">{language === 'ar' ? 'آخر مزامنة' : 'Last Synced'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">{account.acct_code}</TableCell>
                      <TableCell>{account.acct_name}</TableCell>
                      <TableCell className="text-center">
                        {account.last_sync_error ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">Error</Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs break-words">
                              <p className="font-semibold text-destructive mb-1">Sync Error:</p>
                              <p>{account.last_sync_error}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : account.sap_synced_at ? (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-success text-success">Synced</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">Local</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={account.is_active}
                          onCheckedChange={() => toggleActive(account.id, account.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {account.sap_synced_at ? new Date(account.sap_synced_at).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
