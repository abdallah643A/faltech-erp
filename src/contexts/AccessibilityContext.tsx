import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AccessibilityContextType {
  highContrast: boolean;
  toggleHighContrast: () => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('high-contrast') === 'true');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('high-contrast', String(highContrast));
  }, [highContrast]);

  const toggleHighContrast = useCallback(() => setHighContrast(prev => !prev), []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      requestAnimationFrame(() => setAssertiveMessage(message));
    } else {
      setPoliteMessage('');
      requestAnimationFrame(() => setPoliteMessage(message));
    }
  }, []);

  return (
    <AccessibilityContext.Provider value={{ highContrast, toggleHighContrast, announce, shortcutsOpen, setShortcutsOpen }}>
      {children}
      {/* Screen reader live regions */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {politeMessage}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only" role="alert">
        {assertiveMessage}
      </div>
    </AccessibilityContext.Provider>
  );
}
