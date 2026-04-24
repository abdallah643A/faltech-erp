import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { SyncStatusBadge } from "./SyncStatusBadge";

interface Props {
  title: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
}

/**
 * MobileLayout — minimal chrome for /m/* routes.
 * Compact header with sync status, optional back nav, and a single-column body.
 */
export function MobileLayout({ title, back, right, children }: Props) {
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 px-3 h-12">
          {back ? (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/m" className="p-1">
              <Home className="h-4 w-4" />
            </Link>
          )}
          <h1 className="text-sm font-semibold flex-1 truncate">{title}</h1>
          {right}
          <SyncStatusBadge />
        </div>
      </header>
      <main className="flex-1 p-3 space-y-3">{children}</main>
      <footer className="sticky bottom-0 border-t bg-background/95 backdrop-blur p-2 text-[10px] text-muted-foreground text-center">
        {loc.pathname}
      </footer>
    </div>
  );
}
