import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { CameraCapture } from "@/components/mobile/CameraCapture";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { Landmark, CheckCircle2, XCircle, FileImage } from "lucide-react";
import { toast } from "sonner";

interface PendingApproval {
  id: string;
  reference: string;
  beneficiary: string;
  amount: number;
  currency: string;
  type: "wire" | "cheque" | "internal";
  requested_at: string;
}

// Demo seeds — in PR4 these load from a server endpoint cached in IndexedDB.
const SEED: PendingApproval[] = [
  { id: "p1", reference: "PV-2026-0481", beneficiary: "Acme Materials Co.", amount: 24800, currency: "SAR", type: "wire", requested_at: "2026-04-19T08:14:00Z" },
  { id: "p2", reference: "PV-2026-0482", beneficiary: "Al-Rajhi Subcontracting", amount: 9120, currency: "SAR", type: "cheque", requested_at: "2026-04-19T09:02:00Z" },
  { id: "p3", reference: "TRX-2026-0117", beneficiary: "Site 14 Petty Cash", amount: 3500, currency: "SAR", type: "internal", requested_at: "2026-04-19T10:30:00Z" },
];

/**
 * /m/banking — on-the-go approvals + cheque/voucher capture.
 * Approvals are queued through the shared offline framework with LWW;
 * if two approvers act offline, the last sync wins and the conflict is
 * logged for audit (see mobile_sync_conflicts).
 */
export default function MobileBanking() {
  const { enqueue, online } = useOfflineMutation();
  const [pending, setPending] = useState<PendingApproval[]>(SEED);
  const [active, setActive] = useState<PendingApproval | null>(null);
  const [reason, setReason] = useState("");
  const [chequePhoto, setChequePhoto] = useState<string | undefined>();

  const decide = async (decision: "approved" | "rejected") => {
    if (!active) return;
    if (decision === "rejected" && !reason.trim())
      return toast.error("Add a reason to reject");

    await enqueue({
      module: "banking",
      entity: "mobile_sync_queue",
      table: "mobile_sync_queue",
      operation: "insert",
      payload: {
        module: "banking",
        entity: "payment_approval",
        operation: "insert",
        payload: {
          approval_target_id: active.id,
          reference: active.reference,
          beneficiary: active.beneficiary,
          amount: active.amount,
          currency: active.currency,
          type: active.type,
          decision,
          reason: reason || null,
          cheque_photo: chequePhoto ?? null,
          decided_at: new Date().toISOString(),
        },
        status: "pending",
      },
    });

    setPending((p) => p.filter((x) => x.id !== active.id));
    setActive(null);
    setReason("");
    setChequePhoto(undefined);
    toast.success(
      online
        ? `${decision === "approved" ? "Approved" : "Rejected"} ${active.reference}`
        : `Queued offline · ${active.reference}`,
    );
  };

  return (
    <MobileLayout title="Banking · Approvals" back>
      {!active ? (
        <>
          <Card className="p-3 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold flex-1">Pending approvals</p>
            <Badge variant="outline">{pending.length}</Badge>
          </Card>

          {pending.length === 0 ? (
            <Card className="p-6 text-center text-xs text-muted-foreground">
              All caught up. Pull to refresh when new requests arrive.
            </Card>
          ) : (
            <div className="space-y-2">
              {pending.map((p) => (
                <Card
                  key={p.id}
                  className="p-3 active:scale-[0.99] transition-transform cursor-pointer"
                  onClick={() => setActive(p)}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{p.reference}</p>
                    <Badge variant="secondary" className="text-[10px] uppercase">{p.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.beneficiary}</p>
                  <p className="text-base font-semibold mt-1">
                    {p.amount.toLocaleString()} <span className="text-xs text-muted-foreground">{p.currency}</span>
                  </p>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Card className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{active.reference}</p>
              <Badge variant="secondary" className="text-[10px] uppercase">{active.type}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{active.beneficiary}</p>
            <p className="text-xl font-semibold">
              {active.amount.toLocaleString()} <span className="text-sm text-muted-foreground">{active.currency}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Requested {new Date(active.requested_at).toLocaleString()}
            </p>
          </Card>

          {active.type === "cheque" && (
            <CameraCapture
              label={
                <span className="inline-flex items-center gap-1">
                  <FileImage className="h-3 w-3" /> Cheque photo (required)
                </span> as unknown as string
              }
              onCapture={setChequePhoto}
            />
          )}

          <Card className="p-3 space-y-2">
            <Label className="text-xs">Reason / note</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Required for rejections"
            />
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 gap-1"
              onClick={() => decide("rejected")}
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
            <Button
              className="h-11 gap-1"
              onClick={() => decide("approved")}
              disabled={active.type === "cheque" && !chequePhoto}
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => { setActive(null); setReason(""); setChequePhoto(undefined); }}>
            Back to list
          </Button>
        </>
      )}
    </MobileLayout>
  );
}
