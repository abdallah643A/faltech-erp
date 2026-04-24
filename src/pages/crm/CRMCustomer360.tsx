import { useState } from "react";
import { useCustomerTimeline } from "@/hooks/useCRMLifecycle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, FileText, Phone, Mail, ShoppingCart, AlertCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const moduleIcons: Record<string, any> = {
  sales: ShoppingCart,
  invoice: FileText,
  call: Phone,
  email: Mail,
  support: AlertCircle,
  whatsapp: MessageSquare,
};

export default function CRMCustomer360() {
  const [bpId, setBpId] = useState("");
  const { data: events, isLoading } = useCustomerTimeline(bpId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer 360 History</h1>
        <p className="text-muted-foreground mt-1">Unified timeline of every interaction across modules.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Search className="h-5 w-5 text-muted-foreground self-center" />
            <Input
              placeholder="Paste Business Partner ID to view full history…"
              value={bpId}
              onChange={(e) => setBpId(e.target.value.trim())}
            />
          </div>
        </CardContent>
      </Card>

      {bpId && (
        <Card>
          <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : !events || events.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No events recorded for this customer.</p>
            ) : (
              <div className="space-y-4">
                {events.map((ev) => {
                  const Icon = moduleIcons[ev.source_module] || FileText;
                  return (
                    <div key={ev.id} className="flex gap-4 border-l-2 border-border pl-4 pb-4">
                      <div className="flex-shrink-0 -ml-[26px] mt-1 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{ev.title}</p>
                            {ev.description && <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>}
                          </div>
                          <Badge variant="outline">{ev.source_module}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{format(new Date(ev.occurred_at), "PPp")}</span>
                          {ev.performed_by_name && <span>by {ev.performed_by_name}</span>}
                          {ev.amount !== null && ev.amount !== undefined && (
                            <span className="font-semibold text-foreground">
                              {ev.currency || ""} {Number(ev.amount).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
