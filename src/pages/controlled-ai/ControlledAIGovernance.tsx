import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, LockKeyhole, FileCheck2 } from 'lucide-react';
import { CONTROLLED_AI_CAPABILITIES, CONTROLLED_AI_MODULES, useControlledAI } from '@/hooks/useControlledAI';

export default function ControlledAIGovernance() {
  const { permissions } = useControlledAI();

  return (
    <div className="space-y-6">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Shield className="h-6 w-6 text-primary" />AI Governance</h1><p className="text-sm text-muted-foreground">Role-aware permissions, explainability requirements, and review controls for controlled AI.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        <PolicyCard icon={LockKeyhole} title="Permission-aware" body="Every capability is scoped by module, role, and action permission." />
        <PolicyCard icon={FileCheck2} title="Explainable" body="Recommendations store rationale, evidence, confidence, risk, and draft payloads." />
        <PolicyCard icon={Shield} title="Reviewable" body="AI can create drafts, but approval is required before execution or transaction impact." />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Capability matrix</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Capabilities</TableHead><TableHead>Default control</TableHead><TableHead>Configured roles</TableHead></TableRow></TableHeader>
            <TableBody>{CONTROLLED_AI_MODULES.map((m) => {
              const roles = (permissions.data ?? []).filter((p: any) => p.module === m.value).map((p: any) => p.role);
              return <TableRow key={m.value}><TableCell className="font-medium">{m.label}</TableCell><TableCell><div className="flex flex-wrap gap-1">{CONTROLLED_AI_CAPABILITIES.map((c) => <Badge key={c.value} variant="outline">{c.label}</Badge>)}</div></TableCell><TableCell><Badge variant="secondary">Single approval</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{Array.from(new Set(roles)).join(', ') || 'Admin-configurable'}</TableCell></TableRow>;
            })}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PolicyCard({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return <Card><CardContent className="flex gap-3 p-4"><Icon className="h-5 w-5 text-primary" /><div><div className="font-semibold">{title}</div><p className="text-sm text-muted-foreground">{body}</p></div></CardContent></Card>;
}
