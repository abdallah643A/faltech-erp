import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { BarcodeScanner } from "@/components/mobile/BarcodeScanner";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { ShoppingCart, Plus, Trash2, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";

interface CartLine {
  id: string;
  sku: string;
  name: string;
  price: number;
  qty: number;
}

const TAX_RATE = 0.15;

/**
 * /m/pos — scan-first mobile cashier.
 * Lookup is local-first: if a SKU isn't in the device cache, we add it
 * with a placeholder name + 0 price the cashier can edit on the line.
 * The full sale is queued via the shared offline mutation hook.
 */
export default function MobilePOS() {
  const { enqueue, online } = useOfflineMutation();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [tender, setTender] = useState<"cash" | "card">("card");
  const [cashGiven, setCashGiven] = useState("");

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.price * l.qty, 0),
    [lines],
  );
  const tax = useMemo(() => subtotal * TAX_RATE, [subtotal]);
  const total = subtotal + tax;
  const change = tender === "cash" ? Math.max(0, Number(cashGiven) - total) : 0;

  const onScan = (sku: string) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.sku === sku);
      if (existing) {
        return prev.map((l) =>
          l.id === existing.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        { id: crypto.randomUUID(), sku, name: sku, price: 0, qty: 1 },
      ];
    });
  };

  const patch = (id: string, p: Partial<CartLine>) =>
    setLines((arr) => arr.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const remove = (id: string) => setLines((arr) => arr.filter((l) => l.id !== id));

  const charge = async () => {
    if (lines.length === 0) return toast.error("Cart is empty");
    if (lines.some((l) => l.price <= 0)) return toast.error("Set a price for every line");
    if (tender === "cash" && Number(cashGiven) < total)
      return toast.error("Cash given is below total");

    await enqueue({
      module: "pos",
      entity: "mobile_sync_queue",
      table: "mobile_sync_queue",
      operation: "insert",
      payload: {
        module: "pos",
        entity: "pos_sale",
        operation: "insert",
        payload: {
          lines,
          subtotal,
          tax,
          total,
          tender,
          cash_given: tender === "cash" ? Number(cashGiven) : null,
          change,
          captured_at: new Date().toISOString(),
        },
        status: "pending",
      },
    });

    toast.success(
      online ? `Sale charged · ${total.toFixed(2)}` : "Saved offline · will sync",
    );
    setLines([]); setCashGiven("");
  };

  return (
    <MobileLayout title="POS · Sell" back>
      <BarcodeScanner onScan={onScan} label="Scan item" />

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-1">
            <ShoppingCart className="h-4 w-4" /> Cart
          </p>
          <Badge variant="outline">{lines.length}</Badge>
        </div>
        {lines.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Scan an item to begin.
          </p>
        ) : (
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.id} className="border rounded-md p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={l.name}
                    onChange={(e) => patch(l.id, { name: e.target.value })}
                    className="h-8 text-sm flex-1"
                    placeholder="Item name"
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove(l.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground truncate flex-1">{l.sku}</span>
                  <Input
                    type="number" inputMode="decimal" min={0} step="0.01"
                    value={l.price || ""}
                    onChange={(e) => patch(l.id, { price: Number(e.target.value) })}
                    className="h-8 w-20"
                    placeholder="Price"
                  />
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                    onClick={() => patch(l.id, { qty: Math.max(1, l.qty - 1) })}>
                    −
                  </Button>
                  <span className="w-6 text-center font-semibold">{l.qty}</span>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                    onClick={() => patch(l.id, { qty: l.qty + 1 })}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Tax (15%)</span><span>{tax.toFixed(2)}</span></div>
        <div className="flex justify-between font-semibold text-base border-t pt-1 mt-1">
          <span>Total</span><span>{total.toFixed(2)}</span>
        </div>
      </Card>

      <Card className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant={tender === "card" ? "default" : "outline"} onClick={() => setTender("card")} className="gap-1">
            <CreditCard className="h-4 w-4" /> Card
          </Button>
          <Button variant={tender === "cash" ? "default" : "outline"} onClick={() => setTender("cash")} className="gap-1">
            <Banknote className="h-4 w-4" /> Cash
          </Button>
        </div>
        {tender === "cash" && (
          <div className="space-y-1">
            <Input
              type="number" inputMode="decimal" min={0} step="0.01"
              placeholder="Cash given"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value)}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Change due: <span className="font-semibold text-foreground">{change.toFixed(2)}</span>
            </p>
          </div>
        )}
      </Card>

      <Button className="w-full h-11" onClick={charge} disabled={lines.length === 0}>
        {online ? `Charge ${total.toFixed(2)}` : `Save offline · ${total.toFixed(2)}`}
      </Button>
    </MobileLayout>
  );
}
