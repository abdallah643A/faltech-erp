import { useState, useEffect, useCallback } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { useProjectSchedule, ScheduleActivity } from '@/hooks/useProjectSchedule';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Layers, Plus, Save, Download, Upload, Filter, Search,
  LayoutList, GanttChart as GanttIcon, PanelLeftClose, PanelLeft,
} from 'lucide-react';
import ScheduleDashboard from '@/components/cpms/schedule/ScheduleDashboard';
import ScheduleTreeTable from '@/components/cpms/schedule/ScheduleTreeTable';
import ScheduleGanttChart from '@/components/cpms/schedule/ScheduleGanttChart';
import ActivityFormDialog from '@/components/cpms/schedule/ActivityFormDialog';

type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function CPMSSchedulePlanning() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const schedule = useProjectSchedule(selectedProjectId || undefined);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ScheduleActivity | null>(null);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [addLevelType, setAddLevelType] = useState('stage');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [planMode, setPlanMode] = useState<'master' | 'detailed'>('master');
  const [showGantt, setShowGantt] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');

  useEffect(() => {
    if (selectedProjectId) schedule.fetchSchedule();
  }, [selectedProjectId]);

  // Auto-expand stages
  useEffect(() => {
    const stages = schedule.activities.filter(a => a.level_type === 'stage');
    setExpanded(new Set(stages.map(s => s.id)));
  }, [schedule.activities]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleEdit = (activity: ScheduleActivity) => {
    setEditingActivity(activity);
    setAddParentId(activity.parent_activity_id);
    setAddLevelType(activity.level_type);
    setShowForm(true);
  };

  const handleAddChild = (parentId: string | null, levelType: string) => {
    setEditingActivity(null);
    setAddParentId(parentId);
    setAddLevelType(levelType);
    setShowForm(true);
  };

  const handleSave = async (data: Partial<ScheduleActivity>) => {
    if (editingActivity) {
      await schedule.updateActivity(editingActivity.id, data);
    } else {
      await schedule.addActivity(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this activity and all children?')) return;
    await schedule.deleteActivity(id);
  };

  const handleDragUpdate = async (id: string, newStart: string, newEnd: string) => {
    await schedule.updateActivity(id, { start_date: newStart, end_date: newEnd });
  };

  const handleSaveBaseline = async () => {
    const name = prompt('Baseline name:', `Baseline ${new Date().toLocaleDateString()}`);
    if (name) await schedule.saveBaseline(name);
  };

  const stats = schedule.getStats();

  // Filter activities
  const filteredList = schedule.flatList.filter(a => {
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterResponsible && !a.resource_names?.toLowerCase().includes(filterResponsible.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Project Schedule & WBS Planning
          </h1>
          <p className="text-sm text-muted-foreground">Plan stages, WBS, tasks & milestones · Drag bars to reschedule</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[240px] h-8 text-sm"><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedProjectId ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Select a project to start planning</CardContent></Card>
      ) : schedule.loading ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Loading schedule...</CardContent></Card>
      ) : (
        <>
          {/* Dashboard Metrics */}
          <ScheduleDashboard stats={stats} totalActivities={schedule.activities.length} />

          {/* Planning Mode Tabs */}
          <Tabs value={planMode} onValueChange={v => setPlanMode(v as any)}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <TabsList>
                <TabsTrigger value="master" className="text-xs">Master Project Schedule</TabsTrigger>
                <TabsTrigger value="detailed" className="text-xs">Detailed WBS Plan</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filters */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input placeholder="Search..." className="h-8 text-xs pl-7 w-[150px]" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    {['not_started', 'in_progress', 'delayed', 'completed', 'on_hold', 'cancelled'].map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Actions */}
                <Button size="sm" className="h-8 text-xs" onClick={() => handleAddChild(null, 'stage')}>
                  <Plus className="h-3 w-3 mr-1" /> Add Stage
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSaveBaseline}>
                  <Save className="h-3 w-3 mr-1" /> Save Baseline
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowGantt(!showGantt)}>
                  {showGantt ? <PanelLeftClose className="h-3 w-3 mr-1" /> : <PanelLeft className="h-3 w-3 mr-1" />}
                  {showGantt ? 'Hide Gantt' : 'Show Gantt'}
                </Button>
              </div>
            </div>

            <TabsContent value="master" className="space-y-4 mt-3">
              <div className={showGantt ? 'grid grid-cols-1 xl:grid-cols-2 gap-4' : ''}>
                <ScheduleTreeTable
                  activities={filteredList.filter(a => a.level_type === 'stage' || a._depth === 0 || expanded.has(a.parent_activity_id || ''))}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  onEdit={handleEdit}
                  onAddChild={handleAddChild}
                  onDelete={handleDelete}
                  onDuplicate={schedule.duplicateActivity}
                  onConvertMilestone={schedule.convertToMilestone}
                  onInlineUpdate={(id, field, value) => schedule.updateActivity(id, { [field]: value })}
                />
                {showGantt && (
                  <ScheduleGanttChart
                    activities={filteredList}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    onDragUpdate={handleDragUpdate}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    expanded={expanded}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4 mt-3">
              <div className={showGantt ? 'grid grid-cols-1 xl:grid-cols-2 gap-4' : ''}>
                <ScheduleTreeTable
                  activities={filteredList}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  onEdit={handleEdit}
                  onAddChild={handleAddChild}
                  onDelete={handleDelete}
                  onDuplicate={schedule.duplicateActivity}
                  onConvertMilestone={schedule.convertToMilestone}
                  onInlineUpdate={(id, field, value) => schedule.updateActivity(id, { [field]: value })}
                />
                {showGantt && (
                  <ScheduleGanttChart
                    activities={filteredList}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    onDragUpdate={handleDragUpdate}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    expanded={expanded}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Activity Form Dialog */}
      <ActivityFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        activity={editingActivity}
        parentId={addParentId}
        defaultLevelType={addLevelType}
        allActivities={schedule.activities}
        onSave={handleSave}
      />
    </div>
  );
}
