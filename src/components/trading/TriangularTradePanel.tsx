import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Circle, ArrowDown, Shield, FileText, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { INCOTERM_DETAILS } from './IncotermConstants';

interface TriangularTradePanelProps {
  shipment: any;
  supplierName?: string;
  customerName?: string;
  poNumber?: string;
  soNumber?: string;
}

const DEFAULT_CHECKLIST = [
  { category: 'Purchase Side (with Supplier)', items: [
    'PO issued and confirmed',
    'Supplier L/C opened (if required)',
    'Shipping instructions sent to supplier',
    'Notify party confirmed as YOUR company',
    'Freight forwarder coordinated',
    'Insurance arranged (if CIF/CIP)',
  ]},
  { category: 'Sale Side (with Customer)', items: [
    'SO confirmed',
    'Customer L/C received',
    'Customer aware of direct shipment',
    "Customer's import agent coordinated",
  ]},
  { category: 'Shipping', items: [
    "Freight booked (supplier's location → customer's destination)",
    'B/L consignee = customer (NOT you)',
    'Notify party = YOU',
    'Shipping marks approved by customer',
  ]},
  { category: 'Documents', items: [
    "Supplier's commercial invoice (to customer)",
    'Your commercial invoice (to customer)',
    'Packing list',
    'B/L (original received from shipping line)',
    'Certificate of Origin',
    'Insurance certificate (if you arranged)',
    'All docs match L/C requirements',
  ]},
  { category: 'Payment', items: [
    "Supplier's docs presented to their bank",
    'Your docs presented to your bank',
    'Customer L/C payment received',
    'Supplier L/C payment made',
    'Profit confirmed',
  ]},
];

const RISK_WARNINGS = [
  { risk: 'You never inspect goods physically', mitigation: 'Require inspection certificate (SGS, Bureau Veritas)' },
  { risk: 'Quality risk: rely on supplier reputation', mitigation: 'Have freight forwarder check goods before loading' },
  { risk: 'Timing risk: must coordinate 2 L/Cs (supplier + customer)', mitigation: "Ensure customer L/C expiry > supplier L/C expiry (buffer time)" },
  { risk: 'Document risk: any L/C discrepancy delays payment to you AND from you', mitigation: 'Insurance for your margin (protect profit if goods lost)' },
];

export function TriangularTradeIndicator() {
  return (
    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300">
      TRIANGULAR TRADE
    </Badge>
  );
}

