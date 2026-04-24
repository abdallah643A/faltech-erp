import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModuleHelp } from '@/data/helpContent';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle, Lightbulb, ExternalLink, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ModuleHelpDrawerProps {
  module: ModuleHelp;
  triggerClassName?: string;
}

export function ModuleHelpDrawer({ module, triggerClassName }: ModuleHelpDrawerProps) {
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const { t } = useLanguage();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-1.5 text-xs', triggerClassName)}>
          <HelpCircle className="h-3.5 w-3.5" />
          {t('help.helpGuide')}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[480px] p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            {module.title}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">{module.description}</p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> {t('help.keyFeatures')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {module.keyFeatures.map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground mb-2">{t('help.stepByStep')}</p>
              {module.steps.map((step, index) => (
                <div
                  key={index}
                  className={cn(
                    'rounded-lg border p-3 cursor-pointer transition-all',
                    expandedStep === index ? 'border-primary/30 bg-primary/5' : 'hover:bg-muted/50'
                  )}
                  onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      expandedStep === index ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      {index + 1}
                    </span>
                    <span className="text-xs font-medium flex-1">{step.title}</span>
                    <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform', expandedStep === index && 'rotate-90')} />
                  </div>
                  {expandedStep === index && (
                    <p className="text-xs text-muted-foreground mt-2 ml-7 leading-relaxed">{step.description}</p>
                  )}
                </div>
              ))}
            </div>

            {module.faqs && module.faqs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('help.faqs')}</p>
                {module.faqs.map((faq, i) => (
                  <div key={i} className="rounded-lg border p-3 mb-1.5">
                    <p className="text-xs font-medium">{faq.q}</p>
                    <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5"
              onClick={() => navigate(`/help?module=${module.id}`)}
            >
              <ExternalLink className="h-3 w-3" /> {t('help.viewFullGuide')}
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
