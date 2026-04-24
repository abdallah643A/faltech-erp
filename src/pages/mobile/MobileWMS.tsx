import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { BarcodeScanner } from "@/components/mobile/BarcodeScanner";
import { CameraCapture } from "@/components/mobile/CameraCapture";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Line {
  id: string;
  barcode: string;
  qty: number;
  photo?: string;
}

/**
 * /m/wms — scan-first warehouse pilot.
 * Demonstrates the unified offline framework end-to-end:
 *   - barcode scan → line added (works offline)
 *   - camera capture → photo evidence attached to receipt
 *   - "Save receipt" → useOfflineMutation enqueues into shared queue
 */
export default function MobileWMS() {
  const [lines, setLines] = useState<Line[]>([]);
  const [photo, setPhoto] = useState<string | undefined>();
  const { enqueue, online } = useOfflineMutation();

  const onScan = (code: string) => {
    setLines((prev) => {
      const found = prev.find((l) => l.barcode === code);
      if (found) {
        return prev.map((l) => (l.id === found.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        { id: crypto.randomUUID(), barcode: code, qty: 1 },
      ];
    });
    toast.success(`Scanned ${code}`);
  };

  const removeLine = (id: string) =>
    setLines((p) => p.filter((l) => l.id !== id));
  const inc = (id: string) =>
    setLines((p) => p.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)));
  const dec = (id: string) =>
    setLines((p) =>
      p.map((l) => (l.id === id ? { ...l, qty: Math.max(1, l.qty - 1) } : l)),
    );

  const save = async () => {
    if (lines.length === 0) {
      toast.error("Scan at least one item");
      return;
    }
    // The shared queue is module/entity-aware. The actual write target
    // (e.g. inventory_receipts) is supplied per call. For this pilot we
    // record the operation in `mobile_sync_queue` itself so it's visible
    // even before an `inventory_receipts` row exists.
    await enqueue({
      module: "wms",
      entity: "mobile_sync_queue",
      table: "mobile_sync_queue",
      operation: "insert",
      payload: {
        module: "wms",
        entity: "receipt_draft",
        operation: "insert",
        payload: { lines, photo, captured_at: new Date().toISOString() },
        status: "pending",
      },
    });
    setLines([]);
    setPhoto(undefined);
  };

  return (
    <MobileLayout title="Warehouse · Receive" back>
      <BarcodeScanner onScan={onScan} label="Scan item barcode" />

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-1">
            <Package className="h-4 w-4" /> Lines
          </p>
          <Badge variant="outline">{lines.length}</Badge>
        </div>
        {lines.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Scan an item or type its barcode to start.
          </p>
        ) : (
          <div className="space-y-1">
            {lines.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 p-2 rounded-md border"
              >
                <p className="flex-1 text-sm font-mono truncate">{l.barcode}</p>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => dec(l.id)}>
                  −
                </Button>
                <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => inc(l.id)}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeLine(l.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CameraCapture
        label="Photo evidence (optional)"
        onCapture={setPhoto}
      />

      <Button className="w-full h-11" onClick={save} disabled={lines.length === 0}>
        {online ? "Save receipt" : "Save offline"}
      </Button>
    </MobileLayout>
  );
}
