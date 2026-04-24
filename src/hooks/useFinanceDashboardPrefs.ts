import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface WidgetConfig {
  id: string;
  title: string;
  titleAr: string;
  visible: boolean;
  order: number;
  size: 'full' | 'half' | 'third';
  // Which role views include this widget
  roles: ('cfo' | 'accountant' | 'finance_manager' | 'all')[];
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'critical-alerts', title: 'Critical Alerts', titleAr: 'التنبيهات الحرجة', visible: true, order: 0, size: 'full', roles: ['all'] },
  { id: 'kpi-cards', title: 'KPI Cards', titleAr: 'بطاقات المؤشرات', visible: true, order: 1, size: 'full', roles: ['all'] },
  { id: 'cash-flow-trend', title: 'Cash Flow Trend', titleAr: 'اتجاه التدفق النقدي', visible: true, order: 2, size: 'half', roles: ['cfo', 'finance_manager', 'all'] },
  { id: 'aging-drilldown', title: 'Receivables Aging', titleAr: 'تقادم الذمم', visible: true, order: 3, size: 'half', roles: ['accountant', 'finance_manager', 'all'] },
  { id: 'budget-vs-actual', title: 'Budget vs Actual', titleAr: 'الميزانية مقابل الفعلي', visible: true, order: 4, size: 'half', roles: ['cfo', 'finance_manager', 'all'] },
  { id: 'payment-methods', title: 'Payment Methods', titleAr: 'طرق الدفع', visible: true, order: 5, size: 'half', roles: ['accountant', 'all'] },
  { id: 'top-customers', title: 'Top Customers', titleAr: 'أعلى العملاء', visible: true, order: 6, size: 'half', roles: ['cfo', 'all'] },
  { id: 'budget-variance', title: 'Budget Variance', titleAr: 'انحراف الميزانية', visible: true, order: 7, size: 'half', roles: ['finance_manager', 'all'] },
  { id: 'enhanced-forecast', title: 'Cash Flow Forecast', titleAr: 'توقعات التدفق النقدي', visible: true, order: 8, size: 'full', roles: ['cfo', 'finance_manager', 'all'] },
  { id: 'reconciliation', title: 'Payment Reconciliation', titleAr: 'تسوية المدفوعات', visible: true, order: 9, size: 'full', roles: ['accountant', 'finance_manager', 'all'] },
];

export type DashboardView = 'all' | 'cfo' | 'accountant' | 'finance_manager';

const STORAGE_KEY = 'finance-dashboard-prefs';

export function useFinanceDashboardPrefs() {
  const { roles } = useAuth();

  // Detect default view from user roles
  const detectedView: DashboardView = roles.includes('admin') || roles.includes('manager')
    ? 'all'
    : 'all'; // Default to all since we can't detect CFO/accountant from app_role

  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved with defaults to pick up new widgets
        return DEFAULT_WIDGETS.map(dw => {
          const saved = parsed.find((s: WidgetConfig) => s.id === dw.id);
          return saved ? { ...dw, visible: saved.visible, order: saved.order, size: saved.size } : dw;
        });
      }
    } catch {}
    return DEFAULT_WIDGETS;
  });

  const [activeView, setActiveView] = useState<DashboardView>(detectedView);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    try { return Number(localStorage.getItem('finance-refresh-interval')) || 60; } catch { return 60; }
  });

  const savePrefs = useCallback((newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
  }, []);

  const toggleWidget = useCallback((id: string) => {
    savePrefs(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  }, [widgets, savePrefs]);

  const moveWidget = useCallback((id: string, direction: 'up' | 'down') => {
    const sorted = [...widgets].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(w => w.id === id);
    if (direction === 'up' && idx > 0) {
      const temp = sorted[idx].order;
      sorted[idx].order = sorted[idx - 1].order;
      sorted[idx - 1].order = temp;
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const temp = sorted[idx].order;
      sorted[idx].order = sorted[idx + 1].order;
      sorted[idx + 1].order = temp;
    }
    savePrefs(sorted);
  }, [widgets, savePrefs]);

  const resetLayout = useCallback(() => {
    savePrefs(DEFAULT_WIDGETS);
  }, [savePrefs]);

  const updateRefreshInterval = useCallback((seconds: number) => {
    setRefreshInterval(seconds);
    localStorage.setItem('finance-refresh-interval', String(seconds));
  }, []);

  const visibleWidgets = widgets
    .filter(w => w.visible && (activeView === 'all' || w.roles.includes(activeView) || w.roles.includes('all')))
    .sort((a, b) => a.order - b.order);

  return {
    widgets,
    visibleWidgets,
    activeView,
    setActiveView,
    toggleWidget,
    moveWidget,
    resetLayout,
    refreshInterval,
    updateRefreshInterval,
  };
}
