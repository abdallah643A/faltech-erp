import { useState, useCallback } from 'react';

export interface TMOWidgetConfig {
  id: string;
  label: string;
  visible: boolean;
  size: 'kpi' | 'chart' | 'full';
}

const DEFAULT_WIDGETS: TMOWidgetConfig[] = [
  { id: 'kpi-tiles', label: 'KPI Tiles', visible: true, size: 'full' },
  { id: 'alerts', label: 'Alert System', visible: true, size: 'full' },
  { id: 'lifecycle-chart', label: 'Asset Lifecycle', visible: true, size: 'chart' },
  { id: 'tco-chart', label: 'TCO by Category', visible: true, size: 'chart' },
  { id: 'horizon-chart', label: 'Roadmap by Horizon', visible: true, size: 'chart' },
  { id: 'vendor-radar', label: 'Vendor Scores', visible: true, size: 'chart' },
  { id: 'governance', label: 'Governance Summary', visible: true, size: 'chart' },
];

const STORAGE_KEY = 'tmo-dashboard-widgets';
const LAYOUTS_KEY = 'tmo-dashboard-layouts';

export function useTMODashboardPrefs() {
  const [widgets, setWidgets] = useState<TMOWidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
    } catch {
      return DEFAULT_WIDGETS;
    }
  });

  const [savedLayouts, setSavedLayouts] = useState<{ name: string; widgets: TMOWidgetConfig[] }[]>(() => {
    try { return JSON.parse(localStorage.getItem(LAYOUTS_KEY) || '[]'); } catch { return []; }
  });

  const toggleWidget = useCallback((id: string) => {
    setWidgets(prev => {
      const next = prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    setWidgets(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WIDGETS));
  }, []);

  const saveLayout = useCallback((name: string) => {
    setSavedLayouts(prev => {
      const next = [...prev.filter(l => l.name !== name), { name, widgets }];
      localStorage.setItem(LAYOUTS_KEY, JSON.stringify(next));
      return next;
    });
  }, [widgets]);

  const loadLayout = useCallback((name: string) => {
    const layout = savedLayouts.find(l => l.name === name);
    if (layout) {
      setWidgets(layout.widgets);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout.widgets));
    }
  }, [savedLayouts]);

  const deleteLayout = useCallback((name: string) => {
    setSavedLayouts(prev => {
      const next = prev.filter(l => l.name !== name);
      localStorage.setItem(LAYOUTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isVisible = useCallback((id: string) => widgets.find(w => w.id === id)?.visible ?? true, [widgets]);

  return { widgets, toggleWidget, moveWidget, resetToDefault, saveLayout, loadLayout, deleteLayout, savedLayouts, isVisible };
}
