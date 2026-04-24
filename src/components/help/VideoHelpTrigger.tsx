import { useState, useCallback } from 'react';
import { usePageHelp } from '@/hooks/usePageHelp';
import { PageHelpVideoPopup } from './PageHelpVideoPopup';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Video, Monitor } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function VideoHelpTrigger() {
  const { helpContent, preference, markDontShowAgain, markVideoWatched, hasHelp } = usePageHelp();
  const { language } = useLanguage();
  const [videoOpen, setVideoOpen] = useState(false);

  const openVideo = useCallback(() => setVideoOpen(true), []);
  const closeVideo = useCallback(() => setVideoOpen(false), []);

  const handleDontShow = useCallback(() => {
    setVideoOpen(false);
    markDontShowAgain();
  }, [markDontShowAgain]);

  // Show if there's help content (with or without video — screenshot mode works without video)
  if (!hasHelp || !helpContent) return null;

  const hasVideo = !!helpContent.video_url;
  const icon = hasVideo ? <Video className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;
  const tooltip = hasVideo
    ? (language === 'ar' ? 'دليل الفيديو' : 'Video Help Guide')
    : (language === 'ar' ? 'عرض تفاعلي للشاشة' : 'Screen Walkthrough');

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={openVideo}
        title={tooltip}
        className="h-7 w-7 text-muted-foreground hover:text-primary"
      >
        {icon}
      </Button>

      <PageHelpVideoPopup
        open={videoOpen}
        content={helpContent}
        preference={preference}
        onClose={closeVideo}
        onDontShowAgain={handleDontShow}
        onVideoWatched={markVideoWatched}
      />
    </>
  );
}
