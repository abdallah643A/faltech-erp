import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Loader2, ClipboardList } from 'lucide-react';

export default function InventoryCounting() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: countings, isLoading } = useQuery({
    queryKey: ['inventoryCountings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_countings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (countings || []).filter(r =>
    String(r.count_num).includes(searchQuery) || r.warehouse_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'جرد المخزون' : 'Inventory Counting'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'جرد ومطابقة المخزون' : 'Physical stock counting and variance posting'}</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />{language === 'ar' ? 'جرد جديد' : 'New Count'}</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /><CardTitle>{language === 'ar' ? 'عمليات الجرد' : 'Counting Sessions'}</CardTitle></div>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No inventory countings found.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Count #</TableHead><TableHead>Date</TableHead><TableHead>Warehouse</TableHead><TableHead>Counter</TableHead><TableHead>Status</TableHead><TableHead>Sync</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.count_num}</TableCell>
                      <TableCell>{r.count_date}</TableCell>
                      <TableCell>{r.warehouse_code || '-'}</TableCell>
                      <TableCell>{r.counter_user || '-'}</TableCell>
                      <TableCell><Badge variant={r.status === 'open' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                      <TableCell><Badge variant={r.sync_status === 'synced' ? 'outline' : 'secondary'}>{r.sync_status || 'local'}</Badge></TableCell>
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
