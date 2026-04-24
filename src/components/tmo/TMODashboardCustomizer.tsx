import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings2, Eye, EyeOff, Save, RotateCcw, ChevronUp, ChevronDown, Trash2, Layout } from 'lucide-react';
import { useState } from 'react';
import type { TMOWidgetConfig } from '@/hooks/useTMODashboardPrefs';

interface Props {
  widgets: TMOWidgetConfig[];
  toggleWidget: (id: string) => void;
  moveWidget: (from: number, to: number) => void;
  resetToDefault: () => void;
  saveLayout: (name: string) => void;
  loadLayout: (name: string) => void;
  deleteLayout: (name: string) => void;
  savedLayouts: { name: string; widgets: TMOWidgetConfig[] }[];
}

export function TMODashboardCustomizer({ widgets, toggleWidget, moveWidget, resetToDefault, saveLayout, loadLayout, deleteLayout, savedLayouts }: Props) {
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    const name = prompt('Layout name:');
    if (name) saveLayout(name);
  };

  return (
    <div>
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Settings2 className="h-4 w-4 mr-1" /> Customize
      </Button>

      {open && (
        <Card className="mt-2">
          <CardContent className="pt-3 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Dashboard Widgets</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSave}>
                  <Save className="h-3 w-3 mr-1" />Save Layout
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={resetToDefault}>
                  <RotateCcw className="h-3 w-3 mr-1" />Reset
                </Button>
              </div>
            </div>

            {savedLayouts.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {savedLayouts.map(l => (
                  <div key={l.name} className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary" onClick={() => loadLayout(l.name)}>
                      <Layout className="h-3 w-3 mr-0.5" />{l.name}
                    </Button>
                    <button onClick={() => deleteLayout(l.name)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              {widgets.map((w, i) => (
                <div key={w.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                  <button onClick={() => toggleWidget(w.id)} className="shrink-0">
                    {w.visible ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                  <span className={`text-xs flex-1 ${!w.visible ? 'text-muted-foreground line-through' : ''}`}>{w.label}</span>
                  <Badge variant="outline" className="text-[9px] h-4">{w.size}</Badge>
                  <div className="flex gap-0.5">
                    <button disabled={i === 0} onClick={() => moveWidget(i, i - 1)} className="disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button disabled={i === widgets.length - 1} onClick={() => moveWidget(i, i + 1)} className="disabled:opacity-30">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
