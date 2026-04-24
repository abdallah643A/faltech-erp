import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useProjectsList } from '@/hooks/usePMO';

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export function ProjectPicker({ value, onChange, label = 'Project' }: Props) {
  const { data: projects } = useProjectsList();
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="max-w-md"><SelectValue placeholder="Select a project…" /></SelectTrigger>
        <SelectContent>
          {(projects || []).map((p: any) => (
            <SelectItem key={p.id} value={p.id}>{p.project_code ? `[${p.project_code}] ` : ''}{p.project_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PMOPageShell({ title, description, children, projectId, setProjectId, requireProject = true }: {
  title: string; description?: string; children: React.ReactNode;
  projectId: string; setProjectId: (v: string) => void; requireProject?: boolean;
}) {
  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <Card>
        <CardContent className="pt-6">
          <ProjectPicker value={projectId} onChange={setProjectId} />
        </CardContent>
      </Card>
      {requireProject && !projectId ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a project to continue.</CardContent></Card>
      ) : children}
    </div>
  );
}
