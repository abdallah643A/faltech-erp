import { useParams, Link } from "react-router-dom";
import { useCustomer360 } from "@/hooks/useCustomer360";
import { useActivityTimeline } from "@/hooks/useActivityTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AIInsightCard } from "@/components/crm/AIInsightCard";
import { EnrollInCadenceDialog } from "@/components/crm/EnrollInCadenceDialog";
import { useState } from "react";
import {
  ArrowLeft, Mail, Phone, Building2, ListPlus, FileText,
  AlertCircle, MessageSquare, History, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n || 0);

export default function Customer360Page() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useCustomer360(id);
  const { data: timeline = [] } = useActivityTimeline({
    entityType: "business_partners",
    recordId: id ?? "",
    enabled: !!id,
  });
  const [enrollOpen, setEnrollOpen] = useState(false);

  if (!id) return <div className="p-6">No customer selected</div>;
  if (isLoading || !data) return <div className="p-6">Loading…</div>;

  const p = data.partner;
  const a = data.arAging;

  return (
    <div className="page-enter space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/business-partners"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {p?.card_name ?? "Customer"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {p?.card_code} · {p?.card_type}
              {p?.status && <Badge variant="outline" className="ml-2">{p.status}</Badge>}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setEnrollOpen(true)} className="gap-1.5">
          <ListPlus className="h-3.5 w-3.5" /> Enroll in Cadence
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Lifetime Value" value={fmt(data.lifetimeValue)} />
        <Kpi label="Invoices" value={String(data.invoiceCount)} />
        <Kpi label="Avg. Order" value={fmt(data.avgOrderValue)} />
        <Kpi
          label="Open AR"
          value={fmt(a.total)}
          tone={a.over120 > 0 ? "danger" : a.bucket90 > 0 ? "warn" : "default"}
        />
      </div>

      {/* AI insights */}
      <div className="grid md:grid-cols-2 gap-3">
        <AIInsightCard businessPartnerId={id} insightType="next_best_action" />
        <AIInsightCard businessPartnerId={id} insightType="churn_risk" />
      </div>

      {/* AR Aging */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">AR Aging</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-5 gap-2 text-center text-xs">
          <Bucket label="Current" value={a.current} />
          <Bucket label="1-30" value={a.bucket30} />
          <Bucket label="31-60" value={a.bucket60} tone="warn" />
          <Bucket label="61-90" value={a.bucket90} tone="warn" />
          <Bucket label="120+" value={a.over120} tone="danger" />
        </CardContent>
      </Card>

      {/* Open documents */}
      <div className="grid md:grid-cols-3 gap-3">
        <DocList icon={FileText} title="Open Quotes" items={data.openQuotes} />
        <DocList icon={FileText} title="Open Orders" items={data.openOrders} />
        <DocList icon={AlertCircle} title="Unpaid Invoices" items={data.unpaidInvoices} balanceField />
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Unified Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {timeline.length === 0 && data.recentActivities.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No activity yet</p>
          ) : (
            <>
              {timeline.map((ev) => (
                <div key={ev.id} className="flex gap-2 border-l-2 border-primary/30 pl-3 py-1">
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      {ev.type === "comment" && <MessageSquare className="h-3 w-3" />}
                      {ev.type === "approval" && <CheckCircle2 className="h-3 w-3" />}
                      {ev.title}
                    </p>
                    {ev.body && <p className="text-xs text-muted-foreground">{ev.body}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {ev.actor ?? "system"} · {format(new Date(ev.at), "MMM d, HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
              {data.recentActivities.map((act) => (
                <div key={act.id} className="flex gap-2 border-l-2 border-muted pl-3 py-1">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{act.subject}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {act.type} · {act.status} · {format(new Date(act.created_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <EnrollInCadenceDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        leadId={id}
        leadName={p?.card_name}
      />
    </div>
  );
}

const Kpi = ({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warn" | "default" }) => (
  <Card>
    <CardContent className="p-3">
      <p className="text-[11px] text-muted-foreground uppercase">{label}</p>
      <p className={`text-lg font-semibold ${tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : ""}`}>
        {value}
      </p>
    </CardContent>
  </Card>
);

const Bucket = ({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" }) => (
  <div className={`p-2 rounded ${tone === "danger" ? "bg-destructive/10 text-destructive" : tone === "warn" ? "bg-warning/10 text-warning" : "bg-muted/50"}`}>
    <p className="text-[10px]">{label}</p>
    <p className="font-semibold text-sm">{fmt(value)}</p>
  </div>
);

const DocList = ({ icon: Icon, title, items, balanceField }: any) => (
  <Card>
    <CardHeader className="pb-2 flex flex-row items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <CardTitle className="text-sm">{title} ({items.length})</CardTitle>
    </CardHeader>
    <CardContent className="space-y-1 text-xs max-h-48 overflow-y-auto">
      {items.length === 0 ? (
        <p className="text-muted-foreground py-2">None</p>
      ) : (
        items.slice(0, 8).map((it: any) => (
          <div key={it.id} className="flex justify-between border-b border-muted/50 py-1">
            <span>{it.doc_num}</span>
            <span className="font-medium">
              {fmt(balanceField ? Number(it.balance_due ?? it.total ?? 0) : Number(it.total ?? 0))}
            </span>
          </div>
        ))
      )}
    </CardContent>
  </Card>
);
