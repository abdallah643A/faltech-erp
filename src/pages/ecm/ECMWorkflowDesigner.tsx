import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitBranch, Plus, Play, Save, Copy, Trash2, Settings, ArrowRight,
  Circle, Square, Diamond, Timer, Bell, User, CheckCircle, XCircle,
  ArrowDown, GripVertical, Zap, Clock, AlertTriangle, FileText
} from "lucide-react";
import { toast } from "sonner";

interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'user_task' | 'approval' | 'condition' | 'parallel' | 'timer' | 'notification' | 'system_action';
  label: string;
  config: Record<string, any>;
  x: number;
  y: number;
}

interface WorkflowConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

const NODE_TYPES = [
  { type: 'start', label: 'Start', icon: Circle, color: 'bg-green-500' },
  { type: 'end', label: 'End', icon: Square, color: 'bg-red-500' },
  { type: 'user_task', label: 'User Task', icon: User, color: 'bg-blue-500' },
  { type: 'approval', label: 'Approval', icon: CheckCircle, color: 'bg-amber-500' },
  { type: 'condition', label: 'Condition', icon: Diamond, color: 'bg-purple-500' },
  { type: 'parallel', label: 'Parallel Split', icon: GitBranch, color: 'bg-indigo-500' },
  { type: 'timer', label: 'Timer', icon: Timer, color: 'bg-orange-500' },
  { type: 'notification', label: 'Notification', icon: Bell, color: 'bg-cyan-500' },
  { type: 'system_action', label: 'System Action', icon: Zap, color: 'bg-gray-500' },
] as const;

const TEMPLATES = [
  { name: 'Invoice Approval', steps: 3, description: 'Submit → Manager Review → CFO Approval' },
  { name: 'Contract Review', steps: 4, description: 'Draft → Legal Review → Manager → Director' },
  { name: 'Leave Request', steps: 2, description: 'Submit → Manager Approval' },
  { name: 'Purchase Order', steps: 3, description: 'Request → Budget Check → Manager Approval' },
  { name: 'New Employee Onboarding', steps: 5, description: 'HR Setup → IT Setup → Training → Manager → Complete' },
  { name: 'Document Review & Publish', steps: 3, description: 'Review → Approve → Publish' },
  { name: 'Vendor Registration', steps: 4, description: 'Submit → Compliance → Finance → Approval' },
  { name: 'Budget Request', steps: 3, description: 'Submit → Department Head → CFO' },
];

