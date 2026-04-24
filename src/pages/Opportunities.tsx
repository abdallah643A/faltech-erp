import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOpportunities, type Opportunity } from '@/hooks/useOpportunities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import type { ColumnDef } from '@/utils/exportImportUtils';

const oppColumns: ColumnDef[] = [
  { key: 'name', header: 'Name' },
  { key: 'company', header: 'Company' },
  { key: 'value', header: 'Value' },
  { key: 'probability', header: 'Probability %' },
  { key: 'stage', header: 'Stage' },
  { key: 'expected_close', header: 'Expected Close' },
  { key: 'owner_name', header: 'Owner' },
  { key: 'industry', header: 'Industry' },
  { key: 'source', header: 'Source' },
];

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, Plus, Filter, Download, MoreVertical, Calendar, DollarSign, Loader2, ArrowUp, ArrowDown, Eye, BarChart3,
} from 'lucide-react';
import { OpportunityKanban } from '@/components/opportunities/OpportunityKanban';
import { OpportunitySAPDialog } from '@/components/opportunities/OpportunitySAPDialog';
import { SalesForecast } from '@/components/opportunities/SalesForecast';
import { WinLossAnalytics } from '@/components/opportunities/WinLossAnalytics';
import { PipelineVelocity } from '@/components/opportunities/PipelineVelocity';
import { CompetitorTracker } from '@/components/crm/CompetitorTracker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const stageColors: Record<string, string> = {
  'Discovery': 'bg-muted text-muted-foreground',
  'Qualification': 'bg-blue-500/10 text-blue-600',
  'Proposal': 'bg-amber-500/10 text-amber-600',
  'Negotiation': 'bg-primary/10 text-primary',
  'Closed Won': 'bg-green-500/10 text-green-600',
  'Closed Lost': 'bg-destructive/10 text-destructive',
};

const stageOrder = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const sourceOptions = ['Website', 'Referral', 'Cold Call', 'Event', 'Social Media', 'Partner', 'Other'];
const closingTypes = ['Single', 'Multiple', 'Phase-based'];

