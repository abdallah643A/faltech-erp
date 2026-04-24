import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'quotation_no', header: 'Quotation No.' },
  { key: 'customer', header: 'Customer' },
  { key: 'date', header: 'Date' },
  { key: 'valid_until', header: 'Valid Until' },
  { key: 'amount', header: 'Amount' },
  { key: 'closing', header: 'Closing %' },
  { key: 'status', header: 'Status' },
];


const mockData = [
  { id: '1', quoteNo: 'QT-2025-00142', customer: 'Al Rajhi Corp', date: '2025-03-15', validUntil: '2025-04-15', amount: 125000, closingPct: 80, status: 'Open' },
  { id: '2', quoteNo: 'QT-2025-00143', customer: 'SABIC', date: '2025-03-20', validUntil: '2025-04-20', amount: 89500, closingPct: 50, status: 'Closed' },
  { id: '3', quoteNo: 'QT-2025-00144', customer: 'Aramco', date: '2025-03-25', validUntil: '2025-04-25', amount: 234000, closingPct: 30, status: 'Open' },
  { id: '4', quoteNo: 'QT-2025-00145', customer: 'STC', date: '2025-04-01', validUntil: '2025-05-01', amount: 67000, closingPct: 90, status: 'Cancelled' },
];

const statusColors: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800',
  Closed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function SalesQuotationReport() {
  const totalQuotes = mockData.length;
  const closedQuotes = mockData.filter(d => d.status === 'Closed').length;
  const conversionRate = totalQuotes > 0 ? (closedQuotes / totalQuotes * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Sales Quotation Report</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="sales-quotation-report" title="Sales Quotation Report" />
      </div>

      {/* Conversion summary */}
      <div className="bg-white rounded border border-[#d0d5dd] p-4 flex items-center gap-6">
        <div className="text-center"><div className="text-2xl font-bold text-[#0066cc]">{totalQuotes}</div><div className="text-xs text-gray-500">Total Quotations</div></div>
        <div className="text-gray-300">→</div>
        <div className="text-center"><div className="text-2xl font-bold text-green-600">{closedQuotes}</div><div className="text-xs text-gray-500">Converted to Orders</div></div>
        <div className="text-gray-300">=</div>
        <div className="text-center"><div className="text-2xl font-bold">{conversionRate}%</div><div className="text-xs text-gray-500">Conversion Rate</div></div>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-3">
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Status</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="flex items-end"><Button className="bg-[#0066cc] h-8">Apply</Button></div>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
            <th className="text-left px-3 py-2">Quotation No.</th><th className="text-left px-3 py-2">Customer</th><th className="text-left px-3 py-2">Date</th>
            <th className="text-left px-3 py-2">Valid Until</th><th className="text-right px-3 py-2">Amount</th><th className="text-right px-3 py-2">Closing %</th><th className="text-center px-3 py-2">Status</th>
          </tr></thead>
          <tbody>
            {mockData.map(r => (
              <tr key={r.id} className="border-b border-[#d0d5dd]">
                <td className="px-3 py-2.5 font-mono">{r.quoteNo}</td>
                <td className="px-3 py-2.5">{r.customer}</td>
                <td className="px-3 py-2.5">{r.date}</td>
                <td className="px-3 py-2.5">{r.validUntil}</td>
                <td className="px-3 py-2.5 text-right font-mono">{r.amount.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right">{r.closingPct}%</td>
                <td className="px-3 py-2.5 text-center"><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
