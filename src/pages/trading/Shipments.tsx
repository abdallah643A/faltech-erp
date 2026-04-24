import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { formatSAR } from '@/lib/currency';
import { format, parseISO, differenceInDays, isAfter, addDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Ship, Plus, Search, Filter, Eye, Edit, Trash2, ExternalLink, MapPin,
  Calendar, Package, Anchor, ArrowRight, Clock, AlertTriangle, ChevronDown,
  CheckCircle2, Circle, Truck, X
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  TriangularTradeIndicator, TriangularPartyFlow, ResponsibilityMatrix,
  TriangularChecklist, TriangularRiskPanel, TriangularDocumentFlow
} from '@/components/trading/TriangularTradePanel';
import { Button } from '@/components/ui/button';
import { ShipmentCostsTab } from '@/components/trading/ShipmentCostsTab';
import { IncotermSelect } from '@/components/trading/IncotermSelect';
import { IncotermInfoPanel } from '@/components/trading/IncotermInfoPanel';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';

const SHIPMENT_TYPES = ['Ocean FCL', 'Ocean LCL', 'Air Freight', 'Road', 'Rail', 'Courier'];
const CONTAINER_TYPES = ['20ft', '40ft', '40HC', '45HC', 'LCL', 'N/A'];
// INCOTERMS now imported from IncotermSelect
const STATUSES = [
  'Booking', 'Container Picked Up', 'Loaded', 'Gate In', 'Loaded on Vessel',
  'Departed', 'In Transit', 'Arrived at Port', 'Discharged', 'Customs Clearance', 'Gate Out', 'Delivered'
];

