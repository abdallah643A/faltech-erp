import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWmsScans } from '@/hooks/useWarehouseExecution';
import { useBatchSerialNumbers } from '@/hooks/useInventoryManagement';
import { Search, Barcode, Hash, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function LotSerialInquiry() {
  const [search, setSearch] = useState('');
  const [searched, setSearched] = useState('');
  const { data: batches } = useBatchSerialNumbers(searched || undefined);
  const { data: scans } = useWmsScans();

  const filteredScans = (scans || []).filter((s: any) => {
    if (!searched) return false;
    const q = searched.toLowerCase();
    return (s.scan_value || '').toLowerCase().includes(q) || (s.item_code || '').toLowerCase().includes(q) || (s.lot_number || '').toLowerCase().includes(q) || (s.serial_number || '').toLowerCase().includes(q);
  });

  const doSearch = () => setSearched(search);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Barcode className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Lot & Serial Inquiry</h1>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by lot #, serial #, or item code..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-9 text-lg h-12" />
            </div>
            <Button onClick={doSearch} className="h-12 px-6">Search</Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <Tabs defaultValue="batches">
          <TabsList>
            <TabsTrigger value="batches"><Hash className="h-4 w-4 mr-1" /> Batch/Serial Records ({batches?.length || 0})</TabsTrigger>
            <TabsTrigger value="scans"><Barcode className="h-4 w-4 mr-1" /> Scan History ({filteredScans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="batches">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Batch/Serial #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(batches || []).map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.item_code}</TableCell>
                        <TableCell className="font-mono">{b.batch_number || b.serial_number}</TableCell>
                        <TableCell><Badge variant="outline">{b.tracking_type}</Badge></TableCell>
                        <TableCell>{b.warehouse_code || '—'}</TableCell>
                        <TableCell className="text-center font-bold">{b.quantity}</TableCell>
                        <TableCell>{b.expiry_date ? format(new Date(b.expiry_date), 'dd MMM yyyy') : '—'}</TableCell>
                        <TableCell><Badge variant={b.status === 'available' ? 'default' : 'secondary'}>{b.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {(!batches || batches.length === 0) && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No batch/serial records found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scans">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scan Value</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScans.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono">{s.scan_value}</TableCell>
                        <TableCell><Badge variant="outline">{s.scan_type}</Badge></TableCell>
                        <TableCell>{s.item_code || '—'}</TableCell>
                        <TableCell>{s.location || s.bin_code || '—'}</TableCell>
                        <TableCell><Badge variant={s.scan_result === 'success' ? 'default' : 'destructive'}>{s.scan_result}</Badge></TableCell>
                        <TableCell className="text-xs">{s.created_at ? format(new Date(s.created_at), 'dd MMM HH:mm') : '—'}</TableCell>
                      </TableRow>
                    ))}
                    {filteredScans.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No scan history found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
