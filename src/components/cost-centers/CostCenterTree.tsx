import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, CircleDot, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TreeNode } from '@/hooks/useCostCenterDimensions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  tree: TreeNode[];
  selectedId: string | null;
  onSelect: (node: TreeNode) => void;
  onAddRoot: () => void;
  searchTerm?: string;
}

function matchesSearch(node: TreeNode, term: string): boolean {
  const lower = term.toLowerCase();
  if (node.name.toLowerCase().includes(lower) || node.code.toLowerCase().includes(lower)) return true;
  return node.children.some(c => matchesSearch(c, term));
}

function TreeItem({
  node, level, selectedId, onSelect, expanded, toggleExpand, searchTerm,
}: {
  node: TreeNode; level: number; selectedId: string | null;
  onSelect: (n: TreeNode) => void; expanded: Record<string, boolean>;
  toggleExpand: (id: string) => void; searchTerm: string;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded[node.id] ?? (level < 1);
  const isSelected = selectedId === node.id;

  if (searchTerm && !matchesSearch(node, searchTerm)) return null;

  return (
    <div>
      <button
        onClick={() => onSelect(node)}
        className={cn(
          'flex items-center w-full text-left py-1.5 px-2 rounded-md text-sm transition-colors group hover:bg-muted/60',
          isSelected && 'bg-primary/10 text-primary font-medium',
          !node.is_active && 'opacity-50'
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); toggleExpand(node.id); }}
            className="mr-1 p-0.5 hover:bg-muted rounded shrink-0"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {hasChildren ? (
          isExpanded ? <FolderOpen className="h-4 w-4 mr-1.5 text-amber-500 shrink-0" /> : <Folder className="h-4 w-4 mr-1.5 text-amber-500 shrink-0" />
        ) : (
          <CircleDot className="h-3.5 w-3.5 mr-1.5 text-emerald-500 shrink-0" />
        )}

        <span className="truncate flex-1">{node.code} – {node.name}</span>

        <div className="flex items-center gap-1 ml-1 shrink-0">
          {node.is_posting_allowed ? (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-700 border-emerald-300">Posting</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted text-muted-foreground">Summary</Badge>
          )}
          {node.sap_external_code && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-blue-500/10 text-blue-700 border-blue-300">SAP</Badge>
          )}
          {!node.is_active && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">Inactive</Badge>
          )}
        </div>
      </button>

      {hasChildren && isExpanded && node.children.map(child => (
        <TreeItem
          key={child.id} node={child} level={level + 1}
          selectedId={selectedId} onSelect={onSelect}
          expanded={expanded} toggleExpand={toggleExpand}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
}

export function CostCenterTree({ tree, selectedId, onSelect, onAddRoot }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const totalNodes = useMemo(() => {
    let count = 0;
    const countNodes = (nodes: TreeNode[]) => { nodes.forEach(n => { count++; countNodes(n.children); }); };
    countNodes(tree);
    return count;
  }, [tree]);

  const postingCount = useMemo(() => {
    let count = 0;
    const countPosting = (nodes: TreeNode[]) => { nodes.forEach(n => { if (n.is_posting_allowed) count++; countPosting(n.children); }); };
    countPosting(tree);
    return count;
  }, [tree]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold flex-1">Hierarchy</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onAddRoot}>
            <Plus className="h-3 w-3" /> Root
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search cost centers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>{totalNodes} total</span>
          <span>{postingCount} posting</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {tree.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>No cost centers defined.</p>
              <p className="text-xs mt-1">Click "+ Root" to create your first cost center.</p>
            </div>
          ) : (
            tree.map(node => (
              <TreeItem
                key={node.id} node={node} level={0}
                selectedId={selectedId} onSelect={onSelect}
                expanded={expanded} toggleExpand={toggleExpand}
                searchTerm={search}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
