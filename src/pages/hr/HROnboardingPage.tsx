import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { useState } from "react";
import { useOnboardingInstances, useOnboardingTasks, useCompleteOnboardingTask } from "@/hooks/useHRLifecycle";

export default function HROnboardingPage() {
  const { data: instances = [] } = useOnboardingInstances();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: tasks = [] } = useOnboardingTasks(selected ?? undefined);
  const complete = useCompleteOnboardingTask();

  return (
    <div className="page-enter p-4 space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" /> Onboarding
      </h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Active Instances ({instances.length})</h2>
          {instances.map((i: any) => {
            const emp = i.employees;
            return (
              <Card key={i.id} className={`cursor-pointer ${selected === i.id ? 'border-primary' : ''}`} onClick={() => setSelected(i.id)}>
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</p>
                  <p className="text-xs text-muted-foreground">{i.hr_onboarding_templates?.template_name ?? "Custom"}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{i.status}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tasks {selected ? `(${tasks.length})` : ""}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {!selected && <p className="text-sm text-muted-foreground p-3">Select an instance</p>}
              {tasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 border rounded p-2">
                  <Checkbox
                    checked={t.status === "completed"}
                    onCheckedChange={() => t.status !== "completed" && complete.mutate({ id: t.id })}
                  />
                  <div className="flex-1">
                    <p className={`text-sm ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.task_title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.responsible_role} · due {t.due_date ?? "—"}
                    </p>
                  </div>
                  {t.status === "completed" && <CheckCircle2 className="h-4 w-4 text-success" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
