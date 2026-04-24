import { useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Quick Actions Registry — Module 1 / Enhancement #9
 *
 * Context-aware "create" verbs surfaced through the floating FAB. Modules
 * register page-relevant quick-create actions (e.g. "New Sales Order",
 * "New PO Line") on mount; FAB shows the union, sorted by `priority`.
 *
 * Distinct from `commandActions` (general verbs across whole app):
 *   - QuickActions = creation-focused, page-scoped, displayed on FAB.
 *   - CommandActions = any verb, surfaced in Cmd+K palette.
 */

export interface QuickAction {
  id: string;
  label: string;
  labelAr?: string;
  icon: LucideIcon;
  perform: () => void | Promise<void>;
  /** Optional grouping label, e.g. "Sales", "Procurement". */
  group?: string;
  /** Higher = appears first. Default 0. */
  priority?: number;
  /** Visual color hint. Use semantic tokens. */
  color?: 'primary' | 'success' | 'warning' | 'info';
}

type Listener = () => void;
const registry = new Map<string, QuickAction>();
const listeners = new Set<Listener>();
let cachedSnapshot: QuickAction[] = [];

function emit() { listeners.forEach(l => l()); }

export function registerQuickAction(a: QuickAction): () => void {
  registry.set(a.id, a);
  cachedSnapshot = Array.from(registry.values()).sort((a, b) =>
    (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label)
  );
  emit();
  return () => {
    registry.delete(a.id);
    cachedSnapshot = Array.from(registry.values()).sort((a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label)
    );
    emit();
  };
}

export function getQuickActions(): QuickAction[] {
  return cachedSnapshot;
}

export function subscribeQuickActions(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useRegisterQuickAction(
  action: QuickAction | QuickAction[],
  opts: { enabled?: boolean } = {}
) {
  const { enabled = true } = opts;
  const actions = Array.isArray(action) ? action : [action];
  const ids = actions.map(a => a.id).join('|');

  useEffect(() => {
    if (!enabled) return;
    const unsubs = actions.map(a => registerQuickAction(a));
    return () => { unsubs.forEach(u => u()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, enabled]);
}
