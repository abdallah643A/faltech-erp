import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FilterableTableHead, useColumnFilters, useColumnSort } from '@/components/ui/filterable-table-head';
import {
  Search, Plus, MoreVertical, Building2, Phone, Mail, Loader2, Users, TrendingUp, ArrowUp,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { sanitizeText, escapeSearchQuery } from '@/utils/sanitize';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import { SimpleDeleteConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { PaymentTermsSelect } from '@/components/trading/PaymentTermsSelect';
import { IncotermSelect } from '@/components/trading/IncotermSelect';
import { IncotermInfoPanel } from '@/components/trading/IncotermInfoPanel';
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';
import { TableSkeleton } from '@/components/ui/skeleton-loaders';

const bpColumns: ColumnDef[] = [
  { key: 'card_code', header: 'Code' },
  { key: 'card_name', header: 'Name' },
  { key: 'card_foreign_name', header: 'Foreign Name' },
  { key: 'card_type', header: 'Type' },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'city', header: 'City' },
  { key: 'country', header: 'Country' },
  { key: 'balance', header: 'Balance' },
  { key: 'status', header: 'Status' },
];

interface BusinessPartner {
  id: string;
  card_code: string;
  card_name: string;
  card_foreign_name: string | null;
  card_type: string;
  group_code: string | null;
  phone: string | null;
  phone2: string | null;
  mobile: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  contact_person: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  tax_id: string | null;
  vat_reg_num: string | null;
  currency: string | null;
  payment_terms: string | null;
  credit_limit: number | null;
  balance: number | null;
  status: string | null;
  assigned_to: string | null;
  city: string | null;
  country: string | null;
  state: string | null;
  industry: string | null;
  alias_name: string | null;
  territory: string | null;
  series: number | null;
  owner_code: number | null;
  notes: string | null;
  free_text: string | null;
  valid_for: boolean | null;
  frozen_for: boolean | null;
  sync_status: string | null;
  last_synced_at: string | null;
  sap_doc_entry: string | null;
  created_at: string;
}

const emptyPartner = {
  card_code: '',
  card_name: '',
  card_foreign_name: '',
  card_type: 'customer',
  group_code: '',
  phone: '',
  phone2: '',
  mobile: '',
  fax: '',
  email: '',
  website: '',
  contact_person: '',
  billing_address: '',
  shipping_address: '',
  tax_id: '',
  vat_reg_num: '',
  currency: 'SAR',
  payment_terms: 'NET_30',
  default_incoterm: '',
  credit_limit: 0,
  status: 'active',
  city: '',
  country: '',
  state: '',
  industry: '',
  alias_name: '',
  territory: '',
  notes: '',
  free_text: '',
  owner_code: null as number | null,
  series: null as number | null,
};
const F = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Label className="min-w-[120px] text-[11px] font-medium text-muted-foreground shrink-0">{label}</Label>
    <div className="flex-1">{children}</div>
  </div>
);

