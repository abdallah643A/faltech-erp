import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, RotateCcw, ChevronUp, ChevronDown, Eye, EyeOff, Timer } from 'lucide-react';
import { type WidgetConfig, type DashboardView } from '@/hooks/useFinanceDashboardPrefs';

interface Props {
  widgets: WidgetConfig[];
  activeView: DashboardView;
  refreshInterval: number;
  onSetView: (v: DashboardView) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onReset: () => void;
  onSetRefresh: (s: number) => void;
}

const viewLabels: Record<DashboardView, { en: string; ar: string; desc: string }> = {
  all: { en: 'All Widgets', ar: 'الكل', desc: 'Complete dashboard' },
  cfo: { en: 'CFO View', ar: 'عرض المدير المالي', desc: 'Strategic metrics & forecasts' },
  accountant: { en: 'Accountant', ar: 'المحاسب', desc: 'Reconciliation & aging focus' },
  finance_manager: { en: 'Finance Manager', ar: 'مدير المالية', desc: 'Operational metrics' },
};

export function DashboardCustomizer({
  widgets, activeView, refreshInterval,
  onSetView, onToggle, onMove, onReset, onSetRefresh
}: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [open, setOpen] = useState(false);

  const sorted = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <div className="flex items-center gap-2">
      {/* Role View Selector */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
        {Object.entries(viewLabels).map(([key, info]) => (
          <Button
            key={key}
            variant={activeView === key ? 'default' : 'ghost'}
            size="sm"
            className={`h-6 text-[10px] px-2 ${activeView === key ? '' : 'text-muted-foreground'}`}
            onClick={() => onSetView(key as DashboardView)}
            title={info.desc}
          >
            {isAr ? info.ar : info.en}
          </Button>
        ))}
      </div>

      {/* Refresh indicator */}
      <Badge variant="outline" className="text-[10px] gap-1">
        <Timer className="h-2.5 w-2.5" />
        {refreshInterval}s
      </Badge>

      {/* Settings Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {isAr ? 'تخصيص لوحة التحكم' : 'Customize Dashboard'}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onReset}>
                <RotateCcw className="h-3 w-3 mr-1" /> {isAr ? 'إعادة تعيين' : 'Reset'}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Refresh interval */}
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">{isAr ? 'فاصل التحديث' : 'Refresh Interval'}</span>
            <Select value={String(refreshInterval)} onValueChange={v => onSetRefresh(Number(v))}>
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30s</SelectItem>
                <SelectItem value="60">1 min</SelectItem>
                <SelectItem value="120">2 min</SelectItem>
                <SelectItem value="300">5 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Widget list */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {sorted.map((w, idx) => (
              <div key={w.id} className={`flex items-center gap-2 p-2 rounded-lg ${w.visible ? 'bg-muted/30' : 'opacity-50'}`}>
                <Switch checked={w.visible} onCheckedChange={() => onToggle(w.id)} className="scale-75" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{isAr ? w.titleAr : w.title}</p>
                  <div className="flex gap-1">
                    {w.roles.map(r => (
                      <Badge key={r} variant="outline" className="text-[8px] px-1">{r}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMove(w.id, 'up')} disabled={idx === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMove(w.id, 'down')} disabled={idx === sorted.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
