import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Plus, Loader2, PackageMinus, MoreVertical, Eye, Edit, RefreshCw } from 'lucide-react';
import { ERPDocInfo } from '@/components/sap/ERPSyncBadge';
import { useToast } from '@/hooks/use-toast';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { SyncStatusBadge } from '@/components/sap/SyncStatusBadge';
import { useSAPSync } from '@/hooks/useSAPSync';

export default function GoodsIssue() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const { sync, isLoading: isSyncing } = useSAPSync();

  const { data: issues, isLoading } = useQuery({
    queryKey: ['inventoryGoodsIssues'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_goods_issues').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (issues || []).filter(r =>
    String(r.doc_num).includes(searchQuery) || r.warehouse_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'صرف بضاعة' : 'Goods Issue'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'صرف بضاعة لغير المبيعات' : 'Stock decrease for non-sales purposes'}</p>
        </div>
        <div className="flex items-center gap-2">
          <SAPSyncButton entity="inventory_goods_issue" />
          <Button><Plus className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة' : 'Add New'}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><PackageMinus className="h-5 w-5" /><CardTitle>{language === 'ar' ? 'صرف بضاعة' : 'Goods Issues'}</CardTitle></div>
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
            <div className="text-center py-8 text-muted-foreground">No goods issues found.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Doc No.</TableHead><TableHead>Date</TableHead><TableHead>Warehouse</TableHead><TableHead>Reason</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>ERP Doc</TableHead><TableHead>Sync</TableHead><TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.doc_num}</TableCell>
                      <TableCell>{r.doc_date}</TableCell>
                      <TableCell>{r.warehouse_code || '-'}</TableCell>
                      <TableCell>{r.reason || '-'}</TableCell>
                      <TableCell>{Number(r.total || 0).toLocaleString()} SAR</TableCell>
                      <TableCell><Badge variant={r.status === 'open' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                      <TableCell><ERPDocInfo erpDocEntry={r.erp_doc_entry} erpDocNum={r.erp_doc_num} /></TableCell>
                      <TableCell><SyncStatusBadge syncStatus={r.sync_status} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => sync('inventory_goods_issue', 'to_sap', r.id)} disabled={isSyncing}>
                              <RefreshCw className="mr-2 h-4 w-4" />Sync to SAP
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sync('inventory_goods_issue', 'from_sap', r.id)} disabled={isSyncing}>
                              <RefreshCw className="mr-2 h-4 w-4" />Pull from SAP
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