const ECMWorkflowDesigner = () => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: '1', type: 'start', label: 'Start', config: {}, x: 400, y: 50 },
    { id: '2', type: 'user_task', label: 'Submit Document', config: { assignee: 'Creator', form: 'Document Submission' }, x: 400, y: 150 },
    { id: '3', type: 'approval', label: 'Manager Review', config: { approver: 'Department Manager', sla: 24 }, x: 400, y: 250 },
    { id: '4', type: 'condition', label: 'Amount Check', config: { field: 'amount', operator: '>', value: '50000' }, x: 400, y: 350 },
    { id: '5', type: 'approval', label: 'CFO Approval', config: { approver: 'CFO', sla: 48 }, x: 250, y: 450 },
    { id: '6', type: 'notification', label: 'Notify Requester', config: { template: 'approval_complete' }, x: 400, y: 550 },
    { id: '7', type: 'end', label: 'End', config: {}, x: 400, y: 650 },
  ]);

  const [connections] = useState<WorkflowConnection[]>([
    { id: 'c1', from: '1', to: '2' },
    { id: 'c2', from: '2', to: '3' },
    { id: 'c3', from: '3', to: '4' },
    { id: 'c4', from: '4', to: '5', label: 'Yes (>50K)' },
    { id: 'c5', from: '4', to: '6', label: 'No' },
    { id: 'c6', from: '5', to: '6' },
    { id: 'c7', from: '6', to: '7' },
  ]);

  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState('Invoice Approval Workflow');
  const [activeTab, setActiveTab] = useState('designer');

  const addNode = (type: string) => {
    const nodeType = NODE_TYPES.find(n => n.type === type);
    if (!nodeType) return;
    const newNode: WorkflowNode = {
      id: Date.now().toString(),
      type: type as WorkflowNode['type'],
      label: nodeType.label,
      config: {},
      x: 400,
      y: (nodes.length + 1) * 100,
    };
    setNodes([...nodes, newNode]);
    toast.success(`${nodeType.label} node added`);
  };

  const deleteNode = (id: string) => {
    if (['start', 'end'].includes(nodes.find(n => n.id === id)?.type || '')) {
      toast.error("Cannot delete Start/End nodes");
      return;
    }
    setNodes(nodes.filter(n => n.id !== id));
    setSelectedNode(null);
    toast.success("Node removed");
  };

  const getNodeIcon = (type: string) => {
    const nt = NODE_TYPES.find(n => n.type === type);
    return nt ? nt.icon : Circle;
  };

  const getNodeColor = (type: string) => {
    const nt = NODE_TYPES.find(n => n.type === type);
    return nt ? nt.color : 'bg-gray-500';
  };

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-[#0066cc]" />
          <div>
            <Input
              value={workflowName}
              onChange={e => setWorkflowName(e.target.value)}
              className="text-lg font-bold border-none p-0 h-auto bg-transparent"
            />
            <p className="text-xs text-muted-foreground">Workflow Designer — Drag & configure nodes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Draft</Badge>
          <Button variant="outline" size="sm"><Copy className="h-4 w-4 mr-1" /> Clone</Button>
          <Button variant="outline" size="sm"><Save className="h-4 w-4 mr-1" /> Save</Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700"><Play className="h-4 w-4 mr-1" /> Publish</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="designer">Visual Designer</TabsTrigger>
          <TabsTrigger value="templates">Templates Library</TabsTrigger>
          <TabsTrigger value="running">Running Processes</TabsTrigger>
          <TabsTrigger value="rules">Business Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="designer" className="flex-1 flex gap-0 m-0 p-0">
          {/* Node Palette */}
          <div className="w-56 border-r bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Node Types</p>
            {NODE_TYPES.map(nt => (
              <button
                key={nt.type}
                onClick={() => addNode(nt.type)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-sm transition-colors text-left"
              >
                <div className={`p-1.5 rounded ${nt.color} text-white`}>
                  <nt.icon className="h-3.5 w-3.5" />
                </div>
                <span>{nt.label}</span>
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-[#f8f9fb] overflow-auto">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: 800 }}>
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {connections.map(conn => {
                const from = nodes.find(n => n.id === conn.from);
                const to = nodes.find(n => n.id === conn.to);
                if (!from || !to) return null;
                const midY = (from.y + 40 + to.y) / 2;
                return (
                  <g key={conn.id}>
                    <path
                      d={`M ${from.x} ${from.y + 40} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                    {conn.label && (
                      <text
                        x={(from.x + to.x) / 2 + 10}
                        y={midY}
                        fontSize="11"
                        fill="#64748b"
                        textAnchor="start"
                      >
                        {conn.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {nodes.map(node => {
              const Icon = getNodeIcon(node.type);
              const color = getNodeColor(node.type);
              return (
                <div
                  key={node.id}
                  className={`absolute cursor-pointer transition-all ${selectedNode?.id === node.id ? 'ring-2 ring-[#0066cc] ring-offset-2' : ''}`}
                  style={{ left: node.x - 80, top: node.y, width: 160 }}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="bg-background border rounded-lg shadow-sm p-3 flex items-center gap-2 hover:shadow-md">
                    <div className={`p-1.5 rounded ${color} text-white flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{node.label}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{node.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Properties Panel */}
          <div className="w-72 border-l bg-background p-4 overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Node Properties</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteNode(selectedNode.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Node Label</Label>
                    <Input
                      value={selectedNode.label}
                      onChange={e => {
                        setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n));
                        setSelectedNode({ ...selectedNode, label: e.target.value });
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Input value={selectedNode.type.replace('_', ' ')} disabled className="h-8 text-sm capitalize" />
                  </div>

                  {selectedNode.type === 'approval' && (
                    <>
                      <div>
                        <Label className="text-xs">Approver</Label>
                        <Select defaultValue={selectedNode.config.approver || ''}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select approver" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Department Manager">Department Manager</SelectItem>
                            <SelectItem value="CFO">CFO</SelectItem>
                            <SelectItem value="CEO">CEO</SelectItem>
                            <SelectItem value="HR Manager">HR Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">SLA (hours)</Label>
                        <Input type="number" defaultValue={selectedNode.config.sla || 24} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Actions</Label>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-green-700">Approve</Badge>
                          <Badge variant="outline" className="text-red-700">Reject</Badge>
                          <Badge variant="outline" className="text-amber-700">Delegate</Badge>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedNode.type === 'condition' && (
                    <>
                      <div>
                        <Label className="text-xs">Field</Label>
                        <Input defaultValue={selectedNode.config.field || ''} className="h-8 text-sm" placeholder="e.g. amount" />
                      </div>
                      <div>
                        <Label className="text-xs">Operator</Label>
                        <Select defaultValue={selectedNode.config.operator || '>'}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="=">Equals (=)</SelectItem>
                            <SelectItem value=">">Greater Than (&gt;)</SelectItem>
                            <SelectItem value="<">Less Than (&lt;)</SelectItem>
                            <SelectItem value=">=">Greater or Equal (≥)</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Value</Label>
                        <Input defaultValue={selectedNode.config.value || ''} className="h-8 text-sm" placeholder="e.g. 50000" />
                      </div>
                    </>
                  )}

                  {selectedNode.type === 'user_task' && (
                    <>
                      <div>
                        <Label className="text-xs">Assigned To</Label>
                        <Select defaultValue="creator">
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="creator">Document Creator</SelectItem>
                            <SelectItem value="specific">Specific User</SelectItem>
                            <SelectItem value="role">By Role</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Form</Label>
                        <Input defaultValue={selectedNode.config.form || ''} className="h-8 text-sm" placeholder="Form to fill" />
                      </div>
                    </>
                  )}

                  {selectedNode.type === 'timer' && (
                    <div>
                      <Label className="text-xs">Wait Duration (hours)</Label>
                      <Input type="number" defaultValue={24} className="h-8 text-sm" />
                    </div>
                  )}

                  {selectedNode.type === 'notification' && (
                    <>
                      <div>
                        <Label className="text-xs">Template</Label>
                        <Select defaultValue="approval_complete">
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approval_complete">Approval Complete</SelectItem>
                            <SelectItem value="task_assigned">Task Assigned</SelectItem>
                            <SelectItem value="rejection_notice">Rejection Notice</SelectItem>
                            <SelectItem value="escalation">Escalation Alert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Channels</Label>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline">In-App</Badge>
                          <Badge variant="outline">Email</Badge>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a node to configure</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map((tpl, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{tpl.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">{tpl.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{tpl.steps} Steps</Badge>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Copy className="h-3 w-3 mr-1" /> Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="running" className="flex-1 p-4">
          <div className="space-y-3">
            {[
              { id: 'P-001', name: 'Invoice #INV-2025-0042', workflow: 'Invoice Approval', step: 'CFO Approval', status: 'in_progress', started: '2025-06-01', sla: 'green' },
              { id: 'P-002', name: 'Contract #CTR-2025-0015', workflow: 'Contract Review', step: 'Legal Review', status: 'in_progress', started: '2025-05-30', sla: 'yellow' },
              { id: 'P-003', name: 'Leave Request - Ahmed', workflow: 'Leave Request', step: 'Manager Approval', status: 'overdue', started: '2025-05-28', sla: 'red' },
              { id: 'P-004', name: 'PO #PO-2025-0088', workflow: 'Purchase Order', step: 'Completed', status: 'completed', started: '2025-05-25', sla: 'green' },
              { id: 'P-005', name: 'Vendor Reg - ABC Corp', workflow: 'Vendor Registration', step: 'Finance Review', status: 'in_progress', started: '2025-06-02', sla: 'green' },
            ].map(proc => (
              <Card key={proc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${proc.sla === 'green' ? 'bg-green-500' : proc.sla === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-medium text-sm">{proc.name}</p>
                      <p className="text-xs text-muted-foreground">{proc.workflow} → {proc.step}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{proc.started}</span>
                    <Badge variant={proc.status === 'completed' ? 'default' : proc.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {proc.status.replace('_', ' ')}
                    </Badge>
                    <Button variant="outline" size="sm" className="h-7 text-xs">View</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="flex-1 p-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Escalation Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Auto-escalate after 24h', condition: 'Task not completed in 24 hours', action: 'Notify manager → Reassign' },
                  { name: 'High-value routing', condition: 'Amount > 50,000 SAR', action: 'Route to CFO for approval' },
                  { name: 'Urgent correspondence', condition: 'Priority = Urgent', action: 'Send SMS + Email + In-App notification' },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">If: {rule.condition} → Then: {rule.action}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SLA Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg text-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-1" />
                    <p className="text-xs font-medium">Green</p>
                    <p className="text-[10px] text-muted-foreground">&lt; 50% time used</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mx-auto mb-1" />
                    <p className="text-xs font-medium">Yellow</p>
                    <p className="text-[10px] text-muted-foreground">50-90% time used</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-1" />
                    <p className="text-xs font-medium">Red</p>
                    <p className="text-[10px] text-muted-foreground">&gt; 90% or overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ECMWorkflowDesigner;
