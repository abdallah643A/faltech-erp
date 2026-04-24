import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin,
  FileText, Receipt, CreditCard, Activity, TrendingUp,
  DollarSign, Calendar, Clock, User, ShoppingCart,
  Star, AlertCircle, CheckCircle,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DocumentCommentsPanel } from '@/components/comments/DocumentCommentsPanel';
import { DocumentChecklistPanel } from '@/components/checklists/DocumentChecklistPanel';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Vendor360() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get('id');
  const navigate = useNavigate();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor-360', vendorId],
    queryFn: async () => {
      if (!vendorId) return null;
      const { data, error } = await supabase
        .from('business_partners')
        .select('*')
        .eq('id', vendorId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });

  // Purchase Orders
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['vendor-360-pos', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('doc_date', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!vendorId,
  });

  // AP Invoices
  const { data: apInvoices = [] } = useQuery({
    queryKey: ['vendor-360-invoices', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data } = await supabase
        .from('ap_invoices')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('doc_date', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!vendorId,
  });

  // Activities
  const { data: activities = [] } = useQuery({
    queryKey: ['vendor-360-activities', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('business_partner_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!vendorId,
  });

  if (!vendorId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No vendor selected. Navigate from a vendor list.</p>
        <Button className="mt-4" onClick={() => navigate('/business-partners')}>Go to Partners</Button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading vendor data...</div>;
  }

  if (!vendor) {
    return <div className="p-8 text-center text-muted-foreground">Vendor not found.</div>;
  }

  const totalPOValue = purchaseOrders.reduce((a, po) => a + (po.total || 0), 0);
  const totalInvoiced = apInvoices.reduce((a, inv) => a + (inv.total || 0), 0);
  const openPOs = purchaseOrders.filter(po => po.status === 'open' || po.status === 'pending').length;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {vendor.card_name}
          </h1>
          <p className="text-xs text-muted-foreground">{vendor.card_code} • Vendor 360° View</p>
        </div>
        <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>{vendor.status}</Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><ShoppingCart className="h-3 w-3" />Purchase Orders</div>
          <p className="text-lg font-bold">{purchaseOrders.length}</p>
          <p className="text-[10px] text-muted-foreground">{openPOs} open</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Total PO Value</div>
          <p className="text-lg font-bold">{fmt(totalPOValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Receipt className="h-3 w-3" />Invoiced</div>
          <p className="text-lg font-bold">{fmt(totalInvoiced)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" />Rating</div>
          <p className="text-lg font-bold">{(vendor as any).overall_rating?.toFixed(1) || 'N/A'}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="invoices">AP Invoices</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                {vendor.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {vendor.email}</div>}
                {vendor.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {vendor.phone}</div>}
                {vendor.website && <div className="flex items-center gap-2"><Globe className="h-3 w-3" /> {vendor.website}</div>}
                {vendor.billing_address && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {vendor.billing_address}</div>}
                {vendor.contact_person && <div className="flex items-center gap-2"><User className="h-3 w-3" /> {vendor.contact_person}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Financial Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{vendor.currency || 'SAR'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment Terms</span><span>{vendor.payment_terms || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Credit Limit</span><span>{fmt(vendor.credit_limit || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax ID</span><span>{vendor.tax_id || '-'}</span></div>
              </CardContent>
            </Card>
          </div>
          <DocumentChecklistPanel documentType="vendor" documentId={vendorId} compact />
        </TabsContent>

        <TabsContent value="purchase-orders">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">PO #</TableHead>
                      <TableHead className="text-xs">{t('common.date')}</TableHead>
                      <TableHead className="text-xs">{t('common.status')}</TableHead>
                      <TableHead className="text-xs text-right">{t('common.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map(po => (
                      <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/purchase-orders?id=${po.id}`)}>
                        <TableCell className="text-xs font-medium">{po.po_number}</TableCell>
                        <TableCell className="text-xs">{po.doc_date}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{po.status}</Badge></TableCell>
                        <TableCell className="text-xs text-right">{fmt(po.total || 0)}</TableCell>
                      </TableRow>
                    ))}
                    {purchaseOrders.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">No purchase orders</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs">{t('common.date')}</TableHead>
                      <TableHead className="text-xs">{t('common.status')}</TableHead>
                      <TableHead className="text-xs text-right">{t('common.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apInvoices.map(inv => (
                      <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="text-xs font-medium">{inv.invoice_number}</TableCell>
                        <TableCell className="text-xs">{inv.doc_date}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{inv.status}</Badge></TableCell>
                        <TableCell className="text-xs text-right">{fmt(inv.total || 0)}</TableCell>
                      </TableRow>
                    ))}
                    {apInvoices.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">No invoices</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardContent className="p-4">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No activities recorded</p>
              ) : (
                <div className="space-y-3">
                  {activities.map(act => (
                    <div key={act.id} className="flex gap-3 text-xs">
                      <div className="w-1 rounded bg-primary shrink-0" />
                      <div>
                        <p className="font-medium">{act.subject}</p>
                        <p className="text-muted-foreground">{act.type} • {new Date(act.created_at).toLocaleDateString()}</p>
                        {act.description && <p className="text-muted-foreground mt-0.5">{act.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussion">
          <DocumentCommentsPanel documentType="vendor" documentId={vendorId} title="Vendor Discussion" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
