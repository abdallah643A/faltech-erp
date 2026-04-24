import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin,
  FileText, Receipt, CreditCard, Activity, MessageCircle,
  TrendingUp, DollarSign, Calendar, Clock, User, Hash,
  ShoppingCart, FileSpreadsheet, AlertCircle, CheckCircle,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DocumentCommentsPanel } from '@/components/comments/DocumentCommentsPanel';
import { DocumentChecklistPanel } from '@/components/checklists/DocumentChecklistPanel';

export default function Customer360() {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('id');
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Fetch business partner
  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer-360', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase
        .from('business_partners')
        .select('*')
        .eq('id', customerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch sales orders
  const { data: salesOrders = [] } = useQuery({
    queryKey: ['customer-360-orders', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch AR invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-360-invoices', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('ar_invoices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch incoming payments
  const { data: payments = [] } = useQuery({
    queryKey: ['customer-360-payments', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('incoming_payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch activities
  const { data: activities = [] } = useQuery({
    queryKey: ['customer-360-activities', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('business_partner_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch quotes
  const { data: quotes = [] } = useQuery({
    queryKey: ['customer-360-quotes', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch opportunities
  const { data: opportunities = [] } = useQuery({
    queryKey: ['customer-360-opps', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('business_partner_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  if (!customerId) {
    return <CustomerList onSelect={(id) => navigate(`/customer-360?id=${id}`)} />;
  }

  if (loadingCustomer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Customer not found</p>
        <Button variant="outline" onClick={() => navigate('/customer-360')}>Back to Customers</Button>
      </div>
    );
  }

  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.total_amount || 0), 0);
  const openOrders = salesOrders.filter(o => o.status === 'open').length;
  const pendingInvoices = invoices.filter(i => i.status !== 'closed' && i.status !== 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customer-360')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 md:h-7 md:w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">{customer.card_name}</h1>
              <div className="flex flex-wrap items-center gap-1.5 md:gap-3 text-xs md:text-sm text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Hash className="h-3 w-3 md:h-3.5 md:w-3.5" />{customer.card_code}</span>
                <Badge variant={customer.card_type === 'customer' ? 'default' : 'secondary'} className="text-[10px] md:text-xs">
                  {customer.card_type}
                </Badge>
                <Badge variant={customer.status === 'active' ? 'default' : 'destructive'} className="text-[10px] md:text-xs">
                  {customer.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Total Revenue" value={`${totalRevenue.toLocaleString()} SAR`} color="text-emerald-600" />
        <KPICard icon={CreditCard} label="Total Paid" value={`${totalPaid.toLocaleString()} SAR`} color="text-blue-600" />
        <KPICard icon={ShoppingCart} label="Open Orders" value={openOrders.toString()} color="text-amber-600" />
        <KPICard icon={Receipt} label="Pending Invoices" value={pendingInvoices.toString()} color="text-purple-600" />
      </div>

      {/* Contact Info + Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contact Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer.email && (
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="truncate">{customer.email}</span></div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{customer.phone}</div>
            )}
            {customer.mobile && (
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{customer.mobile}</div>
            )}
            {customer.website && (
              <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><span className="truncate">{customer.website}</span></div>
            )}
            {customer.billing_address && (
              <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{customer.billing_address}</span></div>
            )}
            {customer.contact_person && (
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{customer.contact_person}</div>
            )}
            <Separator />
            <div className="space-y-1.5 text-muted-foreground">
              <p>Currency: <span className="text-foreground">{customer.currency || 'SAR'}</span></p>
              <p>Credit Limit: <span className="text-foreground">{(customer.credit_limit || 0).toLocaleString()}</span></p>
              <p>Balance: <span className="text-foreground">{(customer.balance || 0).toLocaleString()}</span></p>
              {customer.tax_id && <p>Tax ID: <span className="text-foreground">{customer.tax_id}</span></p>}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="orders">
            <div className="overflow-x-auto -mx-3 px-3 lg:mx-0 lg:px-0">
              <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-8 h-auto">
                <TabsTrigger value="orders" className="text-[10px] md:text-xs py-1.5 whitespace-nowrap">Orders ({salesOrders.length})</TabsTrigger>
                <TabsTrigger value="invoices" className="text-[10px] md:text-xs py-1.5 whitespace-nowrap">Invoices ({invoices.length})</TabsTrigger>
                <TabsTrigger value="payments" className="text-[10px] md:text-xs py-1.5 whitespace-nowrap">Payments ({payments.length})</TabsTrigger>
                <TabsTrigger value="activities" className="text-[10px] md:text-xs py-1.5 whitespace-nowrap">Activities ({activities.length})</TabsTrigger>
                <TabsTrigger value="quotes" className="text-[10px] md:text-xs py-1.5 whitespace-nowrap">Quotes ({quotes.length})</TabsTrigger>
                <TabsTrigger value="opportunities" className="text-[10px] md:text-xs py-1.5 whitespace-nowrap">Deals ({opportunities.length})</TabsTrigger>
                <TabsTrigger value="checklist" className="text-[10px] md:text-xs py-1.5 whitespace-nowrap">Checklist</TabsTrigger>
                <TabsTrigger value="discussion" className="text-[10px] md:text-xs py-1.5 whitespace-nowrap">Discussion</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="orders">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Doc #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Workflow</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesOrders.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sales orders</TableCell></TableRow>
                        ) : salesOrders.map(o => (
                          <TableRow key={o.id}>
                            <TableCell className="font-medium">SO-{o.doc_num}</TableCell>
                            <TableCell>{new Date(o.doc_date).toLocaleDateString()}</TableCell>
                            <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                            <TableCell><Badge variant="secondary">{o.workflow_status || 'draft'}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{(o.total || 0).toLocaleString()} {o.currency || 'SAR'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Doc #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No invoices</TableCell></TableRow>
                        ) : invoices.map(inv => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">INV-{inv.doc_num}</TableCell>
                            <TableCell>{new Date(inv.doc_date).toLocaleDateString()}</TableCell>
                            <TableCell><Badge variant="outline">{inv.status}</Badge></TableCell>
                            <TableCell className="text-right">{(inv.total || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{(inv.balance_due || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payments</TableCell></TableRow>
                        ) : payments.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">PMT-{p.doc_num}</TableCell>
                            <TableCell>{new Date(p.doc_date).toLocaleDateString()}</TableCell>
                            <TableCell>{p.transfer_reference || '-'}</TableCell>
                            <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{(p.total_amount || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y">
                      {activities.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">No activities</div>
                      ) : activities.map(a => (
                        <div key={a.id} className="flex items-start gap-3 p-4">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {a.status === 'completed' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{a.subject}</span>
                              <Badge variant="outline" className="text-xs">{a.type}</Badge>
                            </div>
                            {a.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              {a.due_date && new Date(a.due_date).toLocaleDateString()}
                              {a.priority && ` · ${a.priority}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quote #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotes.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No quotes</TableCell></TableRow>
                        ) : quotes.map(q => (
                          <TableRow key={q.id}>
                            <TableCell className="font-medium">QT-{q.quote_number}</TableCell>
                            <TableCell>{q.doc_date ? new Date(q.doc_date).toLocaleDateString() : '-'}</TableCell>
                            <TableCell><Badge variant="outline">{q.status}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{(q.total || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opportunities">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Close Date</TableHead>
                          <TableHead className="text-right">Expected Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {opportunities.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No opportunities</TableCell></TableRow>
                        ) : opportunities.map(op => (
                          <TableRow key={op.id}>
                            <TableCell className="font-medium">{op.name}</TableCell>
                            <TableCell><Badge variant="outline">{op.stage}</Badge></TableCell>
                            <TableCell>{op.expected_close ? new Date(op.expected_close).toLocaleDateString() : '-'}</TableCell>
                            <TableCell className="text-right">{(op.value || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="checklist">
              <DocumentChecklistPanel documentType="customer" documentId={customerId!} />
            </TabsContent>

            <TabsContent value="discussion">
              <DocumentCommentsPanel documentType="customer" documentId={customerId!} title="Customer Discussion" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerList({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customer-360-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partners')
        .select('id, card_code, card_name, card_type, email, phone, mobile, status, balance, credit_limit, currency')
        .order('card_name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = customers.filter(c =>
    c.card_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.card_code?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer 360°</h1>
          <p className="text-sm text-muted-foreground">Unified view of all customer touchpoints</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm"
        />
        <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelect(c.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.card_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{c.card_code}</span>
                      <Badge variant={c.card_type === 'customer' ? 'default' : 'secondary'} className="text-xs">
                        {c.card_type}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  {c.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{c.email}</span>}
                  {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No customers found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
