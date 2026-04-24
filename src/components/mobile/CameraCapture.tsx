import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Image as ImageIcon, X } from "lucide-react";

interface Props {
  /** Called with each captured image as a data URL. */
  onCapture: (dataUrl: string) => void;
  label?: string;
  /** Max images displayed in the strip preview. */
  maxPreview?: number;
}

/**
 * Camera-based evidence capture. Uses the platform `<input type="file"
 * capture="environment">` which works on every modern mobile browser
 * without permission prompts and falls back to gallery selection on
 * desktop.
 */
export function CameraCapture({ onCapture, label, maxPreview = 4 }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [shots, setShots] = useState<string[]>([]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setShots((prev) => [url, ...prev].slice(0, maxPreview));
      onCapture(url);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <Card className="p-3 space-y-2 border-border/60">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      <Button onClick={() => inputRef.current?.click()} className="w-full gap-2">
        <Camera className="h-4 w-4" /> Capture photo
      </Button>
      {shots.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {shots.map((s, i) => (
            <div key={i} className="relative shrink-0">
              <img src={s} alt="" className="h-16 w-16 object-cover rounded-md border" />
              <button
                onClick={() => setShots((p) => p.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 bg-background rounded-full border p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {shots.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-3 w-3" /> No photos yet
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
