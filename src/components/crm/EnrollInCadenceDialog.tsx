import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCadences } from "@/hooks/useCadences";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** lead/business partner id to enroll */
  leadId: string;
  leadName?: string;
}

export const EnrollInCadenceDialog = ({ open, onOpenChange, leadId, leadName }: Props) => {
  const { cadences, enrollLead } = useCadences();
  const [selected, setSelected] = useState<string>("");

  const activeCadences = cadences.filter((c) => c.is_active);

  const handleEnroll = async () => {
    if (!selected) return;
    await enrollLead.mutateAsync({ cadence_id: selected, lead_id: leadId });
    onOpenChange(false);
    setSelected("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll in Follow-up Cadence</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {leadName && (
            <p className="text-sm text-muted-foreground">
              Lead: <span className="font-medium text-foreground">{leadName}</span>
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Cadence</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an active cadence" />
              </SelectTrigger>
              <SelectContent>
                {activeCadences.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    No active cadences. Create one in CRM → Cadences.
                  </div>
                ) : (
                  activeCadences.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleEnroll} disabled={!selected || enrollLead.isPending}>
            {enrollLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enroll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
