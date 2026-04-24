import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CostCenterDimension {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  company_id: string | null;
  created_at: string;
}

export interface CostCenterNode {
  id: string;
  dimension_id: string;
  code: string;
  name: string;
  parent_id: string | null;
  hierarchy_path: string | null;
  level_no: number;
  is_leaf: boolean;
  is_posting_allowed: boolean;
  is_active: boolean;
  sap_external_code: string | null;
  sync_status: string | null;
  manager_id: string | null;
  budget_control_flag: boolean;
  effective_from: string | null;
  effective_to: string | null;
  description: string | null;
  reporting_label: string | null;
  notes: string | null;
  company_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreeNode extends CostCenterNode {
  children: TreeNode[];
}

function buildTree(nodes: CostCenterNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  nodes.forEach(n => map.set(n.id, { ...n, children: [] }));
  nodes.forEach(n => {
    const tn = map.get(n.id)!;
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(tn);
    } else {
      roots.push(tn);
    }
  });
  return roots;
}

function computeHierarchyPath(node: CostCenterNode, allNodes: CostCenterNode[]): string {
  const parts: string[] = [];
  let current: CostCenterNode | undefined = node;
  while (current) {
    parts.unshift(current.name);
    current = current.parent_id ? allNodes.find(n => n.id === current!.parent_id) : undefined;
  }
  return parts.join(' > ');
}

function isDescendant(nodeId: string, potentialAncestorId: string, allNodes: CostCenterNode[]): boolean {
  let current = allNodes.find(n => n.id === nodeId);
  while (current?.parent_id) {
    if (current.parent_id === potentialAncestorId) return true;
    current = allNodes.find(n => n.id === current!.parent_id);
  }
  return false;
}

export function useCostCenterDimensions() {
  const qc = useQueryClient();

  const dimensionsQuery = useQuery({
    queryKey: ['cost-center-dimensions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_center_dimensions')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as CostCenterDimension[];
    },
  });

  const createDimension = useMutation({
    mutationFn: async (dim: Partial<CostCenterDimension>) => {
      const { data, error } = await supabase
        .from('cost_center_dimensions')
        .insert(dim as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-center-dimensions'] });
      toast.success('Dimension created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateDimension = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<CostCenterDimension> & { id: string }) => {
      const { error } = await supabase
        .from('cost_center_dimensions')
        .update(rest as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-center-dimensions'] });
      toast.success('Dimension updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { dimensionsQuery, createDimension, updateDimension };
}

export function useCostCenterNodes(dimensionId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const nodesQuery = useQuery({
    queryKey: ['cost-center-nodes', dimensionId],
    queryFn: async () => {
      if (!dimensionId) return [];
      const { data, error } = await supabase
        .from('cost_center_nodes')
        .select('*')
        .eq('dimension_id', dimensionId)
        .order('level_no')
        .order('code');
      if (error) throw error;
      return data as CostCenterNode[];
    },
    enabled: !!dimensionId,
  });

  const allNodes = nodesQuery.data || [];
  const tree = buildTree(allNodes);

  const createNode = useMutation({
    mutationFn: async (node: Partial<CostCenterNode>) => {
      // compute level and path
      let levelNo = 0;
      if (node.parent_id) {
        const parent = allNodes.find(n => n.id === node.parent_id);
        if (parent) levelNo = parent.level_no + 1;
      }
      const tempNode = { ...node, level_no: levelNo, id: 'temp' } as CostCenterNode;
      const path = computeHierarchyPath(tempNode, allNodes);

      const insertData = {
        ...node,
        level_no: levelNo,
        hierarchy_path: path,
        is_leaf: true,
        is_posting_allowed: true,
        created_by: user?.id,
        updated_by: user?.id,
      };

      const { data, error } = await supabase
        .from('cost_center_nodes')
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;

      // If parent exists, mark parent as non-leaf
      if (node.parent_id) {
        await supabase
          .from('cost_center_nodes')
          .update({ is_leaf: false, is_posting_allowed: false, updated_by: user?.id } as any)
          .eq('id', node.parent_id);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-center-nodes', dimensionId] });
      toast.success('Cost center created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateNode = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<CostCenterNode> & { id: string }) => {
      const { error } = await supabase
        .from('cost_center_nodes')
        .update({ ...rest, updated_by: user?.id } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-center-nodes', dimensionId] });
      toast.success('Cost center updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const moveNode = useMutation({
    mutationFn: async ({ nodeId, newParentId }: { nodeId: string; newParentId: string | null }) => {
      if (nodeId === newParentId) throw new Error('Cannot assign self as parent');
      if (newParentId && isDescendant(newParentId, nodeId, allNodes)) {
        throw new Error('Cannot assign descendant as parent (circular reference)');
      }

      const node = allNodes.find(n => n.id === nodeId);
      if (!node) throw new Error('Node not found');
      const oldParentId = node.parent_id;

      let newLevel = 0;
      if (newParentId) {
        const newParent = allNodes.find(n => n.id === newParentId);
        if (newParent) newLevel = newParent.level_no + 1;
      }

      await supabase
        .from('cost_center_nodes')
        .update({ parent_id: newParentId, level_no: newLevel, updated_by: user?.id } as any)
        .eq('id', nodeId);

      // Mark new parent as non-leaf
      if (newParentId) {
        await supabase
          .from('cost_center_nodes')
          .update({ is_leaf: false, is_posting_allowed: false } as any)
          .eq('id', newParentId);
      }

      // Check if old parent still has children
      if (oldParentId) {
        const { data: siblings } = await supabase
          .from('cost_center_nodes')
          .select('id')
          .eq('parent_id', oldParentId)
          .neq('id', nodeId);
        if (!siblings || siblings.length === 0) {
          await supabase
            .from('cost_center_nodes')
            .update({ is_leaf: true, is_posting_allowed: true } as any)
            .eq('id', oldParentId);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-center-nodes', dimensionId] });
      toast.success('Node moved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteNode = useMutation({
    mutationFn: async (nodeId: string) => {
      const node = allNodes.find(n => n.id === nodeId);
      if (!node) throw new Error('Node not found');
      const children = allNodes.filter(n => n.parent_id === nodeId);
      if (children.length > 0) throw new Error('Cannot delete node with children. Remove children first.');

      const { error } = await supabase
        .from('cost_center_nodes')
        .delete()
        .eq('id', nodeId);
      if (error) throw error;

      // Check if parent becomes leaf
      if (node.parent_id) {
        const { data: siblings } = await supabase
          .from('cost_center_nodes')
          .select('id')
          .eq('parent_id', node.parent_id)
          .neq('id', nodeId);
        if (!siblings || siblings.length === 0) {
          await supabase
            .from('cost_center_nodes')
            .update({ is_leaf: true, is_posting_allowed: true } as any)
            .eq('id', node.parent_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-center-nodes', dimensionId] });
      toast.success('Cost center deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { nodesQuery, allNodes, tree, createNode, updateNode, moveNode, deleteNode };
}
