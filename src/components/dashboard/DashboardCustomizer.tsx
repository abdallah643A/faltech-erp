import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings2, GripVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface DashboardPreferences {
  widgets: WidgetConfig[];
  dateRange: '7d' | '30d' | '90d' | '6m' | '1y';
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'kpi-cards', label: 'KPI Cards', visible: true },
  { id: 'quick-overview', label: 'Quick Overview Pipeline', visible: true },
  { id: 'quick-access', label: 'Quick Access Links', visible: true },
  { id: 'crm-workflow', label: 'CRM Process Flow', visible: true },
  { id: 'sales-chart', label: 'Sales Chart', visible: true },
  { id: 'recent-activities', label: 'Recent Activities', visible: true },
  { id: 'contract-status', label: 'Contract Status', visible: true },
  { id: 'lead-source-roi', label: 'Lead Source ROI', visible: true },
  { id: 'top-opportunities', label: 'Top Opportunities', visible: true },
  { id: 'global-activity', label: 'Global Activity Feed', visible: true },
];

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  widgets: DEFAULT_WIDGETS,
  dateRange: '6m',
};

function SortableWidget({ widget, onToggle }: { widget: WidgetConfig; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium">{widget.label}</span>
      <Switch checked={widget.visible} onCheckedChange={() => onToggle(widget.id)} />
    </div>
  );
}

interface DashboardCustomizerProps {
  preferences: DashboardPreferences;
  onSave: (prefs: DashboardPreferences) => void;
}

export function DashboardCustomizer({ preferences, onSave }: DashboardCustomizerProps) {
  const { t } = useLanguage();
  const [localPrefs, setLocalPrefs] = useState<DashboardPreferences>(preferences);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setLocalPrefs(prev => {
      const sameDateRange = prev.dateRange === preferences.dateRange;
      const sameWidgets =
        prev.widgets.length === preferences.widgets.length &&
        prev.widgets.every((widget, index) => {
          const nextWidget = preferences.widgets[index];
          return !!nextWidget &&
            widget.id === nextWidget.id &&
            widget.label === nextWidget.label &&
            widget.visible === nextWidget.visible;
        });

      return sameDateRange && sameWidgets ? prev : preferences;
    });
  }, [preferences]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localPrefs.widgets.findIndex(w => w.id === active.id);
      const newIndex = localPrefs.widgets.findIndex(w => w.id === over.id);
      const newWidgets = arrayMove(localPrefs.widgets, oldIndex, newIndex);
      const updated = { ...localPrefs, widgets: newWidgets };
      setLocalPrefs(updated);
      onSave(updated);
    }
  };

  const toggleWidget = (id: string) => {
    const newWidgets = localPrefs.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    const updated = { ...localPrefs, widgets: newWidgets };
    setLocalPrefs(updated);
    onSave(updated);
  };

  const handleDateRange = (val: string) => {
    const updated = { ...localPrefs, dateRange: val as DashboardPreferences['dateRange'] };
    setLocalPrefs(updated);
    onSave(updated);
  };

  const handleReset = () => {
    setLocalPrefs(DEFAULT_PREFERENCES);
    onSave(DEFAULT_PREFERENCES);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" /> {t('dashboard.customize')}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('dashboard.customizeTitle')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label>{t('dashboard.chartDateRange')}</Label>
            <Select value={localPrefs.dateRange} onValueChange={handleDateRange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('dashboard.last7Days')}</SelectItem>
                <SelectItem value="30d">{t('dashboard.last30Days')}</SelectItem>
                <SelectItem value="90d">{t('dashboard.last90Days')}</SelectItem>
                <SelectItem value="6m">{t('dashboard.last6Months')}</SelectItem>
                <SelectItem value="1y">{t('dashboard.lastYear')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t('dashboard.widgetsControl')}</Label>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localPrefs.widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {localPrefs.widgets.map(widget => (
                    <SortableWidget key={widget.id} widget={widget} onToggle={toggleWidget} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <Separator />

          <Button variant="ghost" size="sm" onClick={handleReset} className="w-full">
            {t('dashboard.resetToDefault')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
