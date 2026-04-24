import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface Account {
  id: string;
  acct_code: string;
  acct_name: string;
  acct_level: number | null;
  acct_type: string | null;
  father_acct_code: string | null;
  is_active: boolean | null;
  balance: number | null;
  company_id?: string | null;
  [key: string]: any;
}

export interface TreeNode {
  account: Account;
  children: TreeNode[];
}

export function buildTree(accounts: Account[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  // Build a lookup of father codes for ancestor walking
  const parentLookup = new Map<string, string | null>();
  for (const a of accounts) {
    map.set(a.acct_code, { account: a, children: [] });
    parentLookup.set(a.acct_code, a.father_acct_code);
  }

  // Find nearest existing ancestor in the map
  function findNearestAncestor(fatherCode: string | null): string | null {
    const visited = new Set<string>();
    let code = fatherCode;
    while (code) {
      if (map.has(code)) return code;
      if (visited.has(code)) break;
      visited.add(code);
      // Try progressively shorter prefixes (SAP-style hierarchical codes)
      // e.g. 610101 → check if 61010, 6101, 610, 61 exist
      code = code.slice(0, -1) || null;
    }
    return null;
  }

  for (const a of accounts) {
    const node = map.get(a.acct_code)!;
    if (a.father_acct_code) {
      if (map.has(a.father_acct_code)) {
        map.get(a.father_acct_code)!.children.push(node);
      } else {
        // Parent missing — find nearest existing ancestor
        const ancestor = findNearestAncestor(a.father_acct_code);
        if (ancestor) {
          map.get(ancestor)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();
  function matches(node: TreeNode): boolean {
    if (node.account.acct_code?.toLowerCase().includes(q) || node.account.acct_name?.toLowerCase().includes(q)) return true;
    return node.children.some(matches);
  }
  return nodes.filter(matches).map(n => ({
    ...n,
    children: filterTree(n.children, query),
  }));
}

interface COATreeItemProps {
  node: TreeNode;
  expanded: Set<string>;
  toggleExpand: (code: string) => void;
  selectedId: string | null;
  onSelect: (a: Account) => void;
  depth?: number;
  depthMap?: Map<string, number>;
}

export function COATreeItem({ node, expanded, toggleExpand, selectedId, onSelect, depth = 0, depthMap }: COATreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.account.acct_code);
  const isSelected = selectedId === node.account.id;
  const isTitle = hasChildren; // Title accounts (parent nodes)

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-[3px] pr-2 cursor-pointer transition-colors text-[13px] leading-tight select-none',
          isSelected
            ? 'bg-primary/15 text-primary'
            : 'hover:bg-accent/40',
          isTitle && 'font-semibold'
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => {
          onSelect(node.account);
          if (hasChildren) toggleExpand(node.account.acct_code);
        }}
      >
        {hasChildren ? (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {isExpanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="font-mono text-[12px] text-muted-foreground shrink-0">{node.account.acct_code}</span>
        <span className="mx-1 text-muted-foreground/40 shrink-0">-</span>
        <span className="truncate flex-1">{node.account.acct_name}</span>
        {depthMap && (
          <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-1">L{depthMap.get(node.account.acct_code) ?? ''}</span>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
              <COATreeItem
                key={child.account.id}
                node={child}
                expanded={expanded}
                toggleExpand={toggleExpand}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
                depthMap={depthMap}
              />
          ))}
        </div>
      )}
    </div>
  );
}
