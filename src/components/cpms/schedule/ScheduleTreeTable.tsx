import { useState } from 'react';
import { ScheduleActivity } from '@/hooks/useProjectSchedule';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal, Pencil, Trash2, Copy, Diamond, AlertTriangle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800',
  delayed: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  critical: 'text-destructive',
};

const LEVEL_ICONS: Record<string, string> = {
  stage: '📁',
  wbs: '📋',
  task: '🔧',
  milestone: '💎',
};

interface Props {
  activities: ScheduleActivity[];
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (activity: ScheduleActivity) => void;
  onAddChild: (parentId: string | null, levelType: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onConvertMilestone: (id: string) => void;
  onInlineUpdate: (id: string, field: string, value: any) => void;
}

export default function ScheduleTreeTable({
  activities, expanded, toggleExpand, onEdit, onAddChild, onDelete, onDuplicate, onConvertMilestone, onInlineUpdate,
}: Props) {

  const renderRow = (activity: ScheduleActivity) => {
    const depth = activity._depth || 0;
    const hasChildren = activities.some(a => a.parent_activity_id === activity.id);
    const isExpanded = expanded.has(activity.id);
    const isMilestone = activity.level_type === 'milestone' || activity.type === 'milestone';
    const isStage = activity.level_type === 'stage';
    const isWBS = activity.level_type === 'wbs';
    const isDelayed = activity.status === 'delayed';
    const isCompleted = activity.status === 'completed' || (activity.progress_pct && activity.progress_pct >= 100);

    // Check if hidden by parent collapse
    if (activity.parent_activity_id && !isVisible(activity, activities, expanded)) return null;

    return (
      <tr key={activity.id} className={cn(
        'border-b text-sm hover:bg-muted/40 transition-colors',
        isStage && 'bg-primary/5 font-semibold',
        isWBS && 'bg-muted/20',
        isDelayed && 'bg-destructive/5',
        isCompleted && 'bg-green-50/50',
      )}>
        {/* Name with tree indent */}
        <td className="p-2 sticky left-0 bg-inherit z-10 min-w-[280px]">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
            {hasChildren ? (
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => toggleExpand(activity.id)}>
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            ) : <span className="w-5 shrink-0" />}
            <span className="text-xs mr-1">{LEVEL_ICONS[activity.level_type] || '📄'}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate max-w-[200px] cursor-pointer hover:text-primary" onClick={() => onEdit(activity)}>
                    {activity.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm">
                  <div className="space-y-1 text-xs">
                    <p className="font-bold">{activity.code} - {activity.name}</p>
                    <p>WBS: {activity.code}</p>
                    <p>Planned: {activity.start_date || '-'} → {activity.end_date || '-'}</p>
                    <p>Actual: {activity.actual_start || '-'} → {activity.actual_end || '-'}</p>
                    <p>Progress: {activity.progress_pct || 0}%</p>
                    <p>Status: {activity.status}</p>
                    <p>Responsible: {activity.resource_names || '-'}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </td>
        {/* Code */}
        <td className="p-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{activity.code}</td>
        {/* Level Type */}
        <td className="p-2">
          <Badge variant="outline" className="text-[10px] capitalize">{activity.level_type}</Badge>
        </td>
        {/* Status */}
        <td className="p-2">
          <Badge className={cn('text-[10px]', STATUS_COLORS[activity.status] || STATUS_COLORS.not_started)}>
            {activity.status?.replace('_', ' ')}
          </Badge>
        </td>
        {/* Priority */}
        <td className="p-2">
          <span className={cn('text-xs font-medium capitalize', PRIORITY_COLORS[activity.priority] || '')}>
            {activity.priority}
          </span>
        </td>
        {/* Start Date */}
        <td className="p-2 text-xs whitespace-nowrap">{activity.start_date || '-'}</td>
        {/* End Date */}
        <td className="p-2 text-xs whitespace-nowrap">{activity.end_date || '-'}</td>
        {/* Duration */}
        <td className="p-2 text-xs text-right">{activity.duration || '-'}</td>
        {/* Actual Start */}
        <td className="p-2 text-xs whitespace-nowrap text-muted-foreground">{activity.actual_start || '-'}</td>
        {/* Actual End */}
        <td className="p-2 text-xs whitespace-nowrap text-muted-foreground">{activity.actual_end || '-'}</td>
        {/* Progress */}
        <td className="p-2 min-w-[100px]">
          <div className="flex items-center gap-1">
            <Progress value={activity.progress_pct || 0} className="h-2 flex-1" />
            <span className="text-[10px] font-mono w-8 text-right">{activity.progress_pct || 0}%</span>
          </div>
        </td>
        {/* Responsible */}
        <td className="p-2 text-xs truncate max-w-[100px]">{activity.resource_names || '-'}</td>
        {/* Weight */}
        <td className="p-2 text-xs text-right">{activity.weight_pct || '-'}%</td>
        {/* Actions */}
        <td className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-3 w-3" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(activity)}>
                <Pencil className="h-3 w-3 mr-2" /> Edit
              </DropdownMenuItem>
              {!isMilestone && (
                <DropdownMenuItem onClick={() => onAddChild(activity.id, activity.level_type === 'stage' ? 'wbs' : 'task')}>
                  <Plus className="h-3 w-3 mr-2" /> Add Child
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDuplicate(activity.id)}>
                <Copy className="h-3 w-3 mr-2" /> Duplicate
              </DropdownMenuItem>
              {!isMilestone && (
                <DropdownMenuItem onClick={() => onConvertMilestone(activity.id)}>
                  <Diamond className="h-3 w-3 mr-2" /> Convert to Milestone
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(activity.id)}>
                <Trash2 className="h-3 w-3 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-auto max-h-[600px] border rounded-lg">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur z-20 text-xs">
          <tr className="border-b">
            <th className="p-2 sticky left-0 bg-muted/80 z-30 min-w-[280px]">Name</th>
            <th className="p-2">Code</th>
            <th className="p-2">Type</th>
            <th className="p-2">Status</th>
            <th className="p-2">Priority</th>
            <th className="p-2">Start</th>
            <th className="p-2">End</th>
            <th className="p-2 text-right">Days</th>
            <th className="p-2">Act. Start</th>
            <th className="p-2">Act. End</th>
            <th className="p-2">Progress</th>
            <th className="p-2">Responsible</th>
            <th className="p-2 text-right">Weight</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.length === 0 ? (
            <tr><td colSpan={14} className="p-8 text-center text-muted-foreground">No activities yet. Add a Stage to start planning.</td></tr>
          ) : (
            activities.map(a => renderRow(a))
          )}
        </tbody>
      </table>
    </div>
  );
}

function isVisible(activity: ScheduleActivity, all: ScheduleActivity[], expanded: Set<string>): boolean {
  if (!activity.parent_activity_id) return true;
  if (!expanded.has(activity.parent_activity_id)) return false;
  const parent = all.find(a => a.id === activity.parent_activity_id);
  if (!parent) return true;
  return isVisible(parent, all, expanded);
}