export default function Opportunities() {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const opportunitiesHelp = getModuleById('opportunities');
  const { sync: syncOpp } = useSAPSync();
  const { opportunities, isLoading, createOpportunity, updateOpportunity, deleteOpportunity } = useOpportunities();

  const { data: allBPs = [] } = useQuery({
    queryKey: ['bp-for-opportunities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_partners').select('*').order('card_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['sales-employees-for-opp'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_employees').select('id, slp_name, slp_code').eq('is_active', true).order('slp_name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; slp_name: string; slp_code: number }>;
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [stageUpdateOpportunity, setStageUpdateOpportunity] = useState<Opportunity | null>(null);



  const filteredOpportunities = opportunities.filter((opp) => {
    const matchSearch = opp.name.toLowerCase().includes(searchQuery.toLowerCase()) || opp.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStage = stageFilter === 'all' || opp.stage === stageFilter;
    const matchOwner = ownerFilter === 'all' || opp.owner_id === ownerFilter || (ownerFilter === 'mine' && opp.owner_id === user?.id);
    return matchSearch && matchStage && matchOwner;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(value);

  const getStageProgress = (stage: string) => ((stageOrder.indexOf(stage) + 1) / stageOrder.length) * 100;

  const handleAddOpportunity = async (formData: any) => {
    if (!formData.name || !formData.company || !formData.value) return;
    await createOpportunity.mutateAsync({
      name: formData.name, company: formData.company,
      business_partner_id: formData.business_partner_id || null,
      value: parseFloat(formData.value) || 0,
      probability: parseInt(formData.probability) || 50,
      stage: formData.stage, expected_close: formData.expected_close || null,
      owner_id: user?.id || null,
      owner_name: formData.owner_name || profile?.full_name || null,
      notes: formData.notes || null, created_by: user?.id || null,
      ...(formData.industry ? { industry: formData.industry } : {}),
      ...(formData.source ? { source: formData.source } : {}),
      ...(formData.contact_person ? { contact_person: formData.contact_person } : {}),
      ...(formData.interest_field ? { interest_field: formData.interest_field } : {}),
      ...(formData.closing_type ? { closing_type: formData.closing_type } : {}),
      ...(formData.start_date ? { start_date: formData.start_date } : {}),
      ...(formData.remarks ? { remarks: formData.remarks } : {}),
      ...(formData.sales_employee_code ? { sales_employee_code: parseInt(formData.sales_employee_code) } : {}),
    } as any);
    setIsDialogOpen(false);
  };

  const handleEditOpportunity = (opp: Opportunity) => { setEditingOpportunity({ ...opp }); setIsEditDialogOpen(true); };

  const handleSaveEdit = async (formData: any) => {
    if (!editingOpportunity) return;
    await updateOpportunity.mutateAsync({
      id: editingOpportunity.id, name: formData.name, company: formData.company,
      value: parseFloat(formData.value) || 0, probability: parseInt(formData.probability) || 0,
      stage: formData.stage, expected_close: formData.expected_close || null,
      owner_name: formData.owner_name || null,
      ...(formData.industry ? { industry: formData.industry } : {}),
      ...(formData.source ? { source: formData.source } : {}),
      ...(formData.contact_person ? { contact_person: formData.contact_person } : {}),
      ...(formData.interest_field ? { interest_field: formData.interest_field } : {}),
      ...(formData.closing_type ? { closing_type: formData.closing_type } : {}),
      ...(formData.start_date ? { start_date: formData.start_date } : {}),
      ...(formData.remarks ? { remarks: formData.remarks } : {}),
      ...(formData.notes ? { notes: formData.notes } : {}),
      ...(formData.sales_employee_code ? { sales_employee_code: parseInt(formData.sales_employee_code) } : {}),
    });
    setIsEditDialogOpen(false); setEditingOpportunity(null);
  };

  const handleOpenStageUpdate = (opp: Opportunity) => { setStageUpdateOpportunity(opp); setIsStageDialogOpen(true); };
  const handleUpdateStage = async (newStage: string) => {
    if (!stageUpdateOpportunity) return;
    await updateOpportunity.mutateAsync({ id: stageUpdateOpportunity.id, stage: newStage });
    setIsStageDialogOpen(false); setStageUpdateOpportunity(null);
  };
  const handleDeleteOpportunity = async (id: string) => { await deleteOpportunity.mutateAsync(id); };
  const handleCreateQuote = (opp: Opportunity) => { navigate(`/quotes/new?opportunityId=${opp.id}&company=${encodeURIComponent(opp.company)}&value=${opp.value}`); };

  if (isLoading) {
    return (
      <div className="space-y-6 page-enter">
        <div className="flex justify-between items-center"><Skeleton className="h-8 w-48" /><Skeleton className="h-10 w-32" /></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const uniqueOwners = [...new Set(opportunities.filter(o => o.owner_id).map(o => JSON.stringify({ id: o.owner_id, name: o.owner_name })))].map(s => JSON.parse(s));

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">{t('nav.opportunities')}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {language === 'ar' ? 'تتبع وإدارة خط المبيعات' : 'Track and manage your sales pipeline'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {opportunitiesHelp && <ModuleHelpDrawer module={opportunitiesHelp} />}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="rounded-none">
              {language === 'ar' ? 'جدول' : 'Table'}
            </Button>
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="rounded-none">
              {language === 'ar' ? 'كانبان' : 'Kanban'}
            </Button>
          </div>
          <ExportImportButtons data={opportunities} columns={oppColumns} filename="opportunities" title="Opportunities" />
          <SAPSyncButton entity="opportunity" />
          <ClearAllButton tableName="opportunities" displayName="Opportunities" queryKeys={['opportunities']} />
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4" />{t('common.add')}</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="enterprise-card">
        <div className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('common.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-1" /><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stageOrder.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Owner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              <SelectItem value="mine">My Opportunities</SelectItem>
              {uniqueOwners.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="forecast">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="forecast" className="text-xs md:text-sm">Sales Forecast</TabsTrigger>
          <TabsTrigger value="velocity" className="text-xs md:text-sm">Pipeline Velocity</TabsTrigger>
          <TabsTrigger value="winloss" className="text-xs md:text-sm">Win/Loss</TabsTrigger>
          <TabsTrigger value="competitors" className="text-xs md:text-sm">Competitors</TabsTrigger>
        </TabsList>
        <TabsContent value="forecast" className="mt-4">
          <SalesForecast opportunities={opportunities} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="velocity" className="mt-4">
          <PipelineVelocity opportunities={opportunities} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="winloss" className="mt-4">
          <WinLossAnalytics opportunities={opportunities} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="competitors" className="mt-4">
          <CompetitorTracker opportunities={opportunities} formatCurrency={formatCurrency} />
        </TabsContent>
      </Tabs>

      {/* View Toggle Content */}
      {viewMode === 'kanban' ? (
        <OpportunityKanban
          opportunities={filteredOpportunities}
          onEdit={handleEditOpportunity}
          onStageUpdate={(opp) => { updateOpportunity.mutateAsync({ id: opp.id, stage: opp.stage }); }}
          onDelete={handleDeleteOpportunity}
          onCreateQuote={handleCreateQuote}
          onSyncToSAP={(id) => syncOpp('opportunity', 'to_sap', id)}
          onSyncFromSAP={(id) => syncOpp('opportunity', 'from_sap', id)}
          formatCurrency={formatCurrency}
        />
      ) : (
        <>
          {/* Pipeline Summary */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {stageOrder.map((stage) => {
              const stageOpps = opportunities.filter((o) => o.stage === stage);
              const totalValue = stageOpps.reduce((sum, o) => sum + o.value, 0);
              return (
                <div key={stage} className="enterprise-card p-4 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}>
                  <p className="text-sm text-muted-foreground">{stage}</p>
                  <p className="text-2xl font-bold">{stageOpps.length}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(totalValue)}</p>
                </div>
              );
            })}
          </div>

          {/* Opportunities Table */}
          <div className="enterprise-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('crm.opportunityName')}</th>
                    <th className="col-mobile-hidden">{t('crm.company')}</th>
                    <th>{t('crm.value')}</th>
                    <th>{t('crm.stage')}</th>
                    <th className="col-mobile-hidden">{t('crm.probability')}</th>
                    <th className="col-mobile-hidden">{t('crm.expectedClose')}</th>
                    <th className="col-tablet-hidden">{language === 'ar' ? 'المسؤول' : 'Owner'}</th>
                    <th className="col-tablet-hidden">{language === 'ar' ? 'المصدر' : 'Source'}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpportunities.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد فرص' : 'No opportunities found'}</td></tr>
                  ) : (
                    filteredOpportunities.map((opp) => (
                      <tr key={opp.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/opportunities/${opp.id}`)}>
                        <td>
                          <div>
                            <p className="font-medium">{opp.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(opp.created_at).toLocaleDateString()}
                              {(opp as any).industry && ` • ${(opp as any).industry}`}
                            </p>
                          </div>
                        </td>
                        <td className="col-mobile-hidden">{opp.company}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="font-semibold">{formatCurrency(opp.value)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-2">
                            <Badge className={stageColors[opp.stage] || stageColors['Discovery']}>{opp.stage}</Badge>
                            <Progress value={getStageProgress(opp.stage)} className="h-1" />
                          </div>
                        </td>
                        <td className="col-mobile-hidden">
                          <div className="flex items-center gap-2">
                            <Progress value={opp.probability} className="w-16 h-2" />
                            <span className="text-sm font-medium">{opp.probability}%</span>
                          </div>
                        </td>
                        <td className="col-mobile-hidden">
                          {opp.expected_close && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(opp.expected_close).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="col-tablet-hidden">{opp.owner_name || '-'}</td>
                        <td className="col-tablet-hidden">{(opp as any).source || '-'}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/opportunities/${opp.id}`)}>
                                <Eye className="mr-2 h-4 w-4" /> {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditOpportunity(opp)}>{t('common.edit')}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenStageUpdate(opp)}>{language === 'ar' ? 'تحديث المرحلة' : 'Update Stage'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate('/activities')}>{language === 'ar' ? 'إضافة نشاط' : 'Add Activity'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCreateQuote(opp)}>{language === 'ar' ? 'إنشاء عرض سعر' : 'Create Quote'}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => syncOpp('opportunity', 'to_sap', opp.id)}>
                                <ArrowUp className="mr-2 h-4 w-4" />{language === 'ar' ? 'دفع إلى SAP' : 'Push to SAP'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => syncOpp('opportunity', 'from_sap', opp.id)}>
                                <ArrowDown className="mr-2 h-4 w-4" />{language === 'ar' ? 'سحب من SAP' : 'Pull from SAP'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteOpportunity(opp.id)}>{t('common.delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SAP B1 Add Dialog */}
      <OpportunitySAPDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode="add"
        allBPs={allBPs}
        salesEmployees={salesEmployees}
        onSave={handleAddOpportunity}
        isPending={createOpportunity.isPending}
        defaultOwnerName={profile?.full_name}
      />

      {/* SAP B1 Edit Dialog */}
      <OpportunitySAPDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        opportunity={editingOpportunity}
        allBPs={allBPs}
        salesEmployees={salesEmployees}
        onSave={handleSaveEdit}
        isPending={updateOpportunity.isPending}
        defaultOwnerName={profile?.full_name}
      />

      {/* Update Stage Dialog */}
      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تحديث المرحلة' : 'Update Stage'}</DialogTitle>
            <DialogDescription>
              {stageUpdateOpportunity && (language === 'ar' ? `اختر المرحلة الجديدة لـ "${stageUpdateOpportunity.name}"` : `Select a new stage for "${stageUpdateOpportunity.name}"`)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {stageOrder.map((stage) => (
              <Button key={stage} variant={stageUpdateOpportunity?.stage === stage ? 'default' : 'outline'} className="justify-start" onClick={() => handleUpdateStage(stage)} disabled={updateOpportunity.isPending}>
                <Badge className={`mr-2 ${stageColors[stage]}`}>{stage}</Badge>
                {stageUpdateOpportunity?.stage === stage && <span className="text-xs text-muted-foreground ml-auto">(current)</span>}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
