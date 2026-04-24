import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads, Lead, LeadInput } from '@/hooks/useLeads';
import { useSAPSync } from '@/hooks/useSAPSync';
import { useActivities } from '@/hooks/useActivities';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search, Plus, Filter, Download, MoreVertical, Phone, Mail, Star, Loader2, RefreshCw,
  List, LayoutGrid, Zap, BarChart3, Video, Calendar, Clock,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ActivityFormDialog } from '@/components/leads/ActivityFormDialog';
import { LeadMasterDataDialog } from '@/components/leads/LeadMasterDataDialog';
import { LeadsSummary } from '@/components/leads/LeadsSummary';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { LeadKanban } from '@/components/leads/LeadKanban';
import { LeadsDashboard } from '@/components/leads/LeadsDashboard';
import { FavoriteToggle } from '@/components/favorites/FavoritesBar';
import { SavedViewsManager } from '@/components/saved-views/SavedViewsManager';
import { SavedView } from '@/hooks/useSavedViews';

const leadColumns: ColumnDef[] = [
  { key: 'card_code', header: 'Code' },
  { key: 'card_name', header: 'Name' },
  { key: 'company', header: 'Company' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'status', header: 'Status' },
  { key: 'source', header: 'Source' },
  { key: 'score', header: 'Score' },
];
import { LeadBulkOperations } from '@/components/leads/LeadBulkOperations';
import { LeadAutomationRules } from '@/components/leads/LeadAutomationRules';
import { LeadScoringPanel } from '@/components/leads/LeadScoringPanel';
import { CustomerTagsManager } from '@/components/leads/CustomerTagsManager';
import { Brain, Tags, ListOrdered } from 'lucide-react';
import { DuplicateLeadDetector } from '@/components/crm/DuplicateLeadDetector';
import { EnrollCadenceDialog } from '@/components/crm/EnrollCadenceDialog';
import { ConvertToOpportunityDialog } from '@/components/leads/ConvertToOpportunityDialog';

const statusColors: Record<string, string> = {
  Hot: 'bg-destructive/10 text-destructive border-destructive/30',
  Warm: 'bg-warning/10 text-warning border-warning/30',
  Cold: 'bg-muted text-muted-foreground border-border',
  New: 'bg-success/10 text-success border-success/30',
  Active: 'bg-info/10 text-info border-info/30',
};

const statusTooltips: Record<string, string> = {
  Hot: 'High intent — ready to buy, needs immediate follow-up',
  Warm: 'Interested — engaged but not yet committed',
  Cold: 'Low engagement — needs nurturing or re-qualification',
  New: 'Newly created — not yet contacted or qualified',
  Active: 'Currently engaged in an active sales process',
};

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'High quality — strong conversion potential';
  if (score >= 50) return 'Medium quality — needs nurturing';
  if (score >= 20) return 'Low quality — early stage or disengaged';
  return 'Very low — minimal engagement detected';
}

const emptyFormData: LeadInput & { notes?: string } = {
  card_name: '', card_type: 'lead', email: '', phone: '', mobile: '', source: '', status: 'New',
  assigned_to: '', notes: '', contact_person: '', tax_id: '', billing_address: '', shipping_address: '',
  website: '', group_code: '', currency: 'SAR', payment_terms: '', credit_limit: 0,
};

