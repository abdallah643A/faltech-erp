import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Plus } from 'lucide-react';
import { useDunningPolicies } from '@/hooks/useQuoteToCash';

const DEFAULT_STAGES = [
  { stage: 1, name: 'Friendly Reminder', days_after_due: 7, language: 'ar', tone: 'polite' },
  { stage: 2, name: 'Second Notice', days_after_due: 21, language: 'ar', tone: 'firm' },
  { stage: 3, name: 'Final Demand', days_after_due: 45, language: 'ar', tone: 'strict' },
  { stage: 4, name: 'Legal Action', days_after_due: 60, language: 'ar', tone: 'legal' },
];

export default function DunningPolicyManager() {
  const { policies, isLoading, createPolicy } = useDunningPolicies();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ policy_name: '', description: '', language: 'ar', stages: DEFAULT_STAGES });

  const handleCreate = async () => {
    await createPolicy.mutateAsync(form);
    setOpen(false);
    setForm({ policy_name: '', description: '', language: 'ar', stages: DEFAULT_STAGES });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6 text-primary" /> Dunning Policies</h1>
          <p className="text-sm text-muted-foreground">Multi-stage automated collection letters (Arabic + English)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Policy</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Dunning Policy</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Policy Name</Label><Input value={form.policy_name} onChange={(e) => setForm({ ...form, policy_name: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">Default stages: 7d → 21d → 45d → 60d</div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && <p className="text-muted-foreground">Loading...</p>}
        {!isLoading && policies.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No policies yet</CardContent></Card>}
        {policies.map((p: any) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.policy_name}</CardTitle>
                <Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(p.stages || []).map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border-l-2 border-primary pl-3 py-1">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.tone} tone · {s.language === 'ar' ? 'Arabic' : 'English'}</p>
                    </div>
                    <Badge variant="outline">+{s.days_after_due}d</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
