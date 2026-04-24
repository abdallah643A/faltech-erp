import { useState } from 'react';
import { Save, Trash2, Share2, Check, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { useSavedViews, SavedView } from '@/hooks/useSavedViews';
import { toast } from 'sonner';

interface Props {
  module: string;
  currentFilters: Record<string, string>;
  currentColumns?: string[];
  currentSort?: { column?: string; direction?: 'asc' | 'desc' };
  onApplyView: (view: SavedView) => void;
}

export function SavedViewsManager({ module, currentFilters, currentColumns, currentSort, onApplyView }: Props) {
  const { myViews, sharedViews, saveView, deleteView } = useSavedViews(module);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [isShared, setIsShared] = useState(false);

  const handleSave = () => {
    if (!viewName.trim()) return;
    saveView.mutate({
      view_name: viewName,
      filters: currentFilters,
      columns: currentColumns || [],
      sort_config: currentSort || {},
      grouping: null,
      is_shared: isShared,
      is_default: false,
    }, {
      onSuccess: () => {
        toast.success('View saved');
        setSaveOpen(false);
        setViewName('');
      },
    });
  };

  const allViews = [...myViews, ...sharedViews];

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <BookMarked className="h-3.5 w-3.5" />
            Views {allViews.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{allViews.length}</Badge>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2">
          {allViews.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2 text-center">No saved views yet</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-auto">
              {myViews.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground px-1 uppercase">My Views</p>
                  {myViews.map(v => (
                    <div key={v.id} className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="flex-1 justify-start h-7 text-xs" onClick={() => onApplyView(v)}>
                        {v.view_name}
                        {v.is_shared && <Share2 className="h-3 w-3 ml-auto text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => deleteView.mutate(v.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
              {sharedViews.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <p className="text-[10px] font-semibold text-muted-foreground px-1 uppercase">Shared Views</p>
                  {sharedViews.map(v => (
                    <Button key={v.id} variant="ghost" size="sm" className="w-full justify-start h-7 text-xs" onClick={() => onApplyView(v)}>
                      {v.view_name}
                    </Button>
                  ))}
                </>
              )}
            </div>
          )}
          <DropdownMenuSeparator />
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1">
                <Save className="h-3 w-3" /> Save Current View
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save View</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>View Name</Label>
                  <Input value={viewName} onChange={e => setViewName(e.target.value)} placeholder="e.g. High-value open orders" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isShared} onCheckedChange={setIsShared} />
                  <Label>Share with team</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave} disabled={!viewName.trim()} size="sm">
                  <Check className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
