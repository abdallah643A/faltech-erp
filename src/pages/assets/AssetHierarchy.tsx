import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { ChevronRight, ChevronDown, Box } from 'lucide-react';

interface TreeNode { id: string; name: string; code: string; category?: string; status?: string; children: TreeNode[]; }

const AssetHierarchy = () => {
  const { activeCompanyId } = useActiveCompany();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('cpms_equipment' as any).select('*').order('name');
      setEquipment((data || []) as any[]);
    };
    fetch();
  }, [activeCompanyId]);

  const buildTree = (items: any[], parentId: string | null = null): TreeNode[] => {
    return items
      .filter(i => (i.parent_asset_id || null) === parentId)
      .map(i => ({ id: i.id, name: i.name, code: i.code, category: i.category, status: i.status, children: buildTree(items, i.id) }));
  };

  const tree = buildTree(equipment);
  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const TreeItem = ({ node, depth = 0 }: { node: TreeNode; depth?: number }) => (
    <div>
      <div className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded cursor-pointer" style={{ paddingLeft: `${depth * 24 + 12}px` }} onClick={() => toggle(node.id)}>
        {node.children.length > 0 ? (expanded.has(node.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <Box className="h-4 w-4 text-muted-foreground" />}
        <span className="font-medium text-sm">{node.name}</span>
        <span className="text-xs text-muted-foreground">({node.code})</span>
        {node.category && <Badge variant="outline" className="text-xs">{node.category}</Badge>}
        {node.status && <Badge variant="secondary" className="text-xs">{node.status}</Badge>}
        {node.children.length > 0 && <span className="text-xs text-muted-foreground ml-auto">{node.children.length} sub-assets</span>}
      </div>
      {expanded.has(node.id) && node.children.map(c => <TreeItem key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Hierarchy</h1><p className="text-sm text-muted-foreground">Parent-child relationships: sites → machines → subassemblies → components</p></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{equipment.length}</div><div className="text-xs text-muted-foreground">Total Assets</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{tree.length}</div><div className="text-xs text-muted-foreground">Root Assets</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{equipment.filter(e => e.parent_asset_id).length}</div><div className="text-xs text-muted-foreground">Sub-Assets</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Asset Tree</CardTitle></CardHeader>
        <CardContent>
          {tree.length === 0 ? <div className="text-center py-8 text-muted-foreground">No assets found. Use Equipment Management to add assets.</div> : tree.map(n => <TreeItem key={n.id} node={n} />)}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetHierarchy;
