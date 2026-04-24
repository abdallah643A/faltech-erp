import { useEffect } from 'react';

/**
 * Keyboard Shortcuts Registry — Module 1 / Enhancement #10
 *
 * Lightweight global hotkey system. Components register shortcuts via
 * `useRegisterShortcut`; an app-level listener dispatches matching keys.
 * Press `?` (Shift+/) anywhere to open the cheat-sheet.
 *
 * Key string syntax (case-insensitive, '+' separated):
 *   "mod+k"            → Ctrl on Win/Linux, ⌘ on macOS
 *   "shift+/"          → ?
 *   "g then i"         → sequential ("g" then "i" within 1.2s)
 *   "alt+n"            → Alt+N
 *
 * Shortcuts NEVER fire while the user is typing in inputs/textareas
 * /contenteditable, unless `allowInInput: true`.
 */

export interface Shortcut {
  /** Unique id for de-dup. */
  id: string;
  /** Key combo string. See syntax above. */
  keys: string;
  /** Visible label, e.g. "Open command palette". */
  label: string;
  labelAr?: string;
  /** Group heading in cheat-sheet, e.g. "Navigation". */
  group: string;
  /** Handler. Return value ignored. */
  perform: (e: KeyboardEvent) => void;
  /** Allow shortcut to fire while typing in inputs. Default false. */
  allowInInput?: boolean;
  /** Higher = listed first within group. Default 0. */
  priority?: number;
}

type Listener = () => void;

const registry = new Map<string, Shortcut>();
const listeners = new Set<Listener>();
let cachedSnapshot: Shortcut[] = [];
function emit() { listeners.forEach(l => l()); }

export function registerShortcut(s: Shortcut): () => void {
  registry.set(s.id, s);
  cachedSnapshot = Array.from(registry.values()).sort((a, b) =>
    (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label)
  );
  emit();
  return () => {
    registry.delete(s.id);
    cachedSnapshot = Array.from(registry.values()).sort((a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label)
    );
    emit();
  };
}

export function getShortcuts(): Shortcut[] {
  return cachedSnapshot;
}

export function subscribeShortcuts(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useRegisterShortcut(
  shortcut: Shortcut | Shortcut[],
  opts: { enabled?: boolean } = {}
) {
  const { enabled = true } = opts;
  const items = Array.isArray(shortcut) ? shortcut : [shortcut];
  const ids = items.map(s => s.id).join('|');
  useEffect(() => {
    if (!enabled) return;
    const unsubs = items.map(s => registerShortcut(s));
    return () => { unsubs.forEach(u => u()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, enabled]);
}

// ─── Matcher ───────────────────────────────────────────────────────

const isMac = typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  return false;
}

/** Normalize a single combo like "mod+shift+k" into a canonical event key. */
function normalizeCombo(combo: string): string {
  return combo
    .toLowerCase()
    .split('+')
    .map(p => p.trim())
    .map(p => (p === 'mod' ? (isMac ? 'meta' : 'ctrl') : p))
    .map(p => (p === 'cmd' || p === 'command' ? 'meta' : p))
    .map(p => (p === 'control' ? 'ctrl' : p))
    .map(p => (p === 'option' ? 'alt' : p))
    .map(p => (p === 'esc' ? 'escape' : p))
    .map(p => (p === 'space' ? ' ' : p))
    .sort((a, b) => {
      // Modifiers first for stable comparison.
      const order = ['ctrl', 'meta', 'alt', 'shift'];
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    })
    .join('+');
}

function eventToCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.metaKey) parts.push('meta');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  const k = e.key.toLowerCase();
  // Skip pure modifier presses
  if (!['control', 'meta', 'alt', 'shift'].includes(k)) parts.push(k);
  return normalizeCombo(parts.join('+'));
}

/** Display-friendly version of a combo, e.g. "⌘ K" or "Ctrl+K". */
export function formatShortcut(keys: string): string {
  if (keys.includes(' then ')) {
    return keys.split(' then ').map(formatShortcut).join(' then ');
  }
  return keys.split('+').map(p => {
    const k = p.trim().toLowerCase();
    if (k === 'mod') return isMac ? '⌘' : 'Ctrl';
    if (k === 'meta' || k === 'cmd') return '⌘';
    if (k === 'ctrl') return 'Ctrl';
    if (k === 'alt' || k === 'option') return isMac ? '⌥' : 'Alt';
    if (k === 'shift') return '⇧';
    if (k === 'escape' || k === 'esc') return 'Esc';
    if (k === 'arrowup') return '↑';
    if (k === 'arrowdown') return '↓';
    if (k === 'arrowleft') return '←';
    if (k === 'arrowright') return '→';
    if (k === ' ' || k === 'space') return 'Space';
    return p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1);
  }).join(isMac ? ' ' : '+');
}

// ─── Global dispatcher (mounted once in App) ──────────────────────

interface SequenceState {
  buffer: string[];
  timer: number | null;
}
const SEQ_TIMEOUT = 1200;

export function installGlobalShortcutListener() {
  const seq: SequenceState = { buffer: [], timer: null };

  const handler = (e: KeyboardEvent) => {
    const typing = isTypingTarget(e.target);
    const combo = eventToCombo(e);

    // Push combo into the sequence buffer for "g then i" patterns.
    seq.buffer.push(combo);
    if (seq.buffer.length > 4) seq.buffer.shift();
    if (seq.timer) window.clearTimeout(seq.timer);
    seq.timer = window.setTimeout(() => { seq.buffer = []; }, SEQ_TIMEOUT);

    for (const s of getShortcuts()) {
      if (typing && !s.allowInInput) continue;
      const isSequence = s.keys.includes(' then ');
      if (isSequence) {
        const target = s.keys.split(' then ').map(normalizeCombo);
        const tail = seq.buffer.slice(-target.length);
        if (tail.length === target.length && tail.every((c, i) => c === target[i])) {
          e.preventDefault();
          seq.buffer = [];
          s.perform(e);
          return;
        }
      } else if (normalizeCombo(s.keys) === combo) {
        e.preventDefault();
        seq.buffer = [];
        s.perform(e);
        return;
      }
    }
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
    if (seq.timer) window.clearTimeout(seq.timer);
  };
}
