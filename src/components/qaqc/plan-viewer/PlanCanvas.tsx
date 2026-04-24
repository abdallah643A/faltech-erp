import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, Maximize2, LocateFixed, MapPin, X, Check } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS } from './types';
import type { QATicket, QAPlan, QAPlanRevision } from './types';

interface Props {
  plan: QAPlan | null;
  revision: QAPlanRevision | null;
  tickets: QATicket[];
  pendingPin: { x: number; y: number } | null;
  selectedTicketId: string | null;
  onPlanClick: (x: number, y: number) => void;
  onPinClick: (ticket: QATicket) => void;
  onCancelPin: () => void;
}

export function PlanCanvas({ plan, revision, tickets, pendingPin, selectedTicketId, onPlanClick, onPinClick, onCancelPin }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredTicketId, setHoveredTicketId] = useState<string | null>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.25, Math.min(4, z + delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isPanning) return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      onPlanClick(Math.round(x * 100) / 100, Math.round(y * 100) / 100);
    }
  };

  const fitToScreen = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  if (!plan) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select a project and plan to get started</p>
        </div>
      </div>
    );
  }

  const isImage = revision?.mime_type?.startsWith('image');

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1 bg-background/90 backdrop-blur border rounded-lg shadow-md p-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(4, z + 0.25))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-[10px] text-center font-mono">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToScreen}>
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
          <LocateFixed className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-muted/20 select-none"
        style={{ cursor: isPanning ? 'grabbing' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center' }}
        >
          <div
            ref={canvasRef}
            className="relative bg-white dark:bg-slate-900 border shadow-sm"
            style={{ width: '900px', height: '600px' }}
            onClick={handleCanvasClick}
          >
            {/* Plan image or placeholder */}
            {revision && isImage ? (
              <img src={revision.file_url} alt={plan.plan_title} className="absolute inset-0 w-full h-full object-contain" />
            ) : (
              <div className="absolute inset-0">
                {/* Grid background */}
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-6 opacity-30">
                  {Array.from({ length: 60 }).map((_, i) => <div key={i} className="border border-muted-foreground/10" />)}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                    <p className="text-sm text-muted-foreground/40 mt-2">{plan.plan_title}</p>
                    <p className="text-xs text-muted-foreground/25">
                      {[plan.building, plan.floor, plan.drawing_number].filter(Boolean).join(' • ')}
                    </p>
                    {!revision && <p className="text-xs text-muted-foreground/30 mt-2">Upload a plan image to see it here</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Ticket pins */}
            {tickets.map(ticket => {
              const color = STATUS_COLORS[ticket.status] || '#3b82f6';
              const isSelected = ticket.id === selectedTicketId;
              const isHovered = ticket.id === hoveredTicketId;
              return (
                <div
                  key={ticket.id}
                  className="absolute z-10 group"
                  style={{ left: `${ticket.pin_x}%`, top: `${ticket.pin_y}%`, transform: 'translate(-50%, -100%)' }}
                  onMouseEnter={() => setHoveredTicketId(ticket.id)}
                  onMouseLeave={() => setHoveredTicketId(null)}
                  onClick={(e) => { e.stopPropagation(); onPinClick(ticket); }}
                >
                  <div className={`relative cursor-pointer transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}`}>
                    <MapPin
                      className="h-7 w-7 drop-shadow-md"
                      style={{ color, filter: isSelected ? `drop-shadow(0 0 4px ${color})` : undefined }}
                    />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-white animate-pulse" />
                    )}
                  </div>
                  {/* Tooltip */}
                  {(isHovered || isSelected) && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover border rounded-lg shadow-lg p-2.5 w-[200px] z-20 pointer-events-none">
                      <p className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_number}</p>
                      <p className="text-xs font-medium leading-tight mt-0.5 line-clamp-2">{ticket.title}</p>
                      <div className="flex gap-1 mt-1.5">
                        <Badge className="text-[9px] px-1 py-0" style={{ backgroundColor: color + '20', color }}>{ticket.status.replace('_', ' ')}</Badge>
                        <Badge className="text-[9px] px-1 py-0" style={{ backgroundColor: (PRIORITY_COLORS[ticket.priority] || '#666') + '20', color: PRIORITY_COLORS[ticket.priority] || '#666' }}>{ticket.priority}</Badge>
                      </div>
                      {ticket.assignee_name && <p className="text-[10px] text-muted-foreground mt-1">{ticket.assignee_name}</p>}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pending pin (being placed) */}
            {pendingPin && (
              <div
                className="absolute z-20"
                style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%`, transform: 'translate(-50%, -100%)' }}
              >
                <MapPin className="h-8 w-8 text-red-500 drop-shadow-lg animate-bounce" />
                <div className="flex items-center gap-1 mt-1 -ml-2">
                  <button
                    className="w-7 h-7 rounded-full border-2 border-red-500 bg-background flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    onClick={(e) => { e.stopPropagation(); onCancelPin(); }}
                  >
                    <X className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
