import { useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Command Actions Registry — Module 1 / Enhancement #6
 *
 * Lightweight global registry for executable command-palette actions ("verbs"),
 * complementing the existing GlobalSpotlightSearch which handles navigation,
 * record search, and quick-create.
 *
 * Modules register actions via `useRegisterCommandAction()` from any mounted
 * component (page, layout, drawer). Registrations auto-unmount with the
 * component, so context-sensitive commands appear only when relevant
 * (e.g. "Approve this PO" only when the PO drawer is open).
 *
 * The Spotlight reads `getCommandActions()` to merge them into its result list.
 */

export interface CommandAction {
  /** Stable unique id, used for de-dup. */
  id: string;
  /** Visible label. Use a verb-led phrase: "Approve PO-1234". */
  label: string;
  /** Optional Arabic label. Falls back to `label`. */
  labelAr?: string;
  /** Group heading shown in palette (e.g. "Approvals", "Finance"). */
  group: string;
  /** Lucide icon to display. */
  icon: LucideIcon;
  /** Execution handler. May be async; palette closes after it resolves. */
  perform: () => void | Promise<void>;
  /** Optional keyword/synonym list to improve fuzzy matching. */
  keywords?: string[];
  /** Optional shortcut hint shown on the right (e.g. "⌘⇧A"). Display only. */
  shortcut?: string;
  /** Higher = appears first within group. Default 0. */
  priority?: number;
  /** If true, action is destructive — palette can render warning style. */
  destructive?: boolean;
}

type Listener = () => void;

const registry = new Map<string, CommandAction>();
const listeners = new Set<Listener>();
let cachedSnapshot: CommandAction[] = [];

function emit() { listeners.forEach(l => l()); }

export function registerCommandAction(action: CommandAction): () => void {
  registry.set(action.id, action);
  cachedSnapshot = Array.from(registry.values()).sort((a, b) =>
    (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label)
  );
  emit();
  return () => {
    registry.delete(action.id);
    cachedSnapshot = Array.from(registry.values()).sort((a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label)
    );
    emit();
  };
}

export function getCommandActions(): CommandAction[] {
  return cachedSnapshot;
}

export function subscribeCommandActions(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/**
 * Hook: register one or more command actions for the lifetime of the calling
 * component. Pass `enabled=false` to temporarily withdraw the action.
 *
 * Example:
 *   useRegisterCommandAction({
 *     id: `approve-po-${po.id}`,
 *     label: `Approve ${po.doc_num}`,
 *     group: 'Approvals',
 *     icon: CheckCircle,
 *     perform: () => approvePO(po.id),
 *     keywords: ['approve', 'po', po.vendor_name],
 *   }, { enabled: po.status === 'pending' });
 */
export function useRegisterCommandAction(
  action: CommandAction | CommandAction[],
  opts: { enabled?: boolean } = {}
) {
  const { enabled = true } = opts;
  const actions = Array.isArray(action) ? action : [action];
  // Stable cache key from ids — re-register only when ids change
  const ids = actions.map(a => a.id).join('|');

  useEffect(() => {
    if (!enabled) return;
    const unsubs = actions.map(a => registerCommandAction(a));
    return () => { unsubs.forEach(u => u()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, enabled]);
}
