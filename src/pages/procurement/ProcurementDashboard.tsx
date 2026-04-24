import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ShoppingCart, ClipboardList, Package, Receipt, Building2, BarChart3, Users, Plus } from 'lucide-react';
import ModuleWorkflowDiagram, { PROCUREMENT_WORKFLOW } from '@/components/shared/ModuleWorkflowDiagram';
import { VendorScorecard } from '@/components/procurement/VendorScorecard';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { usePurchaseRequests, usePurchaseOrders, usePurchaseQuotations, useGoodsReceipts, useAPInvoices } from '@/hooks/useProcurement';

import PurchaseRequests from './PurchaseRequests';
import PurchaseQuotations from './PurchaseQuotations';
import PurchaseOrders from './PurchaseOrders';
import GoodsReceipts from './GoodsReceipts';
import APInvoices from './APInvoices';
import { useLanguage } from '@/contexts/LanguageContext';

export interface CopyFromPR {
  pr_id: string;
  pr_number: string;
  department: string | null;
  project_id: string | null;
  branch_id: string | null;
  remarks: string | null;
  lines: { item_code: string | null; item_description: string; quantity: number; unit: string | null; unit_price: number }[];
}

export interface CopyFromPQ {
  pq_id: string;
  pq_number: string;
  vendor_name: string;
  vendor_code: string | null;
  purchase_request_id: string | null;
  project_id: string | null;
  branch_id: string | null;
  remarks: string | null;
  lines: { item_code: string | null; item_description: string; quantity: number; unit_price: number }[];
}

export interface CopyFromPO {
  source_id: string;
  source_type: 'po' | 'grpo';
  doc_number: string;
  vendor_name: string;
  vendor_code: string | null;
  project_id: string | null;
  branch_id: string | null;
  remarks: string | null;
  lines: { item_code: string | null; item_description: string; quantity: number; unit_price: number }[];
}

