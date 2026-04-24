import { MobileLayout } from "@/components/mobile/MobileLayout";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface Props { title: string }
export function MobileComingSoon({ title }: Props) {
  return (
    <MobileLayout title={title} back>
      <Card className="p-6 text-center space-y-2">
        <Construction className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm font-semibold">Shipping in PR2 / PR3</p>
        <p className="text-xs text-muted-foreground">
          The shared offline core is live. This module's mobile screens are scheduled
          for the next phase and will plug into the same sync engine.
        </p>
      </Card>
    </MobileLayout>
  );
}