export default function BusinessPartners() {
  const { t, language, direction } = useLanguage();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<BusinessPartner | null>(null);
  const [newPartner, setNewPartner] = useState(emptyPartner);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { checkLimit } = useRateLimiter(10, 10000);
  const canEdit = hasAnyRole(['admin', 'manager', 'sales_rep']);
  const canDelete = hasAnyRole(['admin']);
  const canSync = hasAnyRole(['admin', 'manager', 'sales_rep']);
  const { sync: sapSync, isLoading: isSyncing } = useSAPSync();

  // Fetch current user's default series
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-series', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('default_series_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  const { data: partners, isLoading } = useQuery({
    queryKey: ['business-partners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_partners').select('*').order('card_code');
      if (error) throw error;
      return data as BusinessPartner[];
    },
  });

  const { data: salesEmployees } = useQuery({
    queryKey: ['sales-employees-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_employees').select('slp_code, slp_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: numberingSeries } = useQuery({
    queryKey: ['numbering-series-bp'],
    queryFn: async () => {
      const { data, error } = await supabase.from('numbering_series').select('*').eq('object_code', '2').order('series');
      if (error) throw error;
      return data || [];
    },
  });

  const getOwnerName = (ownerCode: number | null) => {
    if (!ownerCode) return '-';
    const emp = salesEmployees?.find(e => e.slp_code === ownerCode);
    return emp ? emp.slp_name : `#${ownerCode}`;
  };

  const generateCardCode = (type: string) => {
    const prefix = type === 'customer' ? 'C' : type === 'vendor' ? 'V' : 'L';
    const count = (partners?.filter(p => p.card_type === type).length || 0) + 1;
    return `${prefix}${String(10000 + count).slice(1)}`;
  };

  const saveMutation = useMutation({
    mutationFn: async (partnerData: typeof newPartner) => {
      const dataToSave = {
        ...partnerData,
        card_code: partnerData.card_code || generateCardCode(partnerData.card_type),
        created_by: user?.id,
        assigned_to: user?.id,
        owner_code: partnerData.owner_code,
        series: partnerData.series,
      };
      if (editingPartner) {
        const { error } = await supabase.from('business_partners').update(dataToSave).eq('id', editingPartner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('business_partners').insert(dataToSave);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      toast({ title: editingPartner ? 'Partner Updated' : 'Partner Created', description: 'Business partner has been saved.' });
      setIsDialogOpen(false);
      setEditingPartner(null);
      setNewPartner(emptyPartner);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_partners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      toast({ title: 'Partner Deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (partner: BusinessPartner) => {
    setEditingPartner(partner);
    setNewPartner({
      card_code: partner.card_code,
      card_name: partner.card_name,
      card_foreign_name: partner.card_foreign_name || '',
      card_type: partner.card_type,
      group_code: partner.group_code || '',
      phone: partner.phone || '',
      phone2: partner.phone2 || '',
      mobile: partner.mobile || '',
      fax: partner.fax || '',
      email: partner.email || '',
      website: partner.website || '',
      contact_person: partner.contact_person || '',
      billing_address: partner.billing_address || '',
      shipping_address: partner.shipping_address || '',
      tax_id: partner.tax_id || '',
      vat_reg_num: partner.vat_reg_num || '',
      currency: partner.currency || 'SAR',
      payment_terms: partner.payment_terms || 'NET_30',
      default_incoterm: (partner as any).default_incoterm || '',
      credit_limit: partner.credit_limit || 0,
      status: partner.status || 'active',
      city: partner.city || '',
      country: partner.country || '',
      state: partner.state || '',
      industry: partner.industry || '',
      alias_name: partner.alias_name || '',
      territory: partner.territory || '',
      notes: partner.notes || '',
      free_text: partner.free_text || '',
      owner_code: partner.owner_code,
      series: partner.series,
    });
    setIsDialogOpen(true);
  };

  const safeSearch = sanitizeText(searchQuery).toLowerCase();
  const preFilteredPartners = partners?.filter(partner => {
    const matchesSearch =
      partner.card_name.toLowerCase().includes(safeSearch) ||
      partner.card_code.toLowerCase().includes(safeSearch) ||
      (partner.card_foreign_name || '').toLowerCase().includes(safeSearch) ||
      (partner.city || '').toLowerCase().includes(safeSearch);
    const matchesType = filterType === 'all' || partner.card_type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  const bpFilterKeys: (keyof BusinessPartner)[] = ['card_code', 'card_name', 'card_foreign_name', 'card_type', 'phone', 'email', 'city', 'status'];
  const { filters: colFilters, setFilter: setColFilter, filteredData: colFilteredPartners } = useColumnFilters(preFilteredPartners, bpFilterKeys);
  const { sortedData: filteredPartners, handleSort, getSortDirection } = useColumnSort(colFilteredPartners);
  const { paginatedItems: paginatedPartners, currentPage, pageSize, totalItems, handlePageChange, handlePageSizeChange } = usePagination(filteredPartners, 25);

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency', currency, minimumFractionDigits: 0,
    }).format(value);
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = { customer: 'default', vendor: 'secondary', lead: 'outline' };
    return <Badge variant={variants[type] || 'default'} className="text-[10px] px-1.5 py-0">{type}</Badge>;
  };

  const stats = {
    total: partners?.length || 0,
    customers: partners?.filter(p => p.card_type === 'customer').length || 0,
    vendors: partners?.filter(p => p.card_type === 'vendor').length || 0,
    leads: partners?.filter(p => p.card_type === 'lead').length || 0,
  };



  const getSeriesForType = () => {
    if (!numberingSeries) return [];
    const subType = newPartner.card_type === 'customer' ? 'C' : newPartner.card_type === 'vendor' ? 'S' : 'L';
    const filtered = numberingSeries.filter(s => s.document_sub_type === subType);
    // If no series found for this sub_type (e.g. leads), show all series
    return filtered.length > 0 ? filtered : numberingSeries;
  };

  return (
    <div className="space-y-3" dir={direction}>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-foreground">{t('nav.businessPartners')}</h1>
          <p className="text-xs text-muted-foreground">Manage customers, vendors, and leads (OCRD)</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ExportImportButtons
            data={filteredPartners}
            columns={bpColumns}
            filename="business-partners"
            title="Business Partners"
          />
          <SAPSyncButton entity="business_partner" />
          <ClearAllButton tableName="business_partners" displayName="Business Partners" queryKeys={['businessPartners', 'leads', 'business-partners-list']} />
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setEditingPartner(null);
                  const defaultSeries = userProfile?.default_series_id
                    ? numberingSeries?.find(ns => ns.id === userProfile.default_series_id)
                    : null;
                  setNewPartner({ ...emptyPartner, series: defaultSeries?.series ?? null });
                }}>
                  <Plus className="h-4 w-4 mr-1" /> {t('common.add')}
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-base">{editingPartner ? 'Edit Business Partner' : 'Business Partner Master Data'}</DialogTitle>
                  <DialogDescription className="text-xs">{editingPartner ? 'Update business partner' : 'Add a new business partner (OCRD)'}</DialogDescription>
                </DialogHeader>

                {/* Header fields */}
                <div className="border rounded bg-muted/30 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <F label="Code">
                      <div className="flex gap-1.5">
                        <Input className="h-7 text-xs font-mono flex-1" placeholder="Auto" value={newPartner.card_code}
                          onChange={(e) => setNewPartner({ ...newPartner, card_code: e.target.value })} disabled={!!editingPartner} />
                        <Select value={newPartner.card_type} onValueChange={(v) => setNewPartner({ ...newPartner, card_type: v })}>
                          <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="vendor">Vendor</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </F>
                    <F label="Series">
                      <Select value={newPartner.series != null ? String(newPartner.series) : 'none'}
                        onValueChange={(v) => setNewPartner({ ...newPartner, series: v === 'none' ? null : Number(v) })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Primary" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Primary</SelectItem>
                          {getSeriesForType().map(s => (
                            <SelectItem key={s.id} value={String(s.series)}>{s.series_name || `Series ${s.series}`} {s.prefix ? `(${s.prefix})` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </F>
                    <F label="Name">
                      <Input className="h-7 text-xs" value={newPartner.card_name} onChange={(e) => setNewPartner({ ...newPartner, card_name: e.target.value })} placeholder="Business partner name *" />
                    </F>
                    <F label="Foreign Name">
                      <Input className="h-7 text-xs" value={newPartner.card_foreign_name} onChange={(e) => setNewPartner({ ...newPartner, card_foreign_name: e.target.value })} />
                    </F>
                    <F label="Group">
                      <Input className="h-7 text-xs" value={newPartner.group_code} onChange={(e) => setNewPartner({ ...newPartner, group_code: e.target.value })} />
                    </F>
                    <F label="Currency">
                      <Select value={newPartner.currency} onValueChange={(v) => setNewPartner({ ...newPartner, currency: v })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAR">SAR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </F>
                    <F label="Federal Tax ID">
                      <Input className="h-7 text-xs" value={newPartner.tax_id} onChange={(e) => setNewPartner({ ...newPartner, tax_id: e.target.value })} />
                    </F>
                    <F label="Owner">
                      <Select value={newPartner.owner_code != null ? String(newPartner.owner_code) : 'none'}
                        onValueChange={(v) => setNewPartner({ ...newPartner, owner_code: v === 'none' ? null : Number(v) })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="-No Sales Employee-" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-No Sales Employee-</SelectItem>
                          {salesEmployees?.map(emp => (
                            <SelectItem key={emp.slp_code} value={String(emp.slp_code)}>{emp.slp_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </F>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="general" className="mt-1">
                  <TabsList className="h-8 gap-0.5">
                    <TabsTrigger value="general" className="text-[11px] h-7 px-3">General</TabsTrigger>
                    <TabsTrigger value="contact" className="text-[11px] h-7 px-3">Contact Persons</TabsTrigger>
                    <TabsTrigger value="addresses" className="text-[11px] h-7 px-3">Addresses</TabsTrigger>
                    <TabsTrigger value="payment" className="text-[11px] h-7 px-3">Payment Terms</TabsTrigger>
                    <TabsTrigger value="accounting" className="text-[11px] h-7 px-3">Accounting</TabsTrigger>
                    <TabsTrigger value="remarks" className="text-[11px] h-7 px-3">Remarks</TabsTrigger>
                  </TabsList>

                  {/* General */}
                  <TabsContent value="general" className="mt-2 border rounded p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <F label="Tel 1"><Input className="h-7 text-xs" value={newPartner.phone} onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })} /></F>
                      <F label="Contact Person"><Input className="h-7 text-xs" value={newPartner.contact_person} onChange={(e) => setNewPartner({ ...newPartner, contact_person: e.target.value })} /></F>
                      <F label="Tel 2"><Input className="h-7 text-xs" value={newPartner.phone2} onChange={(e) => setNewPartner({ ...newPartner, phone2: e.target.value })} /></F>
                      <F label="Unified Tax ID"><Input className="h-7 text-xs" value={newPartner.vat_reg_num} onChange={(e) => setNewPartner({ ...newPartner, vat_reg_num: e.target.value })} /></F>
                      <F label="Mobile Phone"><Input className="h-7 text-xs" value={newPartner.mobile} onChange={(e) => setNewPartner({ ...newPartner, mobile: e.target.value })} /></F>
                      <F label="E-Mail"><Input className="h-7 text-xs" type="email" value={newPartner.email} onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })} /></F>
                      <F label="Fax"><Input className="h-7 text-xs" value={newPartner.fax} onChange={(e) => setNewPartner({ ...newPartner, fax: e.target.value })} /></F>
                      <F label="Sales Employee">
                        <Select value={newPartner.owner_code != null ? String(newPartner.owner_code) : 'none'}
                          onValueChange={(v) => setNewPartner({ ...newPartner, owner_code: v === 'none' ? null : Number(v) })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="-No Sales Employee-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-No Sales Employee-</SelectItem>
                            {salesEmployees?.map(emp => (
                              <SelectItem key={emp.slp_code} value={String(emp.slp_code)}>{emp.slp_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </F>
                      <F label="Web Site"><Input className="h-7 text-xs" value={newPartner.website} onChange={(e) => setNewPartner({ ...newPartner, website: e.target.value })} /></F>
                      <F label="Shipping Type"><Input className="h-7 text-xs" disabled /></F>
                      <F label="Industry"><Input className="h-7 text-xs" value={newPartner.industry} onChange={(e) => setNewPartner({ ...newPartner, industry: e.target.value })} /></F>
                      <F label="Territory"><Input className="h-7 text-xs" value={newPartner.territory} onChange={(e) => setNewPartner({ ...newPartner, territory: e.target.value })} /></F>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <F label="Alias Name"><Input className="h-7 text-xs w-56" value={newPartner.alias_name} onChange={(e) => setNewPartner({ ...newPartner, alias_name: e.target.value })} /></F>
                    </div>
                    <div className="border-t pt-2 mt-2 flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="bp-status" checked={newPartner.status === 'active'} onChange={() => setNewPartner({ ...newPartner, status: 'active' })} className="accent-primary" /> Active
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="bp-status" checked={newPartner.status === 'inactive'} onChange={() => setNewPartner({ ...newPartner, status: 'inactive' })} className="accent-primary" /> Inactive
                      </label>
                    </div>
                  </TabsContent>

                  {/* Contact Persons */}
                  <TabsContent value="contact" className="mt-2 border rounded p-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <F label="Contact Person"><Input className="h-7 text-xs" value={newPartner.contact_person} onChange={(e) => setNewPartner({ ...newPartner, contact_person: e.target.value })} /></F>
                      <F label="Phone"><Input className="h-7 text-xs" value={newPartner.phone} onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })} /></F>
                      <F label="E-Mail"><Input className="h-7 text-xs" value={newPartner.email} onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })} /></F>
                      <F label="Mobile"><Input className="h-7 text-xs" value={newPartner.mobile} onChange={(e) => setNewPartner({ ...newPartner, mobile: e.target.value })} /></F>
                    </div>
                  </TabsContent>

                  {/* Addresses */}
                  <TabsContent value="addresses" className="mt-2 border rounded p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <F label="City"><Input className="h-7 text-xs" value={newPartner.city} onChange={(e) => setNewPartner({ ...newPartner, city: e.target.value })} /></F>
                      <F label="State"><Input className="h-7 text-xs" value={newPartner.state} onChange={(e) => setNewPartner({ ...newPartner, state: e.target.value })} /></F>
                      <F label="Country"><Input className="h-7 text-xs" value={newPartner.country} onChange={(e) => setNewPartner({ ...newPartner, country: e.target.value })} /></F>
                      <div />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Bill-to Address</Label>
                        <Textarea rows={2} className="text-xs" value={newPartner.billing_address} onChange={(e) => setNewPartner({ ...newPartner, billing_address: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Ship-to Address</Label>
                        <Textarea rows={2} className="text-xs" value={newPartner.shipping_address} onChange={(e) => setNewPartner({ ...newPartner, shipping_address: e.target.value })} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Payment Terms */}
                  <TabsContent value="payment" className="mt-2 border rounded p-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <F label="Payment Terms">
                        <PaymentTermsSelect
                          value={newPartner.payment_terms}
                          onValueChange={(v) => setNewPartner({ ...newPartner, payment_terms: v })}
                          className="h-7 text-xs"
                        />
                      </F>
                      <F label="Default Incoterm">
                        <IncotermSelect
                          value={newPartner.default_incoterm || ''}
                          onValueChange={(v) => setNewPartner({ ...newPartner, default_incoterm: v })}
                          className="h-7 text-xs"
                        />
                      </F>
                      <F label="Credit Limit">
                        <Input className="h-7 text-xs" type="number" value={newPartner.credit_limit} onChange={(e) => setNewPartner({ ...newPartner, credit_limit: parseFloat(e.target.value) || 0 })} />
                      </F>
                    </div>
                    {newPartner.default_incoterm && (
                      <div className="mt-3">
                        <IncotermInfoPanel incoterm={newPartner.default_incoterm} />
                      </div>
                    )}
                  </TabsContent>

                  {/* Accounting Tab - SAP style */}
                  <TabsContent value="accounting" className="mt-2 border rounded p-3 space-y-4">
                    <Tabs defaultValue="general-acc">
                      <TabsList className="h-7 gap-0.5">
                        <TabsTrigger value="general-acc" className="text-[11px] h-6 px-3">General</TabsTrigger>
                        <TabsTrigger value="tax-acc" className="text-[11px] h-6 px-3">Tax</TabsTrigger>
                      </TabsList>

                      <TabsContent value="general-acc" className="mt-2 space-y-4">
                        <div className="space-y-2">
                          <F label="Consolidating BP"><Input className="h-7 text-xs w-48" disabled /></F>
                          <div className="flex items-center gap-4 ml-[128px]">
                            <label className="flex items-center gap-1.5 text-xs">
                              <input type="radio" name="consolidation" defaultChecked className="accent-primary" /> Payment Consolidation
                            </label>
                            <label className="flex items-center gap-1.5 text-xs">
                              <input type="radio" name="consolidation" className="accent-primary" /> Delivery Consolidation
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-foreground">Control Accounts</Label>
                          <div className="space-y-2 ml-2">
                            <F label="Accounts Receivable"><Input className="h-7 text-xs w-48 font-mono" placeholder="e.g. 120101001" /></F>
                            <F label="Down Pmt Clearing"><Input className="h-7 text-xs w-48 font-mono" placeholder="e.g. 220501001" /></F>
                            <F label="Down Pmt Interim"><Input className="h-7 text-xs w-48 font-mono" placeholder="e.g. 220501001" /></F>
                          </div>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                          <F label="Connected Vendor"><Input className="h-7 text-xs w-48" disabled /></F>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                          <F label="Planning Group"><Input className="h-7 text-xs w-48" disabled /></F>
                          <div className="ml-[128px] space-y-1">
                            <label className="flex items-center gap-1.5 text-xs">
                              <Checkbox className="h-3.5 w-3.5" /> Affiliate
                            </label>
                            <label className="flex items-center gap-1.5 text-xs">
                              <Checkbox className="h-3.5 w-3.5" /> Use Shipped Goods Account
                            </label>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="tax-acc" className="mt-2 space-y-2">
                        <F label="Federal Tax ID"><Input className="h-7 text-xs" value={newPartner.tax_id} onChange={(e) => setNewPartner({ ...newPartner, tax_id: e.target.value })} /></F>
                        <F label="VAT Reg. Number"><Input className="h-7 text-xs" value={newPartner.vat_reg_num} onChange={(e) => setNewPartner({ ...newPartner, vat_reg_num: e.target.value })} /></F>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  {/* Remarks */}
                  <TabsContent value="remarks" className="mt-2 border rounded p-3 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Notes / Remarks</Label>
                      <Textarea rows={3} className="text-xs" value={newPartner.notes} onChange={(e) => setNewPartner({ ...newPartner, notes: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Free Text</Label>
                      <Textarea rows={3} className="text-xs" value={newPartner.free_text} onChange={(e) => setNewPartner({ ...newPartner, free_text: e.target.value })} />
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="mt-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate(newPartner)} disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {editingPartner ? t('common.save') : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats - compact inline */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: stats.total, icon: Building2, filter: 'all' },
          { label: 'Customers', value: stats.customers, icon: Users, filter: 'customer' },
          { label: 'Vendors', value: stats.vendors, icon: Building2, filter: 'vendor' },
          { label: 'Leads', value: stats.leads, icon: TrendingUp, filter: 'lead' },
        ].map(s => (
          <Card key={s.label} className={`p-3 cursor-pointer transition-all hover:shadow-md ${filterType === s.filter ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilterType(filterType === s.filter ? 'all' : s.filter)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
              <s.icon className={`h-4 w-4 ${filterType === s.filter ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Search / Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search name, code, city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="vendor">Vendors</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={10} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px]">
                    <FilterableTableHead sortKey="card_code" sortDirection={getSortDirection('card_code')} onSort={handleSort} className="py-2 px-2" filterValue={colFilters['card_code'] || ''} onFilterChange={v => setColFilter('card_code', v)}>Code</FilterableTableHead>
                    <FilterableTableHead sortKey="card_name" sortDirection={getSortDirection('card_name')} onSort={handleSort} className="py-2 px-2" filterValue={colFilters['card_name'] || ''} onFilterChange={v => setColFilter('card_name', v)}>Name</FilterableTableHead>
                    <FilterableTableHead sortKey="card_foreign_name" sortDirection={getSortDirection('card_foreign_name')} onSort={handleSort} className="py-2 px-2 col-mobile-hidden" filterValue={colFilters['card_foreign_name'] || ''} onFilterChange={v => setColFilter('card_foreign_name', v)}>Foreign Name</FilterableTableHead>
                    <FilterableTableHead sortKey="card_type" sortDirection={getSortDirection('card_type')} onSort={handleSort} className="py-2 px-2 col-mobile-hidden" filterValue={colFilters['card_type'] || ''} onFilterChange={v => setColFilter('card_type', v)}>Type</FilterableTableHead>
                    <FilterableTableHead sortKey="phone" sortDirection={getSortDirection('phone')} onSort={handleSort} className="py-2 px-2 col-mobile-hidden" filterValue={colFilters['phone'] || ''} onFilterChange={v => setColFilter('phone', v)}>Phone</FilterableTableHead>
                    <FilterableTableHead sortKey="email" sortDirection={getSortDirection('email')} onSort={handleSort} className="py-2 px-2 col-tablet-hidden" filterValue={colFilters['email'] || ''} onFilterChange={v => setColFilter('email', v)}>Email</FilterableTableHead>
                    <FilterableTableHead sortKey="city" sortDirection={getSortDirection('city')} onSort={handleSort} className="py-2 px-2 col-tablet-hidden" filterValue={colFilters['city'] || ''} onFilterChange={v => setColFilter('city', v)}>City</FilterableTableHead>
                    <TableHead className="py-2 px-2 col-tablet-hidden">Owner</TableHead>
                    <FilterableTableHead sortKey="current_account_balance" sortDirection={getSortDirection('current_account_balance')} onSort={handleSort} className="py-2 px-2 text-right">Balance</FilterableTableHead>
                    <FilterableTableHead sortKey="status" sortDirection={getSortDirection('status')} onSort={handleSort} className="py-2 px-2 col-mobile-hidden" filterValue={colFilters['status'] || ''} onFilterChange={v => setColFilter('status', v)}>Status</FilterableTableHead>
                    <TableHead className="py-2 px-2 col-tablet-hidden">Sync</TableHead>
                    {canEdit && <TableHead className="py-2 px-2 w-8"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 12 : 11} className="text-center py-6 text-xs text-muted-foreground">
                        No business partners found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPartners.map((p) => (
                      <TableRow key={p.id} className={`text-xs ${p.frozen_for ? 'opacity-50' : ''}`}>
                        <TableCell className="py-1.5 px-2 font-mono font-medium">{p.card_code}</TableCell>
                        <TableCell className="py-1.5 px-2 font-medium max-w-[180px] truncate">{p.card_name}</TableCell>
                        <TableCell className="py-1.5 px-2 col-mobile-hidden max-w-[120px] truncate text-muted-foreground">{p.card_foreign_name || '-'}</TableCell>
                        <TableCell className="py-1.5 px-2 col-mobile-hidden">{getTypeBadge(p.card_type)}</TableCell>
                        <TableCell className="py-1.5 px-2 col-mobile-hidden whitespace-nowrap">
                          {p.phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span> : '-'}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 col-tablet-hidden max-w-[140px] truncate">
                          {p.email ? <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span> : '-'}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 col-tablet-hidden">{p.city || '-'}</TableCell>
                        <TableCell className="py-1.5 px-2 col-tablet-hidden whitespace-nowrap">{getOwnerName(p.owner_code)}</TableCell>
                        <TableCell className="py-1.5 px-2 text-right whitespace-nowrap">{formatCurrency(p.balance || 0, p.currency || 'SAR')}</TableCell>
                        <TableCell className="py-1.5 px-2 col-mobile-hidden">
                          {p.frozen_for ? <Badge variant="destructive" className="text-[10px] px-1 py-0">Frozen</Badge> :
                            p.valid_for === false ? <Badge variant="secondary" className="text-[10px] px-1 py-0">Inactive</Badge> :
                              <Badge variant="default" className="text-[10px] px-1 py-0">Active</Badge>}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 col-tablet-hidden">
                          {p.sync_status === 'synced' ? <Badge variant="outline" className="text-[10px] px-1 py-0">Synced</Badge> :
                            p.sync_status === 'error' ? <Badge variant="destructive" className="text-[10px] px-1 py-0">Error</Badge> :
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">Local</Badge>}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="py-1.5 px-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(p)}>Edit</DropdownMenuItem>
                                {canSync && (
                                  <DropdownMenuItem onClick={() => sapSync('business_partner', 'to_sap', p.id)} disabled={isSyncing}>
                                    <ArrowUp className="h-3 w-3 mr-1" />Push to SAP
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem onClick={() => setDeleteConfirmId(p.id)} className="text-destructive">Delete</DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationControls currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
        </CardContent>
      </Card>

      <SimpleDeleteConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}
        onConfirm={() => { if (deleteConfirmId) { deleteMutation.mutate(deleteConfirmId); setDeleteConfirmId(null); } }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
