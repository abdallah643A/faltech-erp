import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eraser, PenLine } from "lucide-react";

interface Props {
  onChange: (dataUrl: string | null) => void;
  label?: string;
  height?: number;
}

/**
 * Lightweight signature pad — pointer events on a canvas.
 * Emits a PNG data URL on every stroke end so the parent can persist it
 * via the offline mutation hook just like a photo.
 */
export function SignaturePad({ onChange, label, height = 140 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = height * ratio;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [height]);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange(canvasRef.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <Card className="p-3 space-y-2 border-border/60">
      {label && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <PenLine className="h-3 w-3" /> {label}
          </p>
          <Button size="sm" variant="ghost" onClick={clear} disabled={empty} className="h-7 gap-1">
            <Eraser className="h-3 w-3" /> Clear
          </Button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: "none" }}
        className="w-full border rounded-md bg-background"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
    </Card>
  );
}
