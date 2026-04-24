import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard } from '@/components/ui/kpi-card';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { useAPAgingData, type AgingFilters, type AgingPartnerSummary } from '@/hooks/useAgingReportData';
import { formatSAR, formatSARShort } from '@/lib/currency';
import { DollarSign, Clock, AlertTriangle, TrendingDown, ChevronDown, ChevronUp, Filter, Download, Printer, ChevronRight, FileText, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const currentDate = new Date().toISOString().split('T')[0];

const CHART_COLORS = [
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function APAgingReport() {
  const [filters, setFilters] = useState<AgingFilters>({
    companyIds: [], branchId: '', customerId: '', vendorId: '',
    asOfDate: currentDate, projectId: '', costCenter: '', currency: '',
    includeZero: false, dateBasis: 'due_date', buckets: [0, 30, 60, 90, 120],
  });
  const [generated, setGenerated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  useDefaultReportCompanyIds(setFilters);

  const data = useAPAgingData(filters, generated);

  const { data: branches = [] } = useQuery({
    queryKey: ['aging-branches-ap'],
    queryFn: async () => { const { data } = await supabase.from('branches').select('id, name').order('name'); return data || []; },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['aging-vendors'],
    queryFn: async () => {
      const { data } = await supabase.from('business_partners').select('id, card_code, card_name').eq('card_type', 'supplier').order('card_name').limit(500);
      return data || [];
    },
  });

  const filteredPartners = data.partners.filter(p =>
    !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = data.bucketLabels.map((label, i) => ({
    name: label, amount: data.bucketTotals[i], color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const handleExportExcel = useCallback(() => {
    const rows = data.partners.flatMap(p => p.invoices.map(inv => ({
      'Vendor Code': p.code, 'Vendor Name': p.name,
      'Invoice #': inv.docNum, 'Doc Date': inv.docDate, 'Due Date': inv.dueDate,
      'Days Overdue': inv.daysOverdue, 'Balance Due': inv.balanceDue,
      'Currency': inv.currency, 'Status': inv.status,
    })));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AP Aging');
    XLSX.writeFile(wb, `AP_Aging_${filters.asOfDate}.xlsx`);
  }, [data, filters]);

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Accounts Payable Aging Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`As of: ${filters.asOfDate}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['Vendor', 'Total Outstanding', ...data.bucketLabels, 'Invoices']],
      body: data.partners.map(p => [
        p.name,
        formatSAR(p.totalOutstanding),
        formatSAR(p.current),
        formatSAR(p.bucket1),
        formatSAR(p.bucket2),
        formatSAR(p.bucket3),
        formatSAR(p.bucket5),
        String(p.invoiceCount),
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`AP_Aging_${filters.asOfDate}.pdf`);
  }, [data, filters]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Accounts Payable Aging</h1>
          <p className="text-sm text-muted-foreground">Analyze vendor outstanding balances by aging bucket</p>
        </div>
        {generated && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="h-4 w-4 mr-1" />PDF</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Companies</Label>
              <CompanyMultiSelect selectedIds={filters.companyIds} onChange={v => setFilters(f => ({ ...f, companyIds: v }))} />
            </div>
            <div>
              <Label className="text-xs">As of Date</Label>
              <Input type="date" value={filters.asOfDate} onChange={e => setFilters(f => ({ ...f, asOfDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={filters.branchId || 'all'} onValueChange={v => setFilters(f => ({ ...f, branchId: v === 'all' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date Basis</Label>
              <Select value={filters.dateBasis} onValueChange={v => setFilters(f => ({ ...f, dateBasis: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="doc_date">Document Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={() => setGenerated(true)}>
                <Filter className="h-4 w-4 mr-1" /> Generate
              </Button>
            </div>
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2 text-xs">
                {showAdvanced ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Advanced Filters
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Vendor</Label>
                  <Select value={filters.vendorId || 'all'} onValueChange={v => setFilters(f => ({ ...f, vendorId: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map(v => <SelectItem key={v.id} value={v.card_code || v.id}>{v.card_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={filters.currency || 'all'} onValueChange={v => setFilters(f => ({ ...f, currency: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={filters.includeZero} onCheckedChange={v => setFilters(f => ({ ...f, includeZero: v }))} />
                  <Label className="text-xs">Include zero balance</Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {generated && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard icon={<DollarSign className="h-4 w-4 text-primary" />} label="Total Payable" value={`SAR ${formatSARShort(data.totalOutstanding)}`} subtitle={`${data.partners.length} vendors`} />
            <KPICard icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Overdue (>30 days)" value={`SAR ${formatSARShort(data.totalOverdue)}`} subtitle={`${((data.totalOverdue / (data.totalOutstanding || 1)) * 100).toFixed(0)}% of total`} />
            <KPICard icon={<Clock className="h-4 w-4 text-chart-2" />} label="Current" value={`SAR ${formatSARShort(data.currentTotal)}`} />
            <KPICard icon={<TrendingDown className="h-4 w-4 text-chart-4" />} label="Above 90 Days" value={`SAR ${formatSARShort(data.above90Total)}`} />
            <KPICard icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} label="DPO (Est.)" value={data.totalOutstanding > 0 ? `${Math.round(data.partners.reduce((s, p) => s + p.invoices.reduce((a, i) => a + i.daysOverdue * i.balanceDue, 0), 0) / data.totalOutstanding)} days` : '0 days'} tooltip="Weighted average days payable outstanding" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Aging Bucket Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatSARShort(v)} />
                    <Tooltip formatter={(v: number) => `SAR ${formatSAR(v)}`} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 Overdue Vendors</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.topOverdue.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatSARShort(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                    <Tooltip formatter={(v: number) => `SAR ${formatSAR(v)}`} />
                    <Bar dataKey="totalOutstanding" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Aging Grid */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Vendor Aging Detail</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search vendor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Total Outstanding</TableHead>
                      {data.bucketLabels.map(l => <TableHead key={l} className="text-right">{l}</TableHead>)}
                      <TableHead className="text-center">Invoices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartners.map(partner => (
                      <VendorRow
                        key={partner.code}
                        partner={partner}
                        bucketLabels={data.bucketLabels}
                        expanded={expandedPartner === partner.code}
                        onToggle={() => setExpandedPartner(expandedPartner === partner.code ? null : partner.code)}
                      />
                    ))}
                    {filteredPartners.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No data found. Adjust filters and generate again.</TableCell></TableRow>
                    )}
                    {filteredPartners.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell></TableCell>
                        <TableCell>TOTAL ({filteredPartners.length} vendors)</TableCell>
                        <TableCell className="text-right">SAR {formatSAR(data.totalOutstanding)}</TableCell>
                        {data.bucketTotals.map((t, i) => <TableCell key={i} className="text-right">SAR {formatSAR(t)}</TableCell>)}
                        <TableCell className="text-center">{filteredPartners.reduce((s, p) => s + p.invoiceCount, 0)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function VendorRow({ partner, bucketLabels, expanded, onToggle }: {
  partner: AgingPartnerSummary; bucketLabels: string[]; expanded: boolean; onToggle: () => void;
}) {
  const bucketValues = [partner.current, partner.bucket1, partner.bucket2, partner.bucket3, partner.bucket5];
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-accent/30" onClick={onToggle}>
        <TableCell><ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} /></TableCell>
        <TableCell>
          <div>
            <span className="font-medium">{partner.name}</span>
            <span className="text-xs text-muted-foreground ml-2">{partner.code}</span>
          </div>
        </TableCell>
        <TableCell className="text-right font-semibold">SAR {formatSAR(partner.totalOutstanding)}</TableCell>
        {bucketValues.map((v, i) => (
          <TableCell key={i} className={`text-right ${i >= 3 && v > 0 ? 'text-destructive font-medium' : ''}`}>
            {v > 0 ? `SAR ${formatSAR(v)}` : '-'}
          </TableCell>
        ))}
        <TableCell className="text-center"><Badge variant="secondary">{partner.invoiceCount}</Badge></TableCell>
      </TableRow>
      {expanded && partner.invoices.sort((a, b) => b.daysOverdue - a.daysOverdue).map(inv => (
        <TableRow key={inv.id} className="bg-muted/20">
          <TableCell></TableCell>
          <TableCell className="pl-8">
            <span className="text-xs font-mono">INV-{inv.docNum}</span>
            <span className="text-xs text-muted-foreground ml-2">{inv.docDate} → {inv.dueDate}</span>
          </TableCell>
          <TableCell className="text-right text-sm">SAR {formatSAR(inv.balanceDue)}</TableCell>
          {bucketLabels.map((_, i) => (
            <TableCell key={i} className="text-right text-xs">
              {inv.bucketIndex === i ? `SAR ${formatSAR(inv.balanceDue)}` : ''}
            </TableCell>
          ))}
          <TableCell className="text-center">
            <Badge variant={inv.daysOverdue > 90 ? 'destructive' : inv.daysOverdue > 60 ? 'default' : 'secondary'} className="text-[10px]">
              {inv.daysOverdue}d
            </Badge>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