export default function ProcurementDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { purchaseRequests } = usePurchaseRequests();
  const { purchaseOrders } = usePurchaseOrders();
  const { quotations } = usePurchaseQuotations();
  const { goodsReceipts } = useGoodsReceipts();
  const { apInvoices } = useAPInvoices();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pr');
  const [copyToPQ, setCopyToPQ] = useState<CopyFromPR | null>(null);
  const [copyToPO, setCopyToPO] = useState<CopyFromPR | null>(null);
  const [copyPQToPO, setCopyPQToPO] = useState<CopyFromPQ | null>(null);
  const [copyPOToGRPO, setCopyPOToGRPO] = useState<CopyFromPO | null>(null);
  const [copyToAPInvoice, setCopyToAPInvoice] = useState<CopyFromPO | null>(null);
  const [autoCreate, setAutoCreate] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['pr', 'pq', 'po', 'grpo', 'ap'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (autoCreate) {
      const timer = setTimeout(() => setAutoCreate(null), 500);
      return () => clearTimeout(timer);
    }
  }, [autoCreate]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const openPRs = purchaseRequests?.filter(pr => pr.status === 'open' || pr.status === 'approved').length || 0;
  const pendingPOs = purchaseOrders?.filter(po => po.status === 'pending_approval').length || 0;
  const openPQs = quotations?.filter(pq => pq.status === 'open').length || 0;
  const draftGRPOs = goodsReceipts?.filter(gr => gr.status === 'draft').length || 0;
  const openAPInv = apInvoices?.filter(inv => inv.status === 'draft' || inv.status === 'open').length || 0;

  const handleCopyToPQ = (data: CopyFromPR) => {
    setCopyToPQ(data);
    handleTabChange('pq');
  };

  const handleCopyToPO = (data: CopyFromPR) => {
    setCopyToPO(data);
    handleTabChange('po');
  };

  const handleCopyPQToPO = (data: CopyFromPQ) => {
    setCopyPQToPO(data);
    handleTabChange('po');
  };

  const handleCopyPOToGRPO = (data: CopyFromPO) => {
    setCopyPOToGRPO(data);
    handleTabChange('grpo');
  };

  const handleCopyToAPInvoice = (data: CopyFromPO) => {
    setCopyToAPInvoice(data);
    handleTabChange('ap');
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header with Help Guide */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Procurement</h1>
          <p className="text-xs text-muted-foreground">Manage purchase requests, orders, and vendor invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/procurement-hub')}>
            <BarChart3 className="h-4 w-4 mr-1" /> Intelligence Hub
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/project-procurement')}>
            <Building2 className="h-4 w-4 mr-1" /> Project View
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/supplier-management')}>
            <Users className="h-4 w-4 mr-1" /> Supplier Mgmt
          </Button>
          {(() => { const m = getModuleById('procurement'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
        </div>
      </div>

      {/* Procurement Process Flow */}
      <ModuleWorkflowDiagram
        moduleName="Procurement"
        moduleNameAr="المشتريات"
        steps={PROCUREMENT_WORKFLOW}
        tips={[
          'Follow the cycle: PR → Vendor Quotation → PO → Goods Receipt → AP Invoice.',
          'Use "Copy From" buttons to flow data between documents automatically.',
        ]}
      />

      {/* Vendor Scorecard */}
      <VendorScorecard />

      {/* Clickable Pipeline Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { name: 'Open PRs', count: openPRs, color: '#3b82f6', tab: 'pr', label: 'New PR' },
          { name: 'Open Quotations', count: openPQs, color: '#10b981', tab: 'pq', label: 'New PQ' },
          { name: 'Pending PO Approvals', count: pendingPOs, color: '#f59e0b', tab: 'po', label: 'New PO' },
          { name: 'Draft Receipts', count: draftGRPOs, color: '#8b5cf6', tab: 'grpo', label: 'New GRPO' },
          { name: 'Open AP Invoices', count: openAPInv, color: '#ef4444', tab: 'ap', label: 'New AP' },
        ].map((stage) => (
          <div
            key={stage.tab}
            onClick={() => handleTabChange(stage.tab)}
            className={`relative rounded-lg border bg-card p-4 hover:shadow-md transition-all cursor-pointer group ${activeTab === stage.tab ? 'ring-2 ring-primary shadow-md' : ''}`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ backgroundColor: stage.color }} />
            <div className="flex items-start justify-between mt-1">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stage.name}</p>
                <p className="text-2xl font-bold mt-1">{stage.count}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setAutoCreate(stage.tab); handleTabChange(stage.tab); }}
                title={stage.label}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pr">Purchase Requests</TabsTrigger>
          <TabsTrigger value="pq">Quotations</TabsTrigger>
          <TabsTrigger value="po">Purchase Orders</TabsTrigger>
          <TabsTrigger value="grpo">Goods Receipt</TabsTrigger>
          <TabsTrigger value="ap">AP Invoice</TabsTrigger>
        </TabsList>
        <TabsContent value="pr"><PurchaseRequests onCopyToPQ={handleCopyToPQ} onCopyToPO={handleCopyToPO} autoOpenCreate={autoCreate === 'pr'} key={autoCreate === 'pr' ? 'pr-create' : 'pr'} /></TabsContent>
        <TabsContent value="pq"><PurchaseQuotations initialPRData={copyToPQ} onDataConsumed={() => setCopyToPQ(null)} onCopyToPO={handleCopyPQToPO} autoOpenCreate={autoCreate === 'pq'} key={autoCreate === 'pq' ? 'pq-create' : 'pq'} /></TabsContent>
        <TabsContent value="po">
          <PurchaseOrders
            initialPRData={copyToPO}
            onDataConsumed={() => setCopyToPO(null)}
            initialPQData={copyPQToPO}
            onPQDataConsumed={() => setCopyPQToPO(null)}
            onCopyToGRPO={handleCopyPOToGRPO}
            onCopyToAPInvoice={handleCopyToAPInvoice}
            autoOpenCreate={autoCreate === 'po'}
            key={autoCreate === 'po' ? 'po-create' : 'po'}
          />
        </TabsContent>
        <TabsContent value="grpo">
          <GoodsReceipts
            initialPOData={copyPOToGRPO}
            onDataConsumed={() => setCopyPOToGRPO(null)}
            onCopyToAPInvoice={handleCopyToAPInvoice}
            autoOpenCreate={autoCreate === 'grpo'}
            key={autoCreate === 'grpo' ? 'grpo-create' : 'grpo'}
          />
        </TabsContent>
        <TabsContent value="ap">
          <APInvoices initialPOData={copyToAPInvoice} onDataConsumed={() => setCopyToAPInvoice(null)} autoOpenCreate={autoCreate === 'ap'} key={autoCreate === 'ap' ? 'ap-create' : 'ap'} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
