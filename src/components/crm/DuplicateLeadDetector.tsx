import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Merge, Search } from 'lucide-react';
import { Lead } from '@/hooks/useLeads';
import { toast } from '@/hooks/use-toast';

interface DuplicateGroup {
  key: string;
  leads: Lead[];
  reason: string;
}

interface DuplicateLeadDetectorProps {
  leads: Lead[];
  onMerge: (keepId: string, mergeIds: string[]) => void;
}

function similarity(a: string, b: string): number {
  const aLow = a.toLowerCase().trim();
  const bLow = b.toLowerCase().trim();
  if (aLow === bLow) return 1;
  if (aLow.includes(bLow) || bLow.includes(aLow)) return 0.8;
  const aWords = aLow.split(/\s+/);
  const bWords = bLow.split(/\s+/);
  const common = aWords.filter(w => bWords.includes(w)).length;
  return common / Math.max(aWords.length, bWords.length);
}

export function DuplicateLeadDetector({ leads, onMerge }: DuplicateLeadDetectorProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [keepId, setKeepId] = useState<string>('');

  const duplicates = useMemo(() => {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < leads.length; i++) {
      if (processed.has(leads[i].id)) continue;
      const group: Lead[] = [leads[i]];

      for (let j = i + 1; j < leads.length; j++) {
        if (processed.has(leads[j].id)) continue;
        let reason = '';

        // Check email match
        if (leads[i].email && leads[j].email && leads[i].email.toLowerCase() === leads[j].email.toLowerCase()) {
          reason = 'Same email';
        }
        // Check phone match
        else if (leads[i].phone && leads[j].phone && leads[i].phone.replace(/\D/g, '') === leads[j].phone.replace(/\D/g, '')) {
          reason = 'Same phone';
        }
        // Check name similarity
        else if (similarity(leads[i].card_name, leads[j].card_name) >= 0.8) {
          reason = 'Similar name';
        }

        if (reason) {
          group.push(leads[j]);
          processed.add(leads[j].id);
          if (groups.length === 0 || groups[groups.length - 1].key !== leads[i].id) {
            // Will be added below
          }
        }
      }

      if (group.length > 1) {
        processed.add(leads[i].id);
        groups.push({
          key: leads[i].id,
          leads: group,
          reason: leads[i].email ? 'Email/Name match' : 'Name similarity',
        });
      }
    }

    return groups;
  }, [leads]);

  const handleOpenMerge = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setKeepId(group.leads[0].id);
    setShowDialog(true);
  };

  const handleMerge = () => {
    if (!selectedGroup || !keepId) return;
    const mergeIds = selectedGroup.leads.filter(l => l.id !== keepId).map(l => l.id);
    onMerge(keepId, mergeIds);
    setShowDialog(false);
    toast({ title: 'Leads Merged', description: `${mergeIds.length} duplicates merged into primary record.` });
  };

  if (duplicates.length === 0) return null;

  return (
    <>
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Potential Duplicates Found ({duplicates.length} groups)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {duplicates.slice(0, 5).map(group => (
            <div key={group.key} className="flex items-center justify-between p-2 rounded-lg bg-background border">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex -space-x-2">
                  {group.leads.slice(0, 3).map(l => (
                    <div key={l.id} className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background">
                      <span className="text-[9px] font-bold text-primary">{l.card_name.charAt(0)}</span>
                    </div>
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{group.leads.map(l => l.card_name).join(' / ')}</p>
                  <p className="text-[10px] text-muted-foreground">{group.reason} • {group.leads.length} records</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" onClick={() => handleOpenMerge(group)}>
                <Merge className="h-3 w-3" /> Review
              </Button>
            </div>
          ))}
          {duplicates.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">+{duplicates.length - 5} more groups</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Merge className="h-5 w-5" /> Merge Duplicates</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select the primary record to keep. Other records will be merged into it.</p>
              {selectedGroup.leads.map(lead => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${keepId === lead.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setKeepId(lead.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={keepId === lead.id} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{lead.card_name}</p>
                      <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span>{lead.email || 'No email'}</span>
                        <span>{lead.phone || 'No phone'}</span>
                        <span>Code: {lead.card_code}</span>
                      </div>
                    </div>
                    {keepId === lead.id && <Badge className="text-[10px]">Primary</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleMerge} className="gap-1"><Merge className="h-4 w-4" /> Merge Records</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