const STATUS_COLORS: Record<string, string> = {
  'Booking': 'bg-muted text-muted-foreground',
  'Container Picked Up': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Loaded': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Gate In': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Loaded on Vessel': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Departed': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'In Transit': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Arrived at Port': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Discharged': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Customs Clearance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Gate Out': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Delivered': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

interface ShipmentForm {
  shipment_type: string;
  container_number: string;
  container_type: string;
  seal_number: string;
  bill_of_lading: string;
  vessel_name: string;
  voyage_number: string;
  carrier: string;
  freight_forwarder: string;
  purchase_order_id: string;
  sales_order_id: string;
  incoterm: string;
  shipper_name: string;
  shipper_address: string;
  consignee_name: string;
  consignee_address: string;
  notify_party: string;
  port_of_loading: string;
  port_of_discharge: string;
  place_of_delivery: string;
  etd: string;
  atd: string;
  eta: string;
  ata: string;
  cargo_weight_kg: number;
  cargo_volume_cbm: number;
  cargo_value: number;
  status: string;
  tracking_url: string;
  notes: string;
  shipment_structure: string;
}

const emptyForm: ShipmentForm = {
  shipment_type: 'Ocean FCL', container_number: '', container_type: '40ft',
  seal_number: '', bill_of_lading: '', vessel_name: '', voyage_number: '',
  carrier: '', freight_forwarder: '', purchase_order_id: '', sales_order_id: '',
  incoterm: 'FOB', shipper_name: '', shipper_address: '', consignee_name: '',
  consignee_address: '', notify_party: '', port_of_loading: '', port_of_discharge: '',
  place_of_delivery: '', etd: '', atd: '', eta: '', ata: '',
  cargo_weight_kg: 0, cargo_volume_cbm: 0, cargo_value: 0,
  status: 'Booking', tracking_url: '', notes: '',
  shipment_structure: 'standard',
};

export default function Shipments() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ShipmentForm>(emptyForm);

  // Fetch shipments
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('shipments').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Fetch POs and SOs for dropdowns
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['po-dropdown', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('purchase_orders').select('id, po_number, vendor_name').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['so-dropdown', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sales_orders').select('id, doc_num, customer_name').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Save shipment
  const saveMutation = useMutation({
    mutationFn: async (data: ShipmentForm) => {
      const payload: any = {
        ...data,
        purchase_order_id: data.purchase_order_id || null,
        sales_order_id: data.sales_order_id || null,
        company_id: activeCompanyId,
        cargo_weight_kg: data.cargo_weight_kg || 0,
        cargo_volume_cbm: data.cargo_volume_cbm || 0,
        cargo_value: data.cargo_value || 0,
        etd: data.etd || null, atd: data.atd || null,
        eta: data.eta || null, ata: data.ata || null,
      };
      if (editId) {
        const { error } = await supabase.from('shipments').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from('shipments').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success(editId ? 'Shipment updated' : 'Shipment created');
      setFormOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shipments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment deleted');
      setDetailId(null);
    },
  });

  // Filtered data
  const filtered = useMemo(() => {
    return shipments.filter((s: any) => {
      const matchSearch = !search || [s.shipment_number, s.container_number, s.bill_of_lading, s.vessel_name, s.carrier, s.consignee_name, s.shipper_name]
        .filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [shipments, search, statusFilter]);

  // Stats
  const inTransit = shipments.filter((s: any) => ['Departed', 'In Transit', 'Loaded on Vessel'].includes(s.status));
  const arrivingThisWeek = shipments.filter((s: any) => {
    if (!s.eta) return false;
    const eta = parseISO(s.eta);
    const now = new Date();
    return differenceInDays(eta, now) >= 0 && differenceInDays(eta, now) <= 7 && s.status !== 'Delivered';
  });
  const delayed = shipments.filter((s: any) => {
    if (!s.eta || s.status === 'Delivered') return false;
    return isAfter(new Date(), parseISO(s.eta)) && !s.ata;
  });

  const openEdit = (s: any) => {
    setForm({
      shipment_type: s.shipment_type || 'Ocean FCL',
      container_number: s.container_number || '',
      container_type: s.container_type || 'N/A',
      seal_number: s.seal_number || '',
      bill_of_lading: s.bill_of_lading || '',
      vessel_name: s.vessel_name || '',
      voyage_number: s.voyage_number || '',
      carrier: s.carrier || '',
      freight_forwarder: s.freight_forwarder || '',
      purchase_order_id: s.purchase_order_id || '',
      sales_order_id: s.sales_order_id || '',
      incoterm: s.incoterm || 'FOB',
      shipper_name: s.shipper_name || '',
      shipper_address: s.shipper_address || '',
      consignee_name: s.consignee_name || '',
      consignee_address: s.consignee_address || '',
      notify_party: s.notify_party || '',
      port_of_loading: s.port_of_loading || '',
      port_of_discharge: s.port_of_discharge || '',
      place_of_delivery: s.place_of_delivery || '',
      etd: s.etd || '', atd: s.atd || '', eta: s.eta || '', ata: s.ata || '',
      cargo_weight_kg: s.cargo_weight_kg || 0,
      cargo_volume_cbm: s.cargo_volume_cbm || 0,
      cargo_value: s.cargo_value || 0,
      status: s.status || 'Booking',
      tracking_url: s.tracking_url || '',
      notes: s.notes || '',
      shipment_structure: s.shipment_structure || 'standard',
    });
    setEditId(s.id);
    setFormOpen(true);
  };

  const selectedShipment = detailId ? shipments.find((s: any) => s.id === detailId) : null;

  const getStatusIndex = (status: string) => STATUSES.indexOf(status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Ship className="h-8 w-8 text-blue-500" /> Shipment Tracking
          </h1>
          <p className="text-muted-foreground">Track ocean, air, and land shipments end-to-end</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Create Shipment
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Ship className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold">{inTransit.length}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSAR(inTransit.reduce((s: number, i: any) => s + (i.cargo_value || 0), 0))} SAR value
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Arriving This Week</p>
                <p className="text-2xl font-bold">{arrivingThisWeek.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delayed</p>
                <p className="text-2xl font-bold text-red-600">{delayed.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search container, B/L, vessel, carrier..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment #</TableHead>
                <TableHead>Container</TableHead>
                <TableHead>B/L</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No shipments found</TableCell></TableRow>
              ) : filtered.map((s: any) => {
                const isDelayed = s.eta && !s.ata && isAfter(new Date(), parseISO(s.eta)) && s.status !== 'Delivered';
                return (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(s.id)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {s.shipment_number}
                        {s.shipment_structure === 'triangular' && <TriangularTradeIndicator />}
                      </div>
                    </TableCell>
                    <TableCell>{s.container_number || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{s.bill_of_lading || '—'}</TableCell>
                    <TableCell>
                      <span className="text-xs">
                        {s.port_of_loading || '?'} <ArrowRight className="inline h-3 w-3 mx-1" /> {s.port_of_discharge || '?'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.eta ? (
                        <span className={isDelayed ? 'text-red-600 font-semibold' : ''}>
                          {format(parseISO(s.eta), 'dd MMM yyyy')}
                          {isDelayed && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[s.status] || 'bg-muted text-muted-foreground'}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => setDetailId(s.id)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(s.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ========= CREATE / EDIT DIALOG ========= */}
      <Dialog open={formOpen} onOpenChange={o => { if (!o) { setFormOpen(false); setEditId(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Shipment' : 'Create Shipment'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="parties">Parties</TabsTrigger>
              <TabsTrigger value="routing">Routing</TabsTrigger>
              <TabsTrigger value="cargo">Cargo</TabsTrigger>
              <TabsTrigger value="links">Linked</TabsTrigger>
              <TabsTrigger value="status">{t('common.status')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Shipment Type</Label>
                  <Select value={form.shipment_type} onValueChange={v => setForm(f => ({ ...f, shipment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SHIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Container Number</Label><Input value={form.container_number} onChange={e => setForm(f => ({ ...f, container_number: e.target.value }))} placeholder="ABCD1234567" /></div>
                <div><Label>Container Type</Label>
                  <Select value={form.container_type} onValueChange={v => setForm(f => ({ ...f, container_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTAINER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Seal Number</Label><Input value={form.seal_number} onChange={e => setForm(f => ({ ...f, seal_number: e.target.value }))} /></div>
                <div><Label>Bill of Lading / AWB</Label><Input value={form.bill_of_lading} onChange={e => setForm(f => ({ ...f, bill_of_lading: e.target.value }))} /></div>
                <div><Label>Vessel / Flight</Label><Input value={form.vessel_name} onChange={e => setForm(f => ({ ...f, vessel_name: e.target.value }))} /></div>
                <div><Label>Voyage Number</Label><Input value={form.voyage_number} onChange={e => setForm(f => ({ ...f, voyage_number: e.target.value }))} /></div>
                <div><Label>Carrier</Label><Input value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} placeholder="COSCO, Maersk, MSC..." /></div>
                <div className="col-span-2"><Label>Freight Forwarder</Label><Input value={form.freight_forwarder} onChange={e => setForm(f => ({ ...f, freight_forwarder: e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="parties" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Shipment Structure</Label>
                  <RadioGroup
                    value={form.shipment_structure}
                    onValueChange={v => {
                      setForm(f => {
                        const updated = { ...f, shipment_structure: v };
                        if (v === 'triangular') {
                          // Auto-fill from linked PO/SO
                          const linkedPO = purchaseOrders.find((po: any) => po.id === f.purchase_order_id);
                          const linkedSO = salesOrders.find((so: any) => so.id === f.sales_order_id);
                          if (linkedPO) updated.shipper_name = linkedPO.vendor_name || '';
                          if (linkedSO) updated.consignee_name = linkedSO.customer_name || '';
                          updated.notify_party = updated.notify_party || 'Our Company (Trader)';
                        }
                        return updated;
                      });
                    }}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="structure-standard" />
                      <Label htmlFor="structure-standard" className="cursor-pointer">Standard (we receive then ship)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="triangular" id="structure-triangular" />
                      <Label htmlFor="structure-triangular" className="cursor-pointer">Triangular / Direct Ship (supplier ships directly to customer)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {form.shipment_structure === 'triangular' && (
                  <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-orange-700 dark:text-orange-400">Triangular Trade</span>
                    </div>
                    <p className="text-muted-foreground">Goods ship directly from supplier to customer. You arrange documents and payment only.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Shipper Name {form.shipment_structure === 'triangular' && '(Supplier)'}</Label><Input value={form.shipper_name} onChange={e => setForm(f => ({ ...f, shipper_name: e.target.value }))} /></div>
                    <div><Label>Shipper Address</Label><Input value={form.shipper_address} onChange={e => setForm(f => ({ ...f, shipper_address: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Consignee Name {form.shipment_structure === 'triangular' && '(Customer)'}</Label><Input value={form.consignee_name} onChange={e => setForm(f => ({ ...f, consignee_name: e.target.value }))} /></div>
                    <div><Label>Consignee Address</Label><Input value={form.consignee_address} onChange={e => setForm(f => ({ ...f, consignee_address: e.target.value }))} /></div>
                  </div>
                  <div><Label>Notify Party {form.shipment_structure === 'triangular' && '(You - the Trader)'}</Label><Input value={form.notify_party} onChange={e => setForm(f => ({ ...f, notify_party: e.target.value }))} /></div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="routing" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Incoterm</Label>
                  <IncotermSelect value={form.incoterm} onValueChange={v => setForm(f => ({ ...f, incoterm: v }))} />
                </div>
                {form.incoterm && (
                  <div className="col-span-2">
                    <IncotermInfoPanel incoterm={form.incoterm} />
                  </div>
                )}
                <div><Label>Port of Loading</Label><Input value={form.port_of_loading} onChange={e => setForm(f => ({ ...f, port_of_loading: e.target.value }))} placeholder="Shanghai, China" /></div>
                <div><Label>Port of Discharge</Label><Input value={form.port_of_discharge} onChange={e => setForm(f => ({ ...f, port_of_discharge: e.target.value }))} placeholder="Jebel Ali, Dubai" /></div>
                <div><Label>Place of Delivery</Label><Input value={form.place_of_delivery} onChange={e => setForm(f => ({ ...f, place_of_delivery: e.target.value }))} /></div>
                <div><Label>ETD</Label><Input type="date" value={form.etd} onChange={e => setForm(f => ({ ...f, etd: e.target.value }))} /></div>
                <div><Label>ATD</Label><Input type="date" value={form.atd} onChange={e => setForm(f => ({ ...f, atd: e.target.value }))} /></div>
                <div><Label>ETA</Label><Input type="date" value={form.eta} onChange={e => setForm(f => ({ ...f, eta: e.target.value }))} /></div>
                <div><Label>ATA</Label><Input type="date" value={form.ata} onChange={e => setForm(f => ({ ...f, ata: e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="cargo" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Weight (KG)</Label><Input type="number" value={form.cargo_weight_kg} onChange={e => setForm(f => ({ ...f, cargo_weight_kg: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Volume (CBM)</Label><Input type="number" value={form.cargo_volume_cbm} onChange={e => setForm(f => ({ ...f, cargo_volume_cbm: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Cargo Value (SAR)</Label><Input type="number" value={form.cargo_value} onChange={e => setForm(f => ({ ...f, cargo_value: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="links" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Purchase Order</Label>
                  <Select value={form.purchase_order_id} onValueChange={v => setForm(f => ({ ...f, purchase_order_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select PO..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {purchaseOrders.map((po: any) => <SelectItem key={po.id} value={po.id}>{po.po_number} — {po.vendor_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sales Order</Label>
                  <Select value={form.sales_order_id} onValueChange={v => setForm(f => ({ ...f, sales_order_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select SO..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {salesOrders.map((so: any) => <SelectItem key={so.id} value={so.id}>SO-{so.doc_num} — {so.customer_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div><Label>{t('common.status')}</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Tracking URL</Label><Input value={form.tracking_url} onChange={e => setForm(f => ({ ...f, tracking_url: e.target.value }))} placeholder="https://..." /></div>
                <div><Label>{t('common.notes')}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFormOpen(false); setEditId(null); }}>{t('common.cancel')}</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========= DETAIL DIALOG ========= */}
      <Dialog open={!!detailId} onOpenChange={o => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedShipment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 flex-wrap">
                  <Ship className="h-6 w-6 text-blue-500" />
                  {selectedShipment.shipment_number}
                  <Badge className={STATUS_COLORS[selectedShipment.status] || ''}>{selectedShipment.status}</Badge>
                  {selectedShipment.shipment_structure === 'triangular' && <TriangularTradeIndicator />}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedShipment.port_of_loading} <ArrowRight className="inline h-3 w-3 mx-1" /> {selectedShipment.port_of_discharge}
                </p>
              </DialogHeader>

              {/* Timeline */}
              <div className="overflow-x-auto pb-2">
                <div className="flex items-center gap-0 min-w-[800px]">
                  {STATUSES.map((step, i) => {
                    const currentIdx = getStatusIndex(selectedShipment.status);
                    const isDone = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center text-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-orange-500 text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                            {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          </div>
                          <span className={`text-[10px] mt-1 max-w-[70px] leading-tight ${isCurrent ? 'font-bold text-orange-600' : isDone ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {step}
                          </span>
                        </div>
                        {i < STATUSES.length - 1 && (
                          <div className={`h-0.5 flex-1 ${isDone ? 'bg-green-500' : 'bg-muted'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="costs">Costs</TabsTrigger>
                  <TabsTrigger value="transactions">Linked Transactions</TabsTrigger>
                  {selectedShipment.shipment_structure === 'triangular' && (
                    <TabsTrigger value="triangular">Triangular Trade</TabsTrigger>
                  )}
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="costs">
                  <ShipmentCostsTab
                    shipmentId={selectedShipment.id}
                    shipment={selectedShipment}
                    purchaseOrders={purchaseOrders}
                    salesOrders={salesOrders}
                  />
                </TabsContent>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">ETD</p>
                      <p className="font-semibold">{selectedShipment.etd ? format(parseISO(selectedShipment.etd), 'dd MMM yyyy') : '—'}</p>
                    </CardContent></Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">ATD</p>
                      <p className="font-semibold">{selectedShipment.atd ? format(parseISO(selectedShipment.atd), 'dd MMM yyyy') : '—'}</p>
                    </CardContent></Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">ETA</p>
                      <p className="font-semibold">{selectedShipment.eta ? format(parseISO(selectedShipment.eta), 'dd MMM yyyy') : '—'}</p>
                    </CardContent></Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">ATA</p>
                      <p className="font-semibold">{selectedShipment.ata ? format(parseISO(selectedShipment.ata), 'dd MMM yyyy') : '—'}</p>
                    </CardContent></Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-sm">Parties</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div><span className="text-muted-foreground">Shipper:</span> {selectedShipment.shipper_name || '—'}</div>
                        <div><span className="text-muted-foreground">Consignee:</span> {selectedShipment.consignee_name || '—'}</div>
                        <div><span className="text-muted-foreground">Notify:</span> {selectedShipment.notify_party || '—'}</div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-sm">Container</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div><span className="text-muted-foreground">Type:</span> {selectedShipment.container_type}</div>
                        <div><span className="text-muted-foreground">Number:</span> {selectedShipment.container_number || '—'}</div>
                        <div><span className="text-muted-foreground">Seal:</span> {selectedShipment.seal_number || '—'}</div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-sm">Cargo</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div><span className="text-muted-foreground">Weight:</span> {(selectedShipment.cargo_weight_kg || 0).toLocaleString()} KG</div>
                        <div><span className="text-muted-foreground">Volume:</span> {selectedShipment.cargo_volume_cbm || 0} CBM</div>
                        <div><span className="text-muted-foreground">Value:</span> {formatSAR(selectedShipment.cargo_value)} SAR</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-sm">Shipping Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-muted-foreground">B/L:</span> {selectedShipment.bill_of_lading || '—'}</div>
                      <div><span className="text-muted-foreground">Vessel:</span> {selectedShipment.vessel_name || '—'}</div>
                      <div><span className="text-muted-foreground">Voyage:</span> {selectedShipment.voyage_number || '—'}</div>
                      <div><span className="text-muted-foreground">Carrier:</span> {selectedShipment.carrier || '—'}</div>
                      <div><span className="text-muted-foreground">Incoterm:</span> {selectedShipment.incoterm || '—'}</div>
                      <div><span className="text-muted-foreground">Forwarder:</span> {selectedShipment.freight_forwarder || '—'}</div>
                      {selectedShipment.incoterm && (
                        <div className="col-span-2">
                          <IncotermInfoPanel incoterm={selectedShipment.incoterm} />
                        </div>
                      )}
                      <div className="col-span-2">
                        {selectedShipment.tracking_url && (
                          <a href={selectedShipment.tracking_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Track Online
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {selectedShipment.notes && (
                    <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-4"><p className="text-sm">{selectedShipment.notes}</p></CardContent></Card>
                  )}
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Purchase Order</CardTitle></CardHeader>
                      <CardContent>
                        {selectedShipment.purchase_order_id ? (
                          <p className="text-sm font-medium">
                            {purchaseOrders.find((po: any) => po.id === selectedShipment.purchase_order_id)?.po_number || 'Linked PO'}
                          </p>
                        ) : <p className="text-sm text-muted-foreground">No PO linked</p>}
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Sales Order</CardTitle></CardHeader>
                      <CardContent>
                        {selectedShipment.sales_order_id ? (
                          <p className="text-sm font-medium">
                            SO-{salesOrders.find((so: any) => so.id === selectedShipment.sales_order_id)?.doc_num || 'Linked SO'}
                          </p>
                        ) : <p className="text-sm text-muted-foreground">No SO linked</p>}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {selectedShipment.shipment_structure === 'triangular' && (
                  <TabsContent value="triangular" className="space-y-4">
                    <TriangularPartyFlow
                      supplierName={selectedShipment.shipper_name}
                      customerName={selectedShipment.consignee_name}
                      poNumber={purchaseOrders.find((po: any) => po.id === selectedShipment.purchase_order_id)?.po_number}
                      soNumber={salesOrders.find((so: any) => so.id === selectedShipment.sales_order_id)?.doc_num ? `SO-${salesOrders.find((so: any) => so.id === selectedShipment.sales_order_id)?.doc_num}` : undefined}
                      companyName="Your Company"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ResponsibilityMatrix poIncoterm={selectedShipment.incoterm} soIncoterm={selectedShipment.incoterm} />
                      <TriangularDocumentFlow />
                    </div>
                    <TriangularChecklist
                      checklist={Array.isArray(selectedShipment.triangular_checklist) ? (selectedShipment.triangular_checklist as string[]) : []}
                      onUpdate={async (items) => {
                        await supabase.from('shipments').update({ triangular_checklist: items }).eq('id', selectedShipment.id);
                        queryClient.invalidateQueries({ queryKey: ['shipments'] });
                      }}
                    />
                    <TriangularRiskPanel />

                    {/* B/L Consignee Validation */}
                    {selectedShipment.consignee_name && selectedShipment.notify_party && 
                     selectedShipment.consignee_name.toLowerCase().includes('our') && (
                      <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 p-3 text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        <span className="text-red-700 dark:text-red-400">
                          <strong>Warning:</strong> B/L consignee appears to be your company. In triangular trade, the consignee should be the end customer, NOT you.
                        </span>
                      </div>
                    )}
                  </TabsContent>
                )}

                <TabsContent value="activity">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Created {format(parseISO(selectedShipment.created_at), 'dd MMM yyyy HH:mm')}
                      {selectedShipment.updated_at !== selectedShipment.created_at && (
                        <> · Updated {format(parseISO(selectedShipment.updated_at), 'dd MMM yyyy HH:mm')}</>
                      )}
                    </p>
                  </CardContent></Card>
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => openEdit(selectedShipment)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" onClick={() => { if (confirm('Delete this shipment?')) deleteMutation.mutate(selectedShipment.id); }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