export default function Leads() {
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();
  const { leads, isLoading, createLead, updateLead, deleteLead, convertToOpportunity } = useLeads();
  const { createActivity } = useActivities();
  const { users } = useUsers();
  const { sync: sapSync, isLoading: isSyncing } = useSAPSync();
  const isAdmin = hasRole('admin');

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadInput & { notes?: string }>(emptyFormData);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'automation' | 'dashboard'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [segmentFilter, setSegmentFilter] = useState<string | null>(null);
  const [enrollCadenceLead, setEnrollCadenceLead] = useState<Lead | null>(null);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.card_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !tagFilter || ((lead as any).tags || []).includes(tagFilter);
    const matchesSegment = !segmentFilter || (() => {
      const score = (lead as any).score || lead.score || 0;
      if (segmentFilter === 'Hot Leads') return score >= 80;
      if (segmentFilter === 'Warm Leads') return score >= 50 && score <= 79;
      if (segmentFilter === 'Cold Leads') return score < 50;
      if (segmentFilter === 'At Risk') return (lead as any).risk_level === 'high';
      if (segmentFilter === 'High Value Customers') return (lead.credit_limit || 0) >= 100000;
      return true;
    })();
    return matchesSearch && matchesTag && matchesSegment;
  });

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const userProfile = users.find(u => u.user_id === userId);
    return userProfile?.full_name || userProfile?.email || 'Unknown';
  };

  const handleOpenCreate = () => { setSelectedLead(null); setFormData({ ...emptyFormData, assigned_to: user?.id || '' }); setIsFormDialogOpen(true); };
  const handleOpenEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      card_name: lead.card_name, card_type: 'lead', email: lead.email || '', phone: lead.phone || '',
      mobile: lead.mobile || '', source: lead.source || '', status: lead.status || 'New',
      assigned_to: lead.assigned_to || '', notes: lead.notes || '', contact_person: lead.contact_person || '',
      tax_id: lead.tax_id || '', billing_address: lead.billing_address || '', shipping_address: lead.shipping_address || '',
      website: lead.website || '', group_code: lead.group_code || '', currency: lead.currency || 'SAR',
      payment_terms: lead.payment_terms || '', credit_limit: lead.credit_limit || 0,
    });
    setIsFormDialogOpen(true);
  };

  const handleSubmitForm = () => {
    if (!formData.card_name) return;
    if (selectedLead) updateLead.mutate({ id: selectedLead.id, ...formData });
    else createLead.mutate(formData);
    setIsFormDialogOpen(false);
    setFormData(emptyFormData);
  };

  const handleOpenActivity = (lead: Lead) => { setSelectedLead(lead); setIsActivityDialogOpen(true); };
  const handleAddActivity = (activity: any) => { createActivity.mutate(activity); };
  const handleOpenConvert = (lead: Lead) => { setSelectedLead(lead); setIsConvertDialogOpen(true); };
  const handleConvert = () => { if (selectedLead) { convertToOpportunity.mutate(selectedLead); setIsConvertDialogOpen(false); } };
  const handleOpenDelete = (lead: Lead) => { setSelectedLead(lead); setIsDeleteDialogOpen(true); };
  const handleDelete = () => { if (selectedLead) { deleteLead.mutate(selectedLead.id); setIsDeleteDialogOpen(false); } };

  // Bulk operations
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const selectAll = () => setSelectedIds(new Set(filteredLeads.map(l => l.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = (ids: string[]) => {
    ids.forEach(id => deleteLead.mutate(id));
    clearSelection();
  };
  const handleBulkAssign = (ids: string[], userId: string) => {
    ids.forEach(id => updateLead.mutate({ id, assigned_to: userId }));
    clearSelection();
    toast({ title: 'Leads Assigned', description: `${ids.length} leads assigned` });
  };
  const handleBulkStatusChange = (ids: string[], status: string) => {
    ids.forEach(id => updateLead.mutate({ id, status }));
    clearSelection();
    toast({ title: 'Status Updated', description: `${ids.length} leads updated` });
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground">{t('nav.leads')}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Manage and track your sales leads</p>
          </div>
          <div className="flex items-center gap-1.5">
            {(() => { const m = getModuleById('crm'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
            <FavoriteToggle label="Leads" href="/leads" />
            <LeadsSummary leads={leads} />
            <SavedViewsManager
              module="leads"
              currentFilters={{ search: searchQuery, tag: tagFilter || '', segment: segmentFilter || '' }}
              onApplyView={(view: SavedView) => {
                setSearchQuery(view.filters?.search || '');
                setTagFilter(view.filters?.tag || null);
                setSegmentFilter(view.filters?.segment || null);
              }}
            />
            <Button className="gap-1.5" size="sm" onClick={handleOpenCreate}><Plus className="h-4 w-4" /><span className="hidden sm:inline">{t('common.add')}</span></Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button variant={viewMode === 'dashboard' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('dashboard')} className="rounded-none gap-1 text-xs px-2">
              <BarChart3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="rounded-none gap-1 text-xs px-2">
              <List className="h-3.5 w-3.5" /><span className="hidden sm:inline">Table</span>
            </Button>
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="rounded-none gap-1 text-xs px-2">
              <LayoutGrid className="h-3.5 w-3.5" /><span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button variant={viewMode === 'automation' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('automation')} className="rounded-none gap-1 text-xs px-2">
              <Zap className="h-3.5 w-3.5" /><span className="hidden sm:inline">Rules</span>
            </Button>
          </div>
          <ExportImportButtons data={filteredLeads} columns={leadColumns} filename="leads" title="Leads" />
          <SAPSyncButton entity="business_partner" />
          <ClearAllButton tableName="business_partners" displayName="Leads" queryKeys={['leads', 'businessPartners']} />
          <Button
            variant={showInsightsPanel ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowInsightsPanel(!showInsightsPanel)}
            className="gap-1 text-xs"
          >
            <Brain className="h-3.5 w-3.5" /><span className="hidden md:inline">AI Insights</span>
          </Button>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <LeadsDashboard leads={leads} getUserName={getUserName} />
      ) : viewMode === 'automation' ? (
        <LeadAutomationRules users={users} />
      ) : (
        <div className={`flex gap-6 ${showInsightsPanel ? '' : ''}`}>
          {/* Main Content */}
          <div className={`flex-1 space-y-4 min-w-0 ${showInsightsPanel ? '' : ''}`}>
            {/* Duplicate Detection */}
            <DuplicateLeadDetector leads={filteredLeads} onMerge={(keepId, mergeIds) => { mergeIds.forEach(id => deleteLead.mutate(id)); }} />

            {/* Filters */}
            <div className="enterprise-card">
              <div className="p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('common.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <div className="flex gap-2">
                  {(tagFilter || segmentFilter) && (
                    <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setTagFilter(null); setSegmentFilter(null); }}>
                      {tagFilter || segmentFilter} ✕
                    </Badge>
                  )}
                  <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" />{t('common.filter')}</Button>
                </div>
              </div>
            </div>

            {viewMode === 'kanban' ? (
              <LeadKanban
                leads={filteredLeads}
                onEdit={handleOpenEdit}
                onConvert={handleOpenConvert}
                onAddActivity={handleOpenActivity}
                onDelete={handleOpenDelete}
                onSyncToSAP={(id) => sapSync('business_partner', 'to_sap', id)}
                getUserName={getUserName}
              />
            ) : (
              <>
                {/* Bulk Operations */}
                <LeadBulkOperations
                  leads={filteredLeads}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onSelectAll={selectAll}
                  onClearSelection={clearSelection}
                  onBulkDelete={handleBulkDelete}
                  onBulkAssign={handleBulkAssign}
                  onBulkStatusChange={handleBulkStatusChange}
                  users={users}
                />

                {/* Leads Table */}
                <div className="enterprise-card overflow-hidden">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th className="w-10"></th>
                            <th className="w-5"></th>
                            <th>{t('crm.leadName')}</th>
                            <th className="col-mobile-hidden">Code</th>
                            <th className="col-mobile-hidden">{t('crm.source')}</th>
                            <th className="col-tablet-hidden">{t('crm.score')}</th>
                            <th>{t('common.status')}</th>
                            <th className="col-mobile-hidden">Tags</th>
                            <th className="col-mobile-hidden">{t('crm.assignedTo')}</th>
                            <th className="col-tablet-hidden">Last Activity</th>
                            <th className="col-tablet-hidden">Activity</th>
                            <th>{t('common.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLeads.length === 0 ? (
                            <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">No leads found. Create your first lead to get started.</td></tr>
                          ) : (
                            filteredLeads.map((lead) => (
                              <tr key={lead.id} className={selectedIds.has(lead.id) ? 'bg-primary/5' : ''}>
                                <td>
                                  <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                                </td>
                                <td className="w-5 px-0">
                                  {(lead.score || 0) >= 80 && (
                                    <span title="High-priority lead">
                                      <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-sm font-medium text-primary">{lead.card_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                                    </div>
                                    <div>
                                      <p className="font-medium">{lead.card_name}</p>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="h-3 w-3" />{lead.email || '-'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="col-mobile-hidden"><Badge variant="outline">{lead.card_code}</Badge></td>
                                <td className="col-mobile-hidden"><Badge variant="outline">{lead.source || 'Direct'}</Badge></td>
                                <td className="col-tablet-hidden">
                                  <div className="flex items-center gap-2 group relative">
                                    <div className="w-16">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className={`text-xs font-bold ${getScoreColor(lead.score)}`}>{lead.score || 0}</span>
                                      </div>
                                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            (lead.score || 0) >= 80 ? 'bg-success' :
                                            (lead.score || 0) >= 50 ? 'bg-warning' :
                                            'bg-muted-foreground/40'
                                          }`}
                                          style={{ width: `${lead.score || 0}%` }}
                                        />
                                      </div>
                                    </div>
                                    <span className={`text-[10px] font-medium hidden lg:inline ${
                                      (lead.score || 0) >= 80 ? 'text-success' :
                                      (lead.score || 0) >= 50 ? 'text-warning' :
                                      'text-muted-foreground'
                                    }`}>
                                      {(lead.score || 0) >= 80 ? 'Hot' : (lead.score || 0) >= 50 ? 'Warm' : 'Cold'}
                                    </span>
                                    {/* Score breakdown tooltip */}
                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-56 p-3 rounded-lg border border-border bg-popover text-popover-foreground shadow-md text-xs">
                                      <p className="font-semibold mb-2">Engagement Score Breakdown</p>
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between"><span>📋 Data Completeness</span><span>up to 25 pts</span></div>
                                        <div className="text-muted-foreground pl-4">Email, phone, contact, website</div>
                                        <div className="flex justify-between"><span>📊 Activity Engagement</span><span>up to 25 pts</span></div>
                                        <div className="text-muted-foreground pl-4">Based on # of logged activities</div>
                                        <div className="flex justify-between"><span>⏱️ Recency</span><span>up to 15 pts</span></div>
                                        <div className="text-muted-foreground pl-4">Days since last interaction</div>
                                        <div className="flex justify-between"><span>🆕 Lead Age</span><span>up to 10 pts</span></div>
                                        <div className="text-muted-foreground pl-4">Newer leads score higher</div>
                                        <div className="flex justify-between"><span>🎯 Source Quality</span><span>up to 10 pts</span></div>
                                        <div className="text-muted-foreground pl-4">Referral/Direct = highest</div>
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-border">
                                        <span className="font-medium">≥80 = Hot</span> · <span className="font-medium">50-79 = Warm</span> · <span className="font-medium">&lt;50 = Cold</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span title={statusTooltips[lead.status || 'New'] || ''}>
                                    <Badge className={`border ${statusColors[lead.status || 'New']}`}>{lead.status || 'New'}</Badge>
                                  </span>
                                </td>
                                <td className="col-mobile-hidden">
                                  <div className="flex flex-wrap gap-1">
                                    {((lead as any).tags || []).slice(0, 2).map((t: string) => (
                                      <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                                    ))}
                                    {((lead as any).tags || []).length > 2 && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{(lead as any).tags.length - 2}</Badge>
                                    )}
                                    {(lead as any).risk_level === 'high' && (
                                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">⚠ Risk</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="col-mobile-hidden">{getUserName(lead.assigned_to)}</td>
                                <td className="col-tablet-hidden">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={lead.last_contact ? new Date(lead.last_contact).toLocaleString() : 'No activity recorded'}>
                                    <Clock className="h-3 w-3" />
                                    <span>{getRelativeTime(lead.last_contact)}</span>
                                  </div>
                                </td>
                                <td className="col-tablet-hidden">
                                  <div className="flex items-center gap-1">
                                    <span title="Call" className="p-1 rounded hover:bg-muted/50 cursor-pointer text-muted-foreground hover:text-info transition-colors" onClick={() => handleOpenActivity(lead)}>
                                      <Phone className="h-3.5 w-3.5" />
                                    </span>
                                    <span title="Email" className="p-1 rounded hover:bg-muted/50 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => handleOpenActivity(lead)}>
                                      <Mail className="h-3.5 w-3.5" />
                                    </span>
                                    <span title="Meeting" className="p-1 rounded hover:bg-muted/50 cursor-pointer text-muted-foreground hover:text-success transition-colors" onClick={() => handleOpenActivity(lead)}>
                                      <Calendar className="h-3.5 w-3.5" />
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenEdit(lead)}>{t('common.edit')}</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleOpenConvert(lead)}>Convert to Opportunity</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleOpenActivity(lead)}>Add Activity</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setEnrollCadenceLead(lead)}>
                                        <ListOrdered className="mr-2 h-4 w-4" />Enroll in Cadence
                                      </DropdownMenuItem>
                                      <DropdownMenuItem disabled={isSyncing} onClick={() => sapSync('business_partner', 'to_sap', lead.id)}>
                                        <RefreshCw className="mr-2 h-4 w-4" />Sync to SAP
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDelete(lead)}>{t('common.delete')}</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* AI Insights & Tags Sidebar */}
          {showInsightsPanel && (
            <div className="w-[380px] shrink-0 space-y-4 hidden lg:block">
              <LeadScoringPanel leads={leads} />
              <CustomerTagsManager
                leads={leads}
                onFilterByTag={setTagFilter}
                onFilterBySegment={setSegmentFilter}
              />
            </div>
          )}
        </div>
      )}

      {/* Lead Form Dialog */}
      <LeadMasterDataDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        lead={selectedLead}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmitForm}
        users={users}
        isAdmin={isAdmin}
        currentUserId={user?.id}
      />

      {/* Activity Form Dialog */}
      {selectedLead && (
        <ActivityFormDialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}
          leadId={selectedLead.id} leadName={selectedLead.card_name} onSubmit={handleAddActivity} />
      )}

      {/* Convert to Opportunity Dialog */}
      <ConvertToOpportunityDialog
        open={isConvertDialogOpen}
        onOpenChange={setIsConvertDialogOpen}
        lead={selectedLead}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the lead "{selectedLead?.card_name}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enroll in Cadence Dialog */}
      {enrollCadenceLead && (
        <EnrollCadenceDialog
          open={!!enrollCadenceLead}
          onOpenChange={(open) => { if (!open) setEnrollCadenceLead(null); }}
          leadId={enrollCadenceLead.id}
          leadName={enrollCadenceLead.card_name}
        />
      )}
    </div>
  );
}
