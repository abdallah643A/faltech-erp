import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Map, List, Columns, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { TICKET_STATUSES, PRIORITIES, TICKET_TYPES, TRADES } from './types';
import type { QAProject } from './types';
import type { ViewMode, PlanFilters } from './QAQCPlanViewer';

interface Props {
  projects: QAProject[];
  selectedProjectId: string | null;
  onProjectChange: (id: string) => void;
  onCreateProject: () => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  filters: PlanFilters;
  onFiltersChange: (f: PlanFilters) => void;
  isAr: boolean;
}

export function PlanToolbar({ projects, selectedProjectId, onProjectChange, onCreateProject, viewMode, onViewModeChange, filters, onFiltersChange, isAr }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground border-b shrink-0 flex-wrap">
      {/* Project selector */}
      <div className="flex items-center gap-2">
        <Map className="h-4 w-4" />
        <Select value={selectedProjectId || ''} onValueChange={onProjectChange}>
          <SelectTrigger className="h-8 w-[200px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground text-xs">
            <SelectValue placeholder={isAr ? 'اختر مشروع' : 'Select Project'} />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/10" onClick={onCreateProject}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-primary-foreground/50" />
        <Input
          value={filters.search}
          onChange={e => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder={isAr ? 'بحث...' : 'Search...'}
          className="h-7 w-[180px] pl-7 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 text-xs"
        />
        {filters.search && (
          <button className="absolute right-1.5 top-1.5" onClick={() => onFiltersChange({ ...filters, search: '' })}>
            <X className="h-3.5 w-3.5 text-primary-foreground/50" />
          </button>
        )}
      </div>

      {/* Filter popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/10">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] space-y-3" align="end">
          <p className="text-sm font-medium">{isAr ? 'تصفية' : 'Filters'}</p>
          <div>
            <Label className="text-xs">{isAr ? 'الحالة' : 'Status'}</Label>
            <Select value={filters.status} onValueChange={v => onFiltersChange({ ...filters, status: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {TICKET_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{isAr ? 'الأولوية' : 'Priority'}</Label>
            <Select value={filters.priority} onValueChange={v => onFiltersChange({ ...filters, priority: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{isAr ? 'النوع' : 'Type'}</Label>
            <Select value={filters.type} onValueChange={v => onFiltersChange({ ...filters, type: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {TICKET_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{isAr ? 'التخصص' : 'Trade'}</Label>
            <Select value={filters.trade} onValueChange={v => onFiltersChange({ ...filters, trade: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {TRADES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      {/* View mode */}
      <div className="flex border border-primary-foreground/20 rounded overflow-hidden">
        <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-none ${viewMode === 'plan' ? 'bg-primary-foreground/20' : ''} text-primary-foreground hover:bg-primary-foreground/10`} onClick={() => onViewModeChange('plan')}>
          <Map className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-none ${viewMode === 'list' ? 'bg-primary-foreground/20' : ''} text-primary-foreground hover:bg-primary-foreground/10`} onClick={() => onViewModeChange('list')}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-none ${viewMode === 'kanban' ? 'bg-primary-foreground/20' : ''} text-primary-foreground hover:bg-primary-foreground/10`} onClick={() => onViewModeChange('kanban')}>
          <Columns className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
