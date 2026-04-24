import { Contrast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export function HighContrastToggle() {
  const { highContrast, toggleHighContrast } = useAccessibility();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleHighContrast}
      title={`${highContrast ? 'Disable' : 'Enable'} high contrast (Ctrl+H)`}
      className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
      aria-label={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
      aria-pressed={highContrast}
    >
      <Contrast className="h-4 w-4" />
    </Button>
  );
}
