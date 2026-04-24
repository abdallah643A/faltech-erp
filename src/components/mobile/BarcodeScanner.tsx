import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Camera, Keyboard, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onScan: (code: string) => void;
  /** optional label shown above the scanner */
  label?: string;
  /** if true, opens the camera immediately on mount */
  autoStart?: boolean;
}

/**
 * Scan-first input: tries the native BarcodeDetector API (Chrome/Android,
 * Samsung Internet). Falls back to a manual keyed input so the workflow
 * never blocks if the camera or API isn't available.
 */
export function BarcodeScanner({ onScan, label, autoStart }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [manual, setManual] = useState("");
  const [supported] = useState<boolean>(
    typeof window !== "undefined" && "BarcodeDetector" in window,
  );

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  const start = async () => {
    if (!supported) {
      toast.message("Camera scanning unavailable", {
        description: "Use the keyed input instead.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      // @ts-expect-error - BarcodeDetector is not in TS lib
      const detector = new window.BarcodeDetector({
        formats: ["code_128", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e", "code_39"],
      });
      const tick = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes?.[0]?.rawValue) {
            const value = codes[0].rawValue as string;
            stop();
            onScan(value);
            return;
          }
        } catch {
          /* ignore single-frame errors */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      toast.error(e?.message ?? "Camera unavailable");
    }
  };

  useEffect(() => {
    if (autoStart) void start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return;
    onScan(v);
    setManual("");
  };

  return (
    <Card className="p-3 space-y-2 border-border/60">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      {active ? (
        <div className="relative rounded-md overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={stop}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button onClick={start} className="w-full gap-2" disabled={!supported}>
          <Camera className="h-4 w-4" />
          {supported ? "Scan barcode" : "Scanner unavailable"}
        </Button>
      )}
      <div className="flex items-center gap-2">
        <Keyboard className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Type or scan with keyboard wedge"
          onKeyDown={(e) => e.key === "Enter" && submitManual()}
          className="h-9"
        />
        <Button size="sm" onClick={submitManual} disabled={!manual.trim()}>
          OK
        </Button>
      </div>
    </Card>
  );
}
