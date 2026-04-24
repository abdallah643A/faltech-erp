import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, BookOpen, EyeOff, Clock, CheckCircle2, ExternalLink, Volume2, VolumeX, Monitor } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHelpContent, UserHelpPreference } from '@/hooks/usePageHelp';
import { ScreenshotWalkthrough } from './ScreenshotWalkthrough';

interface Props {
  open: boolean;
  content: PageHelpContent;
  preference: UserHelpPreference;
  onClose: () => void;
  onDontShowAgain: () => void;
  onVideoWatched: () => void;
}

export function PageHelpVideoPopup({ open, content, preference, onClose, onDontShowAgain, onVideoWatched }: Props) {
  const { language } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [useScreenshot, setUseScreenshot] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isAr = language === 'ar';

  const title = (isAr && content.title_ar) ? content.title_ar : content.title_en;
  const description = (isAr && content.description_ar) ? content.description_ar : content.description_en;
  const bullets = (isAr && content.bullets_ar?.length) ? content.bullets_ar : content.bullets_en;

  // Auto-use screenshot mode if no video URL
  const showScreenshotMode = !content.video_url || useScreenshot;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Build walkthrough steps from bullets/content
  const walkthroughSteps = useMemo(() => {
    const steps: Array<{
      label: string;
      zoomX?: number;
      zoomY?: number;
      zoomLevel?: number;
      highlight?: { x: number; y: number; w: number; h: number };
    }> = [];

    // Step 1: Overview of the page
    steps.push({
      label: title + (description ? ` — ${description}` : ''),
      zoomLevel: 1,
      zoomX: 50,
      zoomY: 50,
    });

    // Step 2: Focus on top area (header/toolbar)
    steps.push({
      label: isAr ? 'شريط الأدوات والإجراءات الرئيسية' : 'Toolbar & main actions area',
      zoomLevel: 1.6,
      zoomX: 50,
      zoomY: 10,
    });

    // Generate steps from bullets
    if (bullets?.length) {
      const regions = [
        { zoomX: 30, zoomY: 35, zoomLevel: 1.4 },
        { zoomX: 70, zoomY: 35, zoomLevel: 1.4 },
        { zoomX: 50, zoomY: 55, zoomLevel: 1.5 },
        { zoomX: 30, zoomY: 65, zoomLevel: 1.3 },
        { zoomX: 70, zoomY: 65, zoomLevel: 1.3 },
        { zoomX: 50, zoomY: 80, zoomLevel: 1.4 },
      ];

      bullets.forEach((bullet, i) => {
        const region = regions[i % regions.length];
        steps.push({
          label: bullet,
          zoomLevel: region.zoomLevel,
          zoomX: region.zoomX,
          zoomY: region.zoomY,
        });
      });
    }

    // Final step: zoom back out
    steps.push({
      label: isAr ? 'هذا كل شيء! استكشف الصفحة بنفسك' : 'That\'s it! Explore the page on your own',
      zoomLevel: 1,
      zoomX: 50,
      zoomY: 50,
    });

    return steps;
  }, [title, description, bullets, isAr]);

  // Build narration text from content
  const getNarrationText = useCallback(() => {
    const parts: string[] = [];
    parts.push(title);
    if (description) parts.push(description);
    if (bullets?.length) {
      parts.push(isAr ? 'ما يمكنك فعله في هذه الصفحة:' : 'What you can do on this page:');
      bullets.forEach(b => parts.push(b));
    }
    return parts.join('. ');
  }, [title, description, bullets, isAr]);

  const stopNarration = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setNarrating(false);
    speechRef.current = null;
  }, []);

  const startNarration = useCallback(() => {
    if (!window.speechSynthesis) return;
    stopNarration();

    const utterance = new SpeechSynthesisUtterance(getNarrationText());
    utterance.lang = isAr ? 'ar-SA' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const targetLang = isAr ? 'ar' : 'en';
    const preferred = voices.find(v => v.lang.startsWith(targetLang) && v.name.includes('Google'));
    const fallback = voices.find(v => v.lang.startsWith(targetLang));
    if (preferred) utterance.voice = preferred;
    else if (fallback) utterance.voice = fallback;

    utterance.onend = () => setNarrating(false);
    utterance.onerror = () => setNarrating(false);

    speechRef.current = utterance;
    setNarrating(true);
    window.speechSynthesis.speak(utterance);
  }, [getNarrationText, isAr, stopNarration]);

  const handlePlay = () => {
    setPlaying(true);
    onVideoWatched();
    setTimeout(() => startNarration(), 300);
  };

  const toggleNarration = () => {
    if (narrating) {
      stopNarration();
    } else {
      startNarration();
    }
  };

  // Stop narration when dialog closes
  useEffect(() => {
    if (!open) {
      stopNarration();
      setPlaying(false);
      setUseScreenshot(false);
    }
  }, [open, stopNarration]);

  // Preload voices
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const isYouTube = (url: string) => /youtube\.com|youtu\.be/.test(url);

  const getEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
    return url;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="bg-primary/5 border-b p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-[10px]">
                  {isAr ? 'دليل الصفحة' : 'Page Guide'}
                </Badge>
                {preference.video_watched && (
                  <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {isAr ? 'تمت المشاهدة' : 'Watched'}
                  </Badge>
                )}
              </div>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {/* Toggle between video and screenshot mode when video exists */}
            {content.video_url && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setUseScreenshot(!useScreenshot)}
                className="text-xs h-7 gap-1"
              >
                <Monitor className="h-3 w-3" />
                {useScreenshot
                  ? (isAr ? 'عرض الفيديو' : 'Show Video')
                  : (isAr ? 'عرض الشاشة' : 'Live Screen')
                }
              </Button>
            )}
          </div>
        </div>

        {/* Video / Screenshot section */}
        {showScreenshotMode ? (
          // Screenshot walkthrough mode — real page capture
          playing ? (
            <ScreenshotWalkthrough
              steps={walkthroughSteps}
              narrating={narrating}
              onToggleNarration={toggleNarration}
              isAr={isAr}
            />
          ) : (
            <div className="relative bg-muted aspect-video">
              <button onClick={handlePlay} className="w-full h-full flex flex-col items-center justify-center gap-3 group cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:bg-primary shadow-lg">
                  <Play className="h-7 w-7 text-primary-foreground ml-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm font-medium">
                    {isAr ? 'عرض تفاعلي للشاشة الحالية' : 'Interactive Screen Walkthrough'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-muted-foreground/60 text-[11px]">
                    {isAr ? 'مع شرح صوتي' : 'with voice narration'}
                  </span>
                </div>
              </button>
            </div>
          )
        ) : content.video_url ? (
          // Original video mode
          <div className="relative bg-black aspect-video">
            {playing ? (
              <>
                {isYouTube(content.video_url) ? (
                  <iframe
                    src={getEmbedUrl(content.video_url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={title}
                  />
                ) : (
                  <video
                    src={content.video_url}
                    className="w-full h-full object-contain"
                    autoPlay
                    loop
                    playsInline
                    muted
                    title={title}
                  />
                )}
                <button
                  onClick={toggleNarration}
                  className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center z-10"
                  title={narrating ? (isAr ? 'إيقاف الصوت' : 'Mute narration') : (isAr ? 'تشغيل الصوت' : 'Play narration')}
                >
                  {narrating ? (
                    <Volume2 className="h-4 w-4 text-white" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-white/60" />
                  )}
                </button>
                {narrating && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[11px] text-white/80">
                      {isAr ? 'جاري القراءة...' : 'Narrating...'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <button onClick={handlePlay} className="w-full h-full flex flex-col items-center justify-center gap-3 group cursor-pointer">
                <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:bg-primary shadow-lg">
                  <Play className="h-7 w-7 text-primary-foreground ml-1" />
                </div>
                {content.video_duration_seconds && (
                  <div className="flex items-center gap-1 text-white/70 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatDuration(content.video_duration_seconds)}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-xs">
                    {isAr ? 'انقر للمشاهدة' : 'Click to watch'}
                  </span>
                  <Volume2 className="h-3 w-3 text-white/40" />
                  <span className="text-white/40 text-[10px]">
                    {isAr ? '+ صوت' : '+ voice'}
                  </span>
                </div>
              </button>
            )}
          </div>
        ) : null}

        {/* Bullets */}
        {bullets && bullets.length > 0 && (
          <div className="p-5 border-b">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              {isAr ? 'ما يمكنك فعله في هذه الصفحة:' : 'What you can do on this page:'}
            </h3>
            <ul className="space-y-1.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onDontShowAgain} className="text-xs text-muted-foreground h-8">
              <EyeOff className="h-3 w-3 mr-1" />
              {isAr ? 'لا تعرض مرة أخرى' : "Don't show again"}
            </Button>
            {content.documentation_url && (
              <Button size="sm" variant="ghost" asChild className="text-xs h-8">
                <a href={content.documentation_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {isAr ? 'مركز المساعدة' : 'Help Center'}
                </a>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="h-8">
              {isAr ? 'تخطي' : 'Skip'}
            </Button>
            {!playing && (
              <Button size="sm" onClick={handlePlay} className="h-8">
                <Play className="h-3 w-3 mr-1" />
                {isAr ? 'شاهد الآن' : 'Watch Now'}
              </Button>
            )}
          </div>
        </div>

        {content.last_updated_at && (
          <div className="px-5 pb-3 text-[10px] text-muted-foreground">
            {isAr ? 'آخر تحديث: ' : 'Last updated: '}{new Date(content.last_updated_at).toLocaleDateString()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
