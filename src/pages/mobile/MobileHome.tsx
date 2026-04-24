import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import {
  Package, HardHat, ShoppingCart, Landmark, Wrench, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Tile {
  to: string;
  label: string;
  hint: string;
  icon: any;
  color: string;
  /** future: gate by role; in PR1 every tile is visible. */
  roles?: string[];
}

const TILES: Tile[] = [
  { to: "/m/wms", label: "Warehouse", hint: "Pick · put-away · cycle count", icon: Package, color: "hsl(var(--primary))" },
  { to: "/m/cpms", label: "Site Ops", hint: "Daily reports · QA/QC", icon: HardHat, color: "#f59e0b" },
  { to: "/m/pos", label: "POS", hint: "Sell · refunds · shifts", icon: ShoppingCart, color: "#10b981" },
  { to: "/m/banking", label: "Banking", hint: "Approvals · captures", icon: Landmark, color: "#3b82f6" },
  { to: "/m/field", label: "Field Ops", hint: "Visits · service tasks", icon: Wrench, color: "#8b5cf6" },
];

/**
 * /m — role-tailored mobile dashboard.
 * Big-tap tiles, large text, scan-first entries on each module page.
 */
export default function MobileHome() {
  const { user } = useAuth();
  return (
    <MobileLayout title="Mobile">
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="text-sm font-medium truncate">{user?.email ?? "Guest"}</p>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="p-3 h-full active:scale-[0.98] transition-transform">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center mb-2"
                style={{ backgroundColor: `${t.color}20`, color: t.color }}
              >
                <t.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t.label}</p>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t.hint}</p>
            </Card>
          </Link>
        ))}
      </div>
    </MobileLayout>
  );
}
