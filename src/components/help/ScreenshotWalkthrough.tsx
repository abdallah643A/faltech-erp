import { useState, useEffect, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Play, Pause, SkipForward, ZoomIn, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WalkthroughStep {
  label: string;
  zoomX?: number; // percent 0-100
  zoomY?: number;
  zoomLevel?: number; // 1 = no zoom, 2 = 2x
  highlight?: { x: number; y: number; w: number; h: number }; // percent-based
}

interface Props {
  steps: WalkthroughStep[];
  narrating: boolean;
  onToggleNarration: () => void;
  isAr: boolean;
}

export function ScreenshotWalkthrough({ steps, narrating, onToggleNarration, isAr }: Props) {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepDuration = 4000; // ms per step

  // Capture screenshot of main content on mount
  useEffect(() => {
    const captureScreen = async () => {
      setCapturing(true);
      try {
        const mainEl = document.getElementById('main-content');
        if (!mainEl) {
          setCapturing(false);
          return;
        }

        // Temporarily hide help dialogs during capture
        const dialogs = document.querySelectorAll('[role="dialog"]');
        dialogs.forEach(d => (d as HTMLElement).style.visibility = 'hidden');

        const dataUrl = await toPng(mainEl, {
          quality: 0.85,
          pixelRatio: 1.5,
          filter: (node) => {
            // Filter out overlay elements
            if (node instanceof HTMLElement) {
              if (node.getAttribute('role') === 'dialog') return false;
              if (node.classList?.contains('fixed')) return false;
            }
            return true;
          },
        });

        dialogs.forEach(d => (d as HTMLElement).style.visibility = '');
        setScreenshot(dataUrl);
      } catch (err) {
        console.warn('Screenshot capture failed:', err);
      }
      setCapturing(false);
    };

    captureScreen();
  }, []);

  // Auto-play logic
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const startTime = Date.now() - (progress * stepDuration);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const stepProgress = (elapsed % stepDuration) / stepDuration;
      const stepIndex = Math.floor(elapsed / stepDuration);

      if (stepIndex >= steps.length) {
        setPlaying(false);
        setCurrentStep(steps.length - 1);
        setProgress(1);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      setCurrentStep(stepIndex);
      setProgress(stepProgress);
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, steps.length]);

  const handlePlayPause = () => {
    if (currentStep >= steps.length - 1 && progress >= 1) {
      // Restart
      setCurrentStep(0);
      setProgress(0);
    }
    setPlaying(!playing);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setProgress(0);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setProgress(0);
    setPlaying(true);
  };

  const step = steps[currentStep] || steps[0];
  const zoomLevel = step?.zoomLevel || 1;
  const zoomX = step?.zoomX || 50;
  const zoomY = step?.zoomY || 50;

  if (capturing) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">
            {isAr ? 'جاري التقاط الشاشة...' : 'Capturing screen...'}
          </span>
        </div>
      </div>
    );
  }

  if (!screenshot) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <span className="text-sm text-muted-foreground">
          {isAr ? 'لا يمكن التقاط الشاشة' : 'Unable to capture screen'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black overflow-hidden group">
      {/* Screenshot with zoom/pan animation */}
      <div
        className="absolute inset-0 transition-all duration-1000 ease-in-out"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: `${zoomX}% ${zoomY}%`,
        }}
      >
        <img
          src={screenshot}
          alt="Page screenshot"
          className="w-full h-full object-contain"
        />

        {/* Highlight overlay */}
        {step?.highlight && (
          <div
            className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_4000px_rgba(0,0,0,0.35)] transition-all duration-700 ease-in-out"
            style={{
              left: `${step.highlight.x}%`,
              top: `${step.highlight.y}%`,
              width: `${step.highlight.w}%`,
              height: `${step.highlight.h}%`,
            }}
          >
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-lg border-2 border-primary/50 animate-ping" />
          </div>
        )}
      </div>

      {/* Step label overlay */}
      <div className="absolute bottom-14 left-0 right-0 flex justify-center px-4 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 max-w-[80%]">
          <p className="text-white text-sm text-center font-medium">{step?.label}</p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-2 px-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={handlePlayPause}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={handleNext}
          disabled={currentStep >= steps.length - 1}
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={handleRestart}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        {/* Progress bar */}
        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden mx-2">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{
              width: `${((currentStep + progress) / steps.length) * 100}%`,
            }}
          />
        </div>

        {/* Step indicator */}
        <span className="text-white/60 text-[10px] min-w-[40px] text-center">
          {currentStep + 1}/{steps.length}
        </span>

        {/* Narration toggle */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={onToggleNarration}
        >
          {narrating ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-60" />}
        </Button>

        {/* Zoom indicator */}
        {zoomLevel > 1 && (
          <div className="flex items-center gap-1 text-white/50 text-[10px]">
            <ZoomIn className="h-3 w-3" />
            {zoomLevel.toFixed(1)}x
          </div>
        )}
      </div>

      {/* Narration indicator */}
      {narrating && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-white/80">
            {isAr ? 'جاري القراءة...' : 'Narrating...'}
          </span>
        </div>
      )}
    </div>
  );
}
