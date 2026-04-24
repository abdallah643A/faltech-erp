import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard, Search, Plus, Download, Filter, Contrast, HelpCircle } from 'lucide-react';

interface Shortcut {
  keys: string[];
  label: string;
  icon: React.ReactNode;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['Ctrl', 'K'], label: 'Open spotlight search', icon: <Search className="h-3.5 w-3.5" />, category: 'Global' },
  { keys: ['Ctrl', 'A'], label: 'Open keyboard shortcuts', icon: <Keyboard className="h-3.5 w-3.5" />, category: 'Global' },
  { keys: ['?'], label: 'Open help center', icon: <HelpCircle className="h-3.5 w-3.5" />, category: 'Global' },
  { keys: ['Ctrl', 'N'], label: 'New record (context-aware)', icon: <Plus className="h-3.5 w-3.5" />, category: 'Actions' },
  { keys: ['Ctrl', 'S'], label: 'Save current form', icon: <Download className="h-3.5 w-3.5" />, category: 'Actions' },
  { keys: ['Ctrl', 'E'], label: 'Export data', icon: <Download className="h-3.5 w-3.5" />, category: 'Actions' },
  { keys: ['Ctrl', 'F'], label: 'Toggle filters / Focus search', icon: <Filter className="h-3.5 w-3.5" />, category: 'Actions' },
  { keys: ['Ctrl', 'P'], label: 'Print current page', icon: <Keyboard className="h-3.5 w-3.5" />, category: 'Actions' },
  { keys: ['Ctrl', 'H'], label: 'Toggle high contrast mode', icon: <Contrast className="h-3.5 w-3.5" />, category: 'Accessibility' },
  { keys: ['Tab'], label: 'Navigate to next element', icon: <Keyboard className="h-3.5 w-3.5" />, category: 'Navigation' },
  { keys: ['Shift', 'Tab'], label: 'Navigate to previous element', icon: <Keyboard className="h-3.5 w-3.5" />, category: 'Navigation' },
  { keys: ['Enter'], label: 'Activate focused element', icon: <Keyboard className="h-3.5 w-3.5" />, category: 'Navigation' },
  { keys: ['Escape'], label: 'Close dialog / cancel', icon: <Keyboard className="h-3.5 w-3.5" />, category: 'Navigation' },
  { keys: ['N'], label: 'New record on current page', icon: <Plus className="h-3.5 w-3.5" />, category: 'Module' },
  { keys: ['G', 'D'], label: 'Go to Dashboard', icon: <Keyboard className="h-3.5 w-3.5" />, category: 'Module' },
  { keys: ['G', 'S'], label: 'Go to Sales Orders', icon: <Keyboard className="h-3.5 w-3.5" />, category: 'Module' },
  { keys: ['G', 'I'], label: 'Go to Invoices', icon: <Keyboard className="h-3.5 w-3.5" />, category: 'Module' },
];

export function KeyboardShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen, toggleHighContrast, announce } = useAccessibility();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl+A: open shortcuts (only when not in input)
      if (e.key === 'a' && (e.metaKey || e.ctrlKey) && !isInput) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // Ctrl+H: high contrast
      if (e.key === 'h' && (e.metaKey || e.ctrlKey) && !isInput) {
        e.preventDefault();
        toggleHighContrast();
        announce('High contrast mode toggled', 'assertive');
        return;
      }

      // Ctrl+N: trigger "new" button
      if (e.key === 'n' && (e.metaKey || e.ctrlKey) && !isInput) {
        e.preventDefault();
        const newBtn = document.querySelector<HTMLButtonElement>('[data-shortcut="new"]');
        if (newBtn) {
          newBtn.click();
          announce('New record dialog opened', 'polite');
        }
        return;
      }

      // Ctrl+E: trigger "export" button
      if (e.key === 'e' && (e.metaKey || e.ctrlKey) && !isInput) {
        e.preventDefault();
        const exportBtn = document.querySelector<HTMLButtonElement>('[data-shortcut="export"]');
        if (exportBtn) {
          exportBtn.click();
          announce('Export triggered', 'polite');
        }
        return;
      }

      // Ctrl+F: trigger "filter" button
      if (e.key === 'f' && (e.metaKey || e.ctrlKey) && !isInput) {
        e.preventDefault();
        const filterBtn = document.querySelector<HTMLButtonElement>('[data-shortcut="filter"]');
        if (filterBtn) {
          filterBtn.click();
          announce('Filters toggled', 'polite');
        }
        return;
      }

      // Ctrl+S: focus search
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[data-shortcut="search"]');
        if (searchInput) {
          searchInput.focus();
          announce('Search field focused', 'polite');
        }
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setShortcutsOpen, toggleHighContrast, announce]);

  const categories = [...new Set(shortcuts.map(s => s.category))];

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="sm:max-w-lg" aria-describedby="shortcuts-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <p id="shortcuts-description" className="sr-only">
          A list of all available keyboard shortcuts organized by category
        </p>
        <div className="max-h-[60vh] overflow-y-auto space-y-4 py-2">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category}</h3>
              <div className="space-y-1">
                {shortcuts.filter(s => s.category === category).map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm">
                      {shortcut.icon}
                      <span>{shortcut.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <kbd
                          key={ki}
                          className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-mono font-medium bg-muted border border-border rounded shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t text-[11px] text-muted-foreground text-center">
          Press <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">Ctrl+A</kbd> anytime to show this menu
        </div>
      </DialogContent>
    </Dialog>
  );
}
