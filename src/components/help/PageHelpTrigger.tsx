import { usePageHelp } from '@/hooks/usePageHelp';
import { PageHelpVideoPopup } from './PageHelpVideoPopup';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleHelp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function PageHelpTrigger() {
  const { helpContent, preference, showPopup, openPopup, dismissPopup, markDontShowAgain, markVideoWatched, hasHelp } = usePageHelp();
  const { language } = useLanguage();

  if (!hasHelp || !helpContent) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={openPopup}
        title={language === 'ar' ? 'دليل الصفحة' : 'Page Help Guide'}
        className="h-7 w-7 text-muted-foreground hover:text-primary"
      >
        <CircleHelp className="h-4 w-4" />
      </Button>

      <PageHelpVideoPopup
        open={showPopup}
        content={helpContent}
        preference={preference}
        onClose={dismissPopup}
        onDontShowAgain={markDontShowAgain}
        onVideoWatched={markVideoWatched}
      />
    </>
  );
}
