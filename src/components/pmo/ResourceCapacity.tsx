import { useState } from 'react';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Users, AlertTriangle } from 'lucide-react';

export function ResourceCapacity() {
  const { resources, allocations, createResource, createAllocation } = usePMOPortfolio();
  const { projects = [] } = useProjects();
  const [isResourceOpen, setIsResourceOpen] = useState(false);
  const [isAllocOpen, setIsAllocOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState({ name: '', email: '', resource_type: 'internal', department: '', skill_category: 'it', hourly_rate: 0, available_hours_per_week: 40 });
  const [allocForm, setAllocForm] = useState({ resource_id: '', project_id: '', role_in_project: '', allocated_hours_per_week: 8 });

  // Calculate utilization per resource
  const resourceUtilization = resources.map(r => {
    const totalAllocated = allocations.filter(a => a.resource_id === r.id && a.status === 'active').reduce((s, a) => s + (a.allocated_hours_per_week || 0), 0);
    const utilization = r.available_hours_per_week > 0 ? Math.round((totalAllocated / r.available_hours_per_week) * 100) : 0;
    const isOverAllocated = utilization > 100;
    return { ...r, totalAllocated, utilization, isOverAllocated };
  });

  const overAllocatedCount = resourceUtilization.filter(r => r.isOverAllocated).length;
  const avgUtilization = resourceUtilization.length > 0 ? Math.round(resourceUtilization.reduce((s, r) => s + r.utilization, 0) / resourceUtilization.length) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Resource Management</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsAllocOpen(true)}>Allocate Resource</Button>
          <Button size="sm" onClick={() => setIsResourceOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Resource</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total Resources</p>
          <p className="text-2xl font-bold">{resources.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Avg Utilization</p>
          <p className="text-2xl font-bold">{avgUtilization}%</p>
          <Progress value={Math.min(avgUtilization, 100)} className="h-1.5 mt-1" />
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">{overAllocatedCount > 0 && <AlertTriangle className="h-3 w-3 text-destructive" />}Over-Allocated</p>
          <p className="text-2xl font-bold text-destructive">{overAllocatedCount}</p>
        </CardContent></Card>
      </div>

      {/* Resource Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resourceUtilization.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No resources added</TableCell></TableRow>
              ) : resourceUtilization.map(r => (
                <TableRow key={r.id} className={r.isOverAllocated ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline">{r.resource_type}</Badge></TableCell>
                  <TableCell className="text-sm">{r.department || '—'}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{r.skill_category}</Badge></TableCell>
                  <TableCell>{r.available_hours_per_week}h/w</TableCell>
                  <TableCell>{r.totalAllocated}h/w</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(r.utilization, 100)} className="h-2 w-16" />
                      <span className={`text-sm font-medium ${r.isOverAllocated ? 'text-destructive' : ''}`}>{r.utilization}%</span>
                      {r.isOverAllocated && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Resource Dialog */}
      <Dialog open={isResourceOpen} onOpenChange={setIsResourceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Resource</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={resourceForm.name} onChange={e => setResourceForm({...resourceForm, name: e.target.value})} /></div>
            <div><Label>Email</Label><Input value={resourceForm.email} onChange={e => setResourceForm({...resourceForm, email: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={resourceForm.resource_type} onValueChange={v => setResourceForm({...resourceForm, resource_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Skill Category</Label>
                <Select value={resourceForm.skill_category} onValueChange={v => setResourceForm({...resourceForm, skill_category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Department</Label><Input value={resourceForm.department} onChange={e => setResourceForm({...resourceForm, department: e.target.value})} /></div>
            <div><Label>Available Hours/Week</Label><Input type="number" value={resourceForm.available_hours_per_week} onChange={e => setResourceForm({...resourceForm, available_hours_per_week: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResourceOpen(false)}>Cancel</Button>
            <Button onClick={() => { createResource.mutate(resourceForm as any); setIsResourceOpen(false); }} disabled={!resourceForm.name}>Add Resource</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocate Resource Dialog */}
      <Dialog open={isAllocOpen} onOpenChange={setIsAllocOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Allocate Resource to Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Resource *</Label>
              <Select value={allocForm.resource_id} onValueChange={v => setAllocForm({...allocForm, resource_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                <SelectContent>{resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Project *</Label>
              <Select value={allocForm.project_id} onValueChange={v => setAllocForm({...allocForm, project_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Role</Label><Input value={allocForm.role_in_project} onChange={e => setAllocForm({...allocForm, role_in_project: e.target.value})} /></div>
            <div><Label>Hours/Week</Label><Input type="number" value={allocForm.allocated_hours_per_week} onChange={e => setAllocForm({...allocForm, allocated_hours_per_week: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAllocOpen(false)}>Cancel</Button>
            <Button onClick={() => { createAllocation.mutate(allocForm as any); setIsAllocOpen(false); }} disabled={!allocForm.resource_id || !allocForm.project_id}>Allocate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
