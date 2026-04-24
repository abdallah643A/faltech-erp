import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQAProjects, useQAPlans, useQATickets, useCreateQATicket, useCreateQAProject, useCreateQAPlan, useUploadPlanRevision, useQAPlanRevisions } from '@/hooks/useQAPlanViewer';
import { PlanCanvas } from './PlanCanvas';
import { PlanToolbar } from './PlanToolbar';
import { PlanLayerNav } from './PlanLayerNav';
import { TicketSlidePanel } from './TicketSlidePanel';
import { TicketChatPanel } from './TicketChatPanel';
import { TicketListView } from './TicketListView';
import { PlanFilterBar } from './PlanFilterBar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Map, List, Columns, BarChart3 } from 'lucide-react';
import type { QATicket, QAPlan } from './types';

export type ViewMode = 'plan' | 'list' | 'kanban';

export interface PlanFilters {
  search: string;
  status: string;
  priority: string;
  type: string;
  assignee: string;
  trade: string;
}

const emptyFilters: PlanFilters = { search: '', status: '', priority: '', type: '', assignee: '', trade: '' };

export function QAQCPlanViewer() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<QATicket | null>(null);
  const [showTicketPanel, setShowTicketPanel] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('plan');
  const [filters, setFilters] = useState<PlanFilters>(emptyFilters);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newPlanForm, setNewPlanForm] = useState({ title: '', building: '', floor: '', discipline: '', drawingNumber: '' });
  const planFileRef = useRef<HTMLInputElement>(null);
  const [planFile, setPlanFile] = useState<File | null>(null);

  // Data
  const { data: projects = [] } = useQAProjects();
  const { data: plans = [] } = useQAPlans(selectedProjectId);
  const { data: allTickets = [] } = useQATickets(selectedProjectId, viewMode === 'plan' ? selectedPlanId : undefined);
  const { data: revisions = [] } = useQAPlanRevisions(selectedPlanId);
  const createTicket = useCreateQATicket();
  const createProject = useCreateQAProject();
  const createPlan = useCreateQAPlan();
  const uploadRevision = useUploadPlanRevision();

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || null;
  const currentRevision = revisions.find(r => r.is_current) || revisions[0] || null;

  // Auto-select first project/plan
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) setSelectedPlanId(plans[0].id);
  }, [plans, selectedPlanId]);

  // Filter tickets
  const filteredTickets = allTickets.filter(t => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) && !t.ticket_number.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.type && t.ticket_type !== filters.type) return false;
    if (filters.trade && t.trade !== filters.trade) return false;
    if (filters.assignee && t.assignee_name !== filters.assignee) return false;
    return true;
  });

  const ticketsWithPins = filteredTickets.filter(t => t.pin_x != null && t.pin_y != null);
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Handlers
  const handlePlanClick = useCallback((x: number, y: number) => {
    setPendingPin({ x, y });
    setIsCreating(true);
    setSelectedTicket(null);
    setShowTicketPanel(true);
    setShowChatPanel(false);
  }, []);

  const handlePinClick = useCallback((ticket: QATicket) => {
    setSelectedTicket(ticket);
    setIsCreating(false);
    setShowTicketPanel(true);
    setPendingPin(null);
  }, []);

  const handleCreateTicket = useCallback(async (ticketData: Partial<QATicket>) => {
    const data = {
      ...ticketData,
      qa_project_id: selectedProjectId!,
      plan_id: selectedPlanId,
      plan_revision_id: currentRevision?.id,
      pin_x: pendingPin?.x,
      pin_y: pendingPin?.y,
      building: selectedPlan?.building || ticketData.building,
      floor: selectedPlan?.floor || ticketData.floor,
    };
    const result = await createTicket.mutateAsync(data);
    setPendingPin(null);
    setIsCreating(false);
    setSelectedTicket(result);
  }, [selectedProjectId, selectedPlanId, currentRevision, pendingPin, selectedPlan, createTicket]);

  const handleClosePanel = () => {
    setShowTicketPanel(false);
    setIsCreating(false);
    setPendingPin(null);
    setSelectedTicket(null);
  };

  const handleShowChat = (ticket: QATicket) => {
    setSelectedTicket(ticket);
    setShowChatPanel(true);
  };

  const handleCreateProjectSubmit = async () => {
    if (!newProjectName.trim()) return;
    const result = await createProject.mutateAsync({ name: newProjectName });
    setSelectedProjectId(result.id);
    setNewProjectName('');
    setShowCreateProject(false);
  };

  const handleAddPlanSubmit = async () => {
    if (!newPlanForm.title.trim() || !selectedProjectId) return;
    const result = await createPlan.mutateAsync({
      qa_project_id: selectedProjectId,
      plan_title: newPlanForm.title,
      building: newPlanForm.building || null,
      floor: newPlanForm.floor || null,
      discipline: newPlanForm.discipline || null,
      drawing_number: newPlanForm.drawingNumber || null,
    });
    if (planFile) {
      await uploadRevision.mutateAsync({ planId: result.id, file: planFile, revisionCode: 'Rev A' });
    }
    setSelectedPlanId(result.id);
    setNewPlanForm({ title: '', building: '', floor: '', discipline: '', drawingNumber: '' });
    setPlanFile(null);
    setShowAddPlan(false);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-background relative">
      {/* Top toolbar */}
      <PlanToolbar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        onCreateProject={() => setShowCreateProject(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onFiltersChange={setFilters}
        isAr={isAr}
      />

      {/* Active filter bar */}
      {hasActiveFilters && (
        <PlanFilterBar filters={filters} onClear={() => setFilters(emptyFilters)} resultCount={filteredTickets.length} isAr={isAr} />
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left layer nav - plan mode only */}
        {viewMode === 'plan' && (
          <PlanLayerNav
            plans={plans}
            selectedPlanId={selectedPlanId}
            onSelectPlan={setSelectedPlanId}
            onAddPlan={() => setShowAddPlan(true)}
            ticketCounts={plans.reduce((acc, p) => {
              acc[p.id] = allTickets.filter(t => t.plan_id === p.id).length;
              return acc;
            }, {} as Record<string, number>)}
            isAr={isAr}
          />
        )}

        {/* Center canvas or list */}
        <div className="flex-1 relative overflow-hidden">
          {viewMode === 'plan' ? (
            <PlanCanvas
              plan={selectedPlan}
              revision={currentRevision}
              tickets={ticketsWithPins}
              pendingPin={pendingPin}
              selectedTicketId={selectedTicket?.id || null}
              onPlanClick={handlePlanClick}
              onPinClick={handlePinClick}
              onCancelPin={() => { setPendingPin(null); setIsCreating(false); }}
            />
          ) : (
            <TicketListView
              tickets={filteredTickets}
              viewMode={viewMode}
              onSelectTicket={(t) => { setSelectedTicket(t); setShowTicketPanel(true); setIsCreating(false); }}
              selectedTicketId={selectedTicket?.id || null}
              isAr={isAr}
            />
          )}

          {/* Floating add button */}
          {viewMode === 'plan' && !showTicketPanel && (
            <Button
              size="lg"
              className="absolute bottom-6 right-6 z-30 rounded-full h-14 w-14 shadow-lg bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { setIsCreating(true); setShowTicketPanel(true); setPendingPin(null); setSelectedTicket(null); }}
            >
              <Plus className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Right slide-in ticket panel */}
        {showTicketPanel && (
          <TicketSlidePanel
            ticket={selectedTicket}
            isCreating={isCreating}
            hasPinLocation={!!pendingPin}
            onClose={handleClosePanel}
            onSave={handleCreateTicket}
            onShowChat={handleShowChat}
            isAr={isAr}
          />
        )}

        {/* Chat panel */}
        {showChatPanel && selectedTicket && (
          <TicketChatPanel
            ticket={selectedTicket}
            onClose={() => setShowChatPanel(false)}
            isAr={isAr}
          />
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{isAr ? 'مشروع QA جديد' : 'New QA Project'}</DialogTitle></DialogHeader>
          <div><Label>{isAr ? 'اسم المشروع' : 'Project Name'}</Label><Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g. Al-Noor Tower" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProject(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleCreateProjectSubmit} disabled={createProject.isPending}>{isAr ? 'إنشاء' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Plan Dialog */}
      <Dialog open={showAddPlan} onOpenChange={setShowAddPlan}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isAr ? 'إضافة مخطط' : 'Add Plan / Drawing'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{isAr ? 'عنوان المخطط' : 'Plan Title'} *</Label><Input value={newPlanForm.title} onChange={e => setNewPlanForm(p => ({ ...p, title: e.target.value }))} placeholder="Ground Floor Plan" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{isAr ? 'المبنى' : 'Building'}</Label><Input value={newPlanForm.building} onChange={e => setNewPlanForm(p => ({ ...p, building: e.target.value }))} placeholder="Tower A" /></div>
              <div><Label>{isAr ? 'الطابق' : 'Floor'}</Label><Input value={newPlanForm.floor} onChange={e => setNewPlanForm(p => ({ ...p, floor: e.target.value }))} placeholder="GF" /></div>
              <div><Label>{isAr ? 'التخصص' : 'Discipline'}</Label><Input value={newPlanForm.discipline} onChange={e => setNewPlanForm(p => ({ ...p, discipline: e.target.value }))} placeholder="Architectural" /></div>
              <div><Label>{isAr ? 'رقم المخطط' : 'Drawing #'}</Label><Input value={newPlanForm.drawingNumber} onChange={e => setNewPlanForm(p => ({ ...p, drawingNumber: e.target.value }))} placeholder="DWG-001" /></div>
            </div>
            <div>
              <Label>{isAr ? 'ملف المخطط' : 'Plan File'}</Label>
              <input ref={planFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.svg" className="hidden" onChange={e => { if (e.target.files?.[0]) setPlanFile(e.target.files[0]); }} />
              <Button variant="outline" className="w-full mt-1" onClick={() => planFileRef.current?.click()}>
                {planFile ? planFile.name : (isAr ? 'اختر ملف...' : 'Choose file...')}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPlan(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleAddPlanSubmit} disabled={createPlan.isPending || uploadRevision.isPending}>{isAr ? 'إضافة' : 'Add Plan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
