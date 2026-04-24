import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SyncErrorLogs() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['sync-error-logs', entityFilter],
    queryFn: async () => {
      let q = supabase
        .from('sync_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (entityFilter !== 'all') {
        q = q.eq('entity_type', entityFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const handleClearAll = async () => {
    const { error } = await supabase.from('sync_error_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: language === 'ar' ? 'تم المسح' : 'Cleared', description: language === 'ar' ? 'تم مسح جميع السجلات' : 'All logs cleared' });
      refetch();
    }
  };

  const filtered = (logs || []).filter(l =>
    l.error_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.entity_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const entityTypes = [...new Set((logs || []).map(l => l.entity_type))];

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            {language === 'ar' ? 'سجل أخطاء المزامنة' : 'Sync Error Logs'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'عرض جميع أخطاء المزامنة مع SAP B1' : 'View all SAP B1 synchronization errors'}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={!logs?.length}>
          <Trash2 className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'مسح الكل' : 'Clear All'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' ? 'بحث في الأخطاء...' : 'Search errors...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الكيانات' : 'All Entities'}</SelectItem>
                {entityTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filtered.length} {language === 'ar' ? 'خطأ' : 'errors'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا توجد أخطاء مزامنة 🎉' : 'No sync errors found 🎉'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead className="w-[130px]">{language === 'ar' ? 'الكيان' : 'Entity'}</TableHead>
                    <TableHead className="w-[100px]">{language === 'ar' ? 'الاتجاه' : 'Direction'}</TableHead>
                    <TableHead className="w-[120px]">{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{language === 'ar' ? 'رسالة الخطأ' : 'Error Message'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {log.direction === 'to_sap' ? '→ SAP' : '← SAP'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.entity_code || '-'}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-md truncate">
                        {log.error_message}
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
