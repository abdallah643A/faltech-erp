import { useState, useEffect, useCallback, useContext } from 'react';
import TranslationEditDialog from './TranslationEditDialog';
import { LanguageContext } from '@/contexts/LanguageContext';

/**
 * Global overlay: detects Ctrl+right-click on any element with data-tkey attribute
 * to open the translation editor. Add data-tkey="some.key" to any element.
 * 
 * Also provides a floating translate button on regular right-click on labels/headings.
 */
export default function TranslationOverlay() {
  const ctx = useContext(LanguageContext);
  // Gracefully bail out if rendered outside LanguageProvider (concurrent render recovery)
  if (!ctx) return null;
  return <TranslationOverlayInner />;
}

function TranslationOverlayInner() {
  const ctx = useContext(LanguageContext)!;
  const language = ctx.language;
  const [editState, setEditState] = useState<{
    open: boolean;
    key: string;
    text: string;
    context?: string;
  }>({ open: false, key: '', text: '' });

  const handleContextMenu = useCallback((e: MouseEvent) => {
    // Only on Ctrl+Right-click (or Meta on Mac)
    if (!e.ctrlKey && !e.metaKey) return;

    const target = e.target as HTMLElement;
    
    // Walk up to find data-tkey
    let el: HTMLElement | null = target;
    let tKey: string | null = null;
    while (el && !tKey) {
      tKey = el.getAttribute('data-tkey');
      el = el.parentElement;
    }

    if (!tKey) {
      // Auto-generate a key from the text content for inline labels
      const text = target.textContent?.trim();
      if (text && text.length < 200 && text.length > 0) {
        tKey = 'custom.' + text.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\u0900-\u097F]+/g, '_').slice(0, 80);
        e.preventDefault();
        setEditState({ open: true, key: tKey, text, context: window.location.pathname });
        return;
      }
      return;
    }

    e.preventDefault();
    const text = target.textContent?.trim() || '';
    setEditState({ open: true, key: tKey, text, context: window.location.pathname });
  }, []);

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [handleContextMenu]);

  return (
    <TranslationEditDialog
      open={editState.open}
      onOpenChange={(open) => setEditState(prev => ({ ...prev, open }))}
      translationKey={editState.key}
      currentText={editState.text}
      context={editState.context}
    />
  );
}
