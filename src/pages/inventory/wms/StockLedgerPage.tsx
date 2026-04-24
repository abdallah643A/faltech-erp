import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useStockLedger } from '@/hooks/useWMS';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { format } from 'date-fns';

const movementColor: Record<string, string> = {
  receipt: 'bg-green-100 text-green-800',
  issue: 'bg-red-100 text-red-800',
  transfer_in: 'bg-blue-100 text-blue-800',
  transfer_out: 'bg-orange-100 text-orange-800',
  adjustment: 'bg-purple-100 text-purple-800',
  reservation: 'bg-yellow-100 text-yellow-800',
};

export default function StockLedgerPage() {
  const [itemCode, setItemCode] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const { data = [], isLoading } = useStockLedger({
    itemCode: itemCode || undefined,
    warehouseCode: warehouseCode || undefined,
    limit: 500,
  });

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Real-Time Stock Ledger</h1>
          <p className="text-xs text-blue-100">Append-only journal of every stock movement</p>
        </div>
        <ExportImportButtons data={data} columns={[
          { key: 'txn_date', header: 'Date' },
          { key: 'item_code', header: 'Item' },
          { key: 'warehouse_code', header: 'Warehouse' },
          { key: 'movement_type', header: 'Type' },
          { key: 'quantity', header: 'Qty' },
          { key: 'running_balance', header: 'Balance' },
        ]} filename="stock-ledger" title="Stock Ledger" />
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Item Code</Label><Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="All items" className="h-9" /></div>
            <div><Label className="text-xs">Warehouse</Label><Input value={warehouseCode} onChange={(e) => setWarehouseCode(e.target.value)} placeholder="All warehouses" className="h-9" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Movements ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-left">Warehouse</th>
                  <th className="p-2 text-left">Bin</th>
                  <th className="p-2 text-left">Batch / Serial</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Balance</th>
                  <th className="p-2 text-left">Reference</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">Loading…</td></tr>}
                {!isLoading && data.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No movements yet</td></tr>}
                {data.map((m: any) => (
                  <tr key={m.id} className="border-b hover:bg-accent/30">
                    <td className="p-2">{format(new Date(m.txn_date), 'MMM d, HH:mm')}</td>
                    <td className="p-2 font-mono">{m.item_code}</td>
                    <td className="p-2">{m.warehouse_code}</td>
                    <td className="p-2">{m.bin_code || '—'}</td>
                    <td className="p-2 text-xs">{m.batch_number || m.serial_number || '—'}</td>
                    <td className="p-2"><Badge className={movementColor[m.movement_type] || 'bg-gray-100 text-gray-800'}>{m.movement_type}</Badge></td>
                    <td className="p-2 text-right font-mono">{Number(m.quantity).toFixed(2)} {m.uom || ''}</td>
                    <td className="p-2 text-right font-mono">{m.running_balance != null ? Number(m.running_balance).toFixed(2) : '—'}</td>
                    <td className="p-2 text-xs">{m.reference_doc_num || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
