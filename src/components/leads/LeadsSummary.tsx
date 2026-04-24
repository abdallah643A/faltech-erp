import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { Lead } from '@/hooks/useLeads';

interface LeadsSummaryProps {
  leads: Lead[];
}

export function LeadsSummary({ leads }: LeadsSummaryProps) {
  const { language } = useLanguage();
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const generateSummary = async () => {
    if (leads.length === 0) {
      toast({
        title: "No Leads",
        description: "There are no leads to summarize.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsVisible(true);

    try {
      const leadsData = leads.slice(0, 100).map((lead) => ({
        type: 'lead',
        subject: `${lead.card_name}`,
        status: lead.status || 'New',
        priority: lead.score && lead.score >= 80 ? 'High' : lead.score && lead.score >= 50 ? 'Medium' : 'Low',
        relatedTo: lead.card_name,
        dueDate: lead.last_contact || lead.created_at,
      }));

      const { data, error } = await supabase.functions.invoke('summarize-activities', {
        body: { activities: leadsData, language },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

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
              {language === 'ar' ? 'ملخص العملاء المحتملين' : 'Leads Insights'}
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
                  {language === 'ar' ? 'جاري التحليل...' : 'Analyzing leads...'}
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
