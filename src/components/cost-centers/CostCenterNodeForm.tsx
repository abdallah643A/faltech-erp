import { useState, useEffect } from 'react';
import { CostCenterNode, TreeNode } from '@/hooks/useCostCenterDimensions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, CircleDot, FolderOpen, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  node: TreeNode | null;
  allNodes: CostCenterNode[];
  dimensionId: string;
  onSave: (data: Partial<CostCenterNode>) => void;
  onDelete: (id: string) => void;
  isNew?: boolean;
  parentId?: string | null;
}

export function CostCenterNodeForm({ node, allNodes, dimensionId, onSave, onDelete, isNew, parentId }: Props) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    reporting_label: '',
    sap_external_code: '',
    manager_id: '',
    budget_control_flag: false,
    is_active: true,
    effective_from: '',
    effective_to: '',
    notes: '',
  });

  useEffect(() => {
    if (node && !isNew) {
      setForm({
        code: node.code,
        name: node.name,
        description: node.description || '',
        reporting_label: node.reporting_label || '',
        sap_external_code: node.sap_external_code || '',
        manager_id: node.manager_id || '',
        budget_control_flag: node.budget_control_flag,
        is_active: node.is_active,
        effective_from: node.effective_from || '',
        effective_to: node.effective_to || '',
        notes: node.notes || '',
      });
    } else if (isNew) {
      setForm({
        code: '', name: '', description: '', reporting_label: '',
        sap_external_code: '', manager_id: '', budget_control_flag: false,
        is_active: true, effective_from: '', effective_to: '', notes: '',
      });
    }
  }, [node, isNew]);

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) return;
    const data: Partial<CostCenterNode> = {
      ...form,
      dimension_id: dimensionId,
      description: form.description || null,
      reporting_label: form.reporting_label || null,
      sap_external_code: form.sap_external_code || null,
      manager_id: form.manager_id || null,
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      notes: form.notes || null,
    };
    if (isNew) data.parent_id = parentId ?? null;
    if (!isNew && node) data.id = node.id;
    onSave(data);
  };

  const parentNode = node?.parent_id ? allNodes.find(n => n.id === node.parent_id) : null;
  const hierarchyPath = node?.hierarchy_path || (parentId ? (allNodes.find(n => n.id === parentId)?.hierarchy_path || '') + ' > (new)' : '(root)');

  if (!node && !isNew) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select a cost center from the tree or create a new one.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">{isNew ? 'New Cost Center' : `Edit: ${node?.code}`}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{hierarchyPath}</p>
          </div>
          <div className="flex items-center gap-2">
            {node && !isNew && (
              <>
                {node.is_posting_allowed ? (
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 gap-1">
                    <CircleDot className="h-3 w-3" /> Posting Node
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <FolderOpen className="h-3 w-3" /> Summary Node
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        {node && !isNew && !node.is_posting_allowed && node.children.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Summary Node</p>
              <p>This node has children and cannot be used in Journal Entries or transaction postings. Only leaf-level (last child) nodes are postable.</p>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <fieldset className="space-y-3 border rounded-lg p-4">
          <legend className="text-xs font-semibold text-muted-foreground px-2">Basic Information</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Code *</Label>
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className="h-8 text-sm" placeholder="e.g., CC-FIN-AP" />
            </div>
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" placeholder="e.g., Accounts Payable" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Reporting Label</Label>
            <Input value={form.reporting_label} onChange={e => setForm(p => ({ ...p, reporting_label: e.target.value }))} className="h-8 text-sm" placeholder="Short name for reports" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="text-sm min-h-[60px]" placeholder="Purpose and scope..." />
          </div>
        </fieldset>

        {/* SAP & Sync */}
        <fieldset className="space-y-3 border rounded-lg p-4">
          <legend className="text-xs font-semibold text-muted-foreground px-2">SAP B1 Mapping</legend>
          <div>
            <Label className="text-xs">SAP External Code</Label>
            <Input value={form.sap_external_code} onChange={e => setForm(p => ({ ...p, sap_external_code: e.target.value }))} className="h-8 text-sm" placeholder="SAP cost center code" />
            <p className="text-[10px] text-muted-foreground mt-1">Only leaf/posting nodes are synced to SAP B1. This code maps the internal hierarchy to the SAP posting-level cost center.</p>
          </div>
          {node && !isNew && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Sync Status:</span>
              <Badge variant="outline" className="text-[10px]">{node.sync_status || 'not_synced'}</Badge>
            </div>
          )}
        </fieldset>

        {/* Control */}
        <fieldset className="space-y-3 border rounded-lg p-4">
          <legend className="text-xs font-semibold text-muted-foreground px-2">Control & Governance</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Effective From</Label>
              <Input type="date" value={form.effective_from} onChange={e => setForm(p => ({ ...p, effective_from: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Effective To</Label>
              <Input type="date" value={form.effective_to} onChange={e => setForm(p => ({ ...p, effective_to: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Active</Label>
              <p className="text-[10px] text-muted-foreground">Inactive cost centers cannot be used in new postings.</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Budget Control</Label>
              <p className="text-[10px] text-muted-foreground">Enable budget validation for this cost center.</p>
            </div>
            <Switch checked={form.budget_control_flag} onCheckedChange={v => setForm(p => ({ ...p, budget_control_flag: v }))} />
          </div>
        </fieldset>

        {/* Notes */}
        <fieldset className="space-y-3 border rounded-lg p-4">
          <legend className="text-xs font-semibold text-muted-foreground px-2">Notes</legend>
          <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="text-sm min-h-[60px]" placeholder="Internal notes..." />
        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            {node && !isNew && (
              <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={() => onDelete(node.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
          <Button size="sm" className="text-xs gap-1.5" onClick={handleSave} disabled={!form.code.trim() || !form.name.trim()}>
            <Save className="h-3.5 w-3.5" /> {isNew ? 'Create' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
