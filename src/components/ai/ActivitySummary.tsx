import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Activity {
  type: string;
  subject: string;
  status: string;
  priority: string;
  relatedTo: string;
  dueDate: string;
}

interface ActivitySummaryProps {
  activities: Activity[];
}

export function ActivitySummary({ activities }: ActivitySummaryProps) {
  const { language, t } = useLanguage();
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const generateSummary = async () => {
    if (activities.length === 0) {
      toast({
        title: "No Activities",
        description: "There are no activities to summarize.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsVisible(true);

    try {
      const { data, error } = await supabase.functions.invoke('summarize-activities', {
        body: { activities, language },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setSummary(data.summary);
    } catch (error) {
      console.error('Summary error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate summary",
        variant: "destructive",
      });
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  const closeSummary = () => {
    setIsVisible(false);
    setSummary(null);
  };

  return (
    <div className="relative">
      <Button
        onClick={generateSummary}
        disabled={isLoading}
        variant="outline"
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {language === 'ar' ? 'ملخص بالذكاء الاصطناعي' : 'AI Summary'}
      </Button>

      {isVisible && (
        <Card className="absolute top-12 right-0 w-[400px] z-50 shadow-xl max-h-[500px] overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'ملخص النشاط' : 'Activity Insights'}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeSummary}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">
                  {language === 'ar' ? 'جاري التحليل...' : 'Analyzing activities...'}
                </span>
              </div>
            ) : summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
