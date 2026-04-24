import { useState } from 'react';
import { useCostCenterDimensions, useCostCenterNodes, TreeNode, CostCenterNode } from '@/hooks/useCostCenterDimensions';
import { CostCenterTree } from '@/components/cost-centers/CostCenterTree';
import { CostCenterNodeForm } from '@/components/cost-centers/CostCenterNodeForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Plus, FolderTree, Settings2, Download, Upload, RefreshCw,
  Layers, CircleDot, FolderOpen, BarChart3, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_DIMENSIONS = [
  { code: 'DIM1', name: 'Department', display_order: 1 },
  { code: 'DIM2', name: 'Project', display_order: 2 },
  { code: 'DIM3', name: 'Branch', display_order: 3 },
  { code: 'DIM4', name: 'Location', display_order: 4 },
  { code: 'DIM5', name: 'Business Unit', display_order: 5 },
];

export default function CostCenterDimensions() {
  const { dimensionsQuery, createDimension, updateDimension } = useCostCenterDimensions();
  const dimensions = dimensionsQuery.data || [];

  const [activeDimId, setActiveDimId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isNewNode, setIsNewNode] = useState(false);
  const [newNodeParentId, setNewNodeParentId] = useState<string | null>(null);
  const [showDimDialog, setShowDimDialog] = useState(false);
  const [newDim, setNewDim] = useState({ code: '', name: '', description: '' });
  const [activeTab, setActiveTab] = useState('hierarchy');

  const currentDimId = activeDimId || dimensions[0]?.id || null;
  const { nodesQuery, allNodes, tree, createNode, updateNode, moveNode, deleteNode } = useCostCenterNodes(currentDimId);

  const handleAddRoot = () => {
    setSelectedNode(null);
    setIsNewNode(true);
    setNewNodeParentId(null);
  };

  const handleAddChild = () => {
    if (!selectedNode) { toast.error('Select a parent node first'); return; }
    setNewNodeParentId(selectedNode.id);
    setIsNewNode(true);
    setSelectedNode(null);
  };

  const handleSelect = (node: TreeNode) => {
    setSelectedNode(node);
    setIsNewNode(false);
    setNewNodeParentId(null);
  };

  const handleSave = (data: Partial<CostCenterNode>) => {
    if (isNewNode) {
      createNode.mutate(data, {
        onSuccess: () => { setIsNewNode(false); },
      });
    } else if (data.id) {
      const { id, ...rest } = data;
      updateNode.mutate({ id, ...rest });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this cost center? This action cannot be undone.')) return;
    deleteNode.mutate(id, {
      onSuccess: () => { setSelectedNode(null); },
    });
  };

  const handleCreateDim = () => {
    if (!newDim.code || !newDim.name) return;
    createDimension.mutate(newDim, {
      onSuccess: () => {
        setShowDimDialog(false);
        setNewDim({ code: '', name: '', description: '' });
      },
    });
  };

  const handleExport = () => {
    if (allNodes.length === 0) { toast.error('No data to export'); return; }
    const headers = ['Code', 'Name', 'Parent Code', 'Level', 'Posting', 'Active', 'SAP Code', 'Budget Control', 'Description'];
    const rows = allNodes.map(n => {
      const parent = allNodes.find(p => p.id === n.parent_id);
      return [n.code, n.name, parent?.code || '', n.level_no, n.is_posting_allowed ? 'Yes' : 'No', n.is_active ? 'Yes' : 'No', n.sap_external_code || '', n.budget_control_flag ? 'Yes' : 'No', n.description || ''];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cost-centers-${currentDimId}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  // Stats
  const totalCount = allNodes.length;
  const postingCount = allNodes.filter(n => n.is_posting_allowed).length;
  const summaryCount = allNodes.filter(n => !n.is_posting_allowed).length;
  const mappedCount = allNodes.filter(n => n.sap_external_code).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            Cost Center Dimensions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage hierarchical cost center structures with SAP B1 posting-level synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast.info('Sync preview coming soon')}>
            <RefreshCw className="h-3.5 w-3.5" /> Sync Preview
          </Button>
        </div>
      </div>

      {/* Dimension Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {dimensions.map(d => (
          <Button
            key={d.id}
            variant={currentDimId === d.id ? 'default' : 'outline'}
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => { setActiveDimId(d.id); setSelectedNode(null); setIsNewNode(false); }}
          >
            <Layers className="h-3.5 w-3.5" />
            {d.name}
            {!d.is_active && <Badge variant="secondary" className="text-[9px] ml-1">Off</Badge>}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowDimDialog(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Dimension
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Nodes', value: totalCount, icon: FolderTree, color: 'text-primary' },
          { label: 'Posting Nodes', value: postingCount, icon: CircleDot, color: 'text-emerald-600' },
          { label: 'Summary Nodes', value: summaryCount, icon: FolderOpen, color: 'text-amber-600' },
          { label: 'SAP Mapped', value: mappedCount, icon: RefreshCw, color: 'text-blue-600' },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
              <s.icon className={`h-5 w-5 ${s.color} opacity-60`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      {currentDimId ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: '60vh' }}>
          {/* Left: Tree */}
          <Card className="lg:col-span-4 overflow-hidden">
            <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleAddRoot}>
                <Plus className="h-3 w-3" /> Root
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleAddChild} disabled={!selectedNode}>
                <Plus className="h-3 w-3" /> Child
              </Button>
            </div>
            <div style={{ height: 'calc(60vh - 40px)' }}>
              <CostCenterTree
                tree={tree}
                selectedId={selectedNode?.id || null}
                onSelect={handleSelect}
                onAddRoot={handleAddRoot}
              />
            </div>
          </Card>

          {/* Right: Form */}
          <Card className="lg:col-span-8 overflow-hidden">
            <div style={{ height: '60vh' }}>
              <CostCenterNodeForm
                node={selectedNode}
                allNodes={allNodes}
                dimensionId={currentDimId}
                onSave={handleSave}
                onDelete={handleDelete}
                isNew={isNewNode}
                parentId={newNodeParentId}
              />
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FolderTree className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Dimensions Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first dimension (e.g., Department, Project, Branch) to start building cost center hierarchies.
          </p>
          <Button onClick={() => setShowDimDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create First Dimension
          </Button>
        </Card>
      )}

      {/* New Dimension Dialog */}
      <Dialog open={showDimDialog} onOpenChange={setShowDimDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Dimension</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Code *</Label>
              <Input value={newDim.code} onChange={e => setNewDim(p => ({ ...p, code: e.target.value }))} className="h-8 text-sm" placeholder="e.g., DIM1" />
            </div>
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={newDim.name} onChange={e => setNewDim(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" placeholder="e.g., Department" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={newDim.description} onChange={e => setNewDim(p => ({ ...p, description: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs font-medium mb-2">Quick Templates</p>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_DIMENSIONS.map(d => (
                  <Button key={d.code} variant="outline" size="sm" className="text-[10px] h-6"
                    onClick={() => setNewDim({ code: d.code, name: d.name, description: '' })}>
                    {d.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDimDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateDim} disabled={!newDim.code || !newDim.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
