import { useState } from 'react';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Filter, Save, Star, Trash2, Share2, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SavedFilterBarProps {
  entityName: string;
  currentConfig: Record<string, any>;
  onApply: (config: Record<string, any>) => void;
}

export function SavedFilterBar({ entityName, currentConfig, onApply }: SavedFilterBarProps) {
  const { filters, saveFilter, deleteFilter, setDefault, isSaving } = useSavedFilters(entityName);
  const [saveOpen, setSaveOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (!filterName.trim()) return;
    saveFilter({ filter_name: filterName.trim(), filter_config: currentConfig, is_shared: isShared });
    setSaveOpen(false);
    setFilterName('');
    toast({ title: 'Filter saved' });
  };

  const hasActiveFilters = Object.values(currentConfig).some(v => v !== '' && v !== null && v !== undefined && v !== 'all');

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <Filter className="h-3 w-3" />
            Saved Filters
            {filters.length > 0 && <Badge variant="secondary" className="text-[10px] px-1">{filters.length}</Badge>}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          {filters.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2 text-center">No saved filters</div>
          ) : (
            filters.map(f => (
              <DropdownMenuItem key={f.id} className="flex items-center justify-between text-xs group" onClick={() => onApply(f.filter_config as Record<string, any>)}>
                <span className="flex items-center gap-1.5 truncate">
                  {f.is_default && <Star className="h-3 w-3 text-yellow-500 shrink-0" />}
                  {f.is_shared && <Share2 className="h-3 w-3 text-blue-500 shrink-0" />}
                  {f.filter_name}
                </span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); setDefault(f.id); }}>
                    <Star className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={e => { e.stopPropagation(); deleteFilter(f.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
          {filters.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem className="text-xs" onClick={() => setSaveOpen(true)} disabled={!hasActiveFilters}>
            <Save className="h-3 w-3 mr-1.5" /> Save Current Filter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Save Filter Preset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Filter name..."
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={isShared} onCheckedChange={v => setIsShared(!!v)} />
              Share with team
            </label>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleSave} disabled={!filterName.trim() || isSaving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
