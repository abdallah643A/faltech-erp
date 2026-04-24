import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Loader2, TrendingDown, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import {
  useCRMAIInsights,
  useGenerateInsight,
  type InsightType,
} from "@/hooks/useCRMAIInsights";

interface Props {
  businessPartnerId: string;
  insightType: InsightType;
}

const bandColor: Record<string, string> = {
  low: "bg-success/10 text-success border-success/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
  critical: "bg-destructive text-destructive-foreground",
};

export const AIInsightCard = ({ businessPartnerId, insightType }: Props) => {
  const { data: insight, isLoading } = useCRMAIInsights(businessPartnerId, insightType);
  const generate = useGenerateInsight();

  const isChurn = insightType === "churn_risk";
  const Icon = isChurn ? TrendingDown : Lightbulb;
  const title = isChurn ? "Churn Risk" : "Next Best Action";

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            generate.mutate({
              business_partner_id: businessPartnerId,
              insight_type: insightType,
              force_refresh: !!insight,
            })
          }
          disabled={generate.isPending}
        >
          {generate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : insight ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : !insight ? (
          <p className="text-xs text-muted-foreground">
            No insight yet. Click ✨ to generate.
          </p>
        ) : (
          <>
            {isChurn && insight.risk_band && (
              <div className="flex items-center gap-2">
                <Badge className={bandColor[insight.risk_band]}>
                  {insight.risk_band.toUpperCase()}
                </Badge>
                {insight.risk_score != null && (
                  <span className="text-sm font-semibold">
                    {Number(insight.risk_score).toFixed(0)} / 100
                  </span>
                )}
              </div>
            )}
            {insight.recommendation && (
              <p className="text-sm font-medium">{insight.recommendation}</p>
            )}
            {insight.rationale && (
              <p className="text-xs text-muted-foreground">{insight.rationale}</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {insight.model_used} · {format(new Date(insight.generated_at), "MMM d, HH:mm")}
              {insight.confidence != null && ` · ${insight.confidence}% conf.`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