export function TriangularPartyFlow({ supplierName, customerName, poNumber, soNumber, companyName }: {
  supplierName?: string; customerName?: string; poNumber?: string; soNumber?: string; companyName?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowDown className="h-4 w-4 text-orange-500" />
          Triangular Trade Flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-1 text-sm">
          <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg p-3 w-full max-w-xs text-center bg-blue-50 dark:bg-blue-900/20">
            <p className="font-semibold text-blue-700 dark:text-blue-400">{supplierName || 'Supplier'}</p>
            <p className="text-xs text-muted-foreground">You buy from {poNumber ? `(${poNumber})` : ''}</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-4 bg-orange-400" />
            <span className="text-xs text-orange-600 font-medium px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded">Ship directly</span>
            <div className="w-0.5 h-4 bg-orange-400" />
            <ArrowDown className="h-4 w-4 text-orange-500" />
          </div>
          <div className="border-2 border-emerald-300 dark:border-emerald-700 rounded-lg p-3 w-full max-w-xs text-center bg-emerald-50 dark:bg-emerald-900/20">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">{customerName || 'Customer'}</p>
            <p className="text-xs text-muted-foreground">You sell to {soNumber ? `(${soNumber})` : ''}</p>
          </div>
          <Separator className="my-2 w-full max-w-xs" />
          <div className="border-2 border-amber-300 dark:border-amber-700 rounded-lg p-3 w-full max-w-xs text-center bg-amber-50 dark:bg-amber-900/20">
            <p className="font-semibold text-amber-700 dark:text-amber-400">{companyName || 'You (Trader)'}</p>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <p>• Arrange purchase & sale</p>
              <p>• Handle L/Cs and payments</p>
              <p>• Coordinate documents</p>
              <p className="font-medium text-amber-600">• Never take possession</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResponsibilityMatrix({ poIncoterm, soIncoterm }: { poIncoterm?: string; soIncoterm?: string }) {
  const costItems = [
    { item: 'Inland (Origin)', supplier: ['EXW'].includes(poIncoterm || '') ? false : true, you: ['EXW'].includes(poIncoterm || ''), customer: false },
    { item: 'Export Clearance', supplier: !['EXW'].includes(poIncoterm || ''), you: ['EXW'].includes(poIncoterm || ''), customer: false },
    { item: 'Loading at Port', supplier: ['FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].includes(poIncoterm || ''), you: ['FCA', 'FAS', 'EXW'].includes(poIncoterm || ''), customer: false },
    { item: 'Ocean/Air Freight', supplier: false, you: ['CIF', 'CIP', 'CFR', 'CPT', 'DAP', 'DPU', 'DDP'].includes(soIncoterm || ''), customer: ['FOB', 'FCA', 'FAS', 'EXW'].includes(soIncoterm || '') },
    { item: 'Insurance', supplier: false, you: ['CIF', 'CIP'].includes(soIncoterm || ''), customer: !['CIF', 'CIP'].includes(soIncoterm || '') },
    { item: 'Unloading at Destination', supplier: false, you: ['DPU', 'DDP'].includes(soIncoterm || ''), customer: !['DPU', 'DDP'].includes(soIncoterm || '') },
    { item: 'Import Clearance', supplier: false, you: ['DDP'].includes(soIncoterm || ''), customer: !['DDP'].includes(soIncoterm || '') },
    { item: 'Inland (Destination)', supplier: false, you: ['DDP', 'DAP', 'DPU'].includes(soIncoterm || ''), customer: !['DDP', 'DAP', 'DPU'].includes(soIncoterm || '') },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Responsibility Matrix</CardTitle>
        <p className="text-xs text-muted-foreground">
          PO Incoterm: {poIncoterm || 'N/A'} · SO Incoterm: {soIncoterm || 'N/A'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 pr-2">Cost Item</th>
                <th className="text-center py-1.5 px-2">Supplier Pays</th>
                <th className="text-center py-1.5 px-2">You Pay</th>
                <th className="text-center py-1.5 px-2">Customer Pays</th>
              </tr>
            </thead>
            <tbody>
              {costItems.map((ci, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 font-medium">{ci.item}</td>
                  <td className="text-center py-1.5">{ci.supplier ? <CheckCircle2 className="h-4 w-4 text-blue-500 mx-auto" /> : ''}</td>
                  <td className="text-center py-1.5">{ci.you ? <CheckCircle2 className="h-4 w-4 text-amber-500 mx-auto" /> : ''}</td>
                  <td className="text-center py-1.5">{ci.customer ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function TriangularChecklist({ checklist, onUpdate }: { checklist: string[]; onUpdate: (items: string[]) => void }) {
  const toggle = (item: string) => {
    if (checklist.includes(item)) {
      onUpdate(checklist.filter(i => i !== item));
    } else {
      onUpdate([...checklist, item]);
    }
  };

  const totalItems = DEFAULT_CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const completedCount = checklist.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-500" />
          Triangular Trade Checklist
          <Badge variant="outline" className="ml-auto">{completedCount}/{totalItems}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {DEFAULT_CHECKLIST.map((cat, ci) => (
          <div key={ci}>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">{cat.category}</h4>
            <div className="space-y-1.5">
              {cat.items.map((item, ii) => (
                <label key={ii} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                  <Checkbox
                    checked={checklist.includes(item)}
                    onCheckedChange={() => toggle(item)}
                  />
                  <span className={checklist.includes(item) ? 'line-through text-muted-foreground' : ''}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TriangularRiskPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-orange-500" />
          ⚠️ Risks in Triangular Trade
          {expanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3">
          {RISK_WARNINGS.map((rw, i) => (
            <div key={i} className="text-sm space-y-1">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-red-600 dark:text-red-400">{rw.risk}</span>
              </div>
              <div className="flex items-start gap-2 ml-5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-green-700 dark:text-green-400">{rw.mitigation}</span>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export function TriangularDocumentFlow() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          Document Flow - Triangular Trade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-1">From Supplier</h4>
          <ul className="space-y-1">
            {['Commercial Invoice (supplier to customer, through you)', 'Packing List', 'Bill of Lading (shipper: supplier, consignee: customer, notify: YOU)', 'Certificate of Origin', 'Quality certificate'].map((d, i) => (
              <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />{d}</li>
            ))}
          </ul>
        </div>
        <Separator />
        <div>
          <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-1">You Generate</h4>
          <ul className="space-y-1">
            {['Your Commercial Invoice (to customer - for your sale price)', "Your Packing List (references supplier's packing)"].map((d, i) => (
              <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />{d}</li>
            ))}
          </ul>
        </div>
        <Separator />
        <div>
          <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-1">Customer Receives</h4>
          <ul className="space-y-1">
            {["Two sets of commercial invoices (supplier's + yours)", 'One set of transport docs', 'Certificates'].map((d, i) => (
              <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />{d}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
