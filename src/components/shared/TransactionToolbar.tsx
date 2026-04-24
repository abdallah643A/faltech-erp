import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TransactionToolbarProps {
  onAdd?: () => void;
  onFind?: (query: string) => void;
  addLabel?: string;
  findPlaceholder?: string;
  showAdd?: boolean;
  showFind?: boolean;
}

export function TransactionToolbar({
  onAdd,
  onFind,
  addLabel = 'Add New',
  findPlaceholder = 'Enter document number or * for all...',
  showAdd = true,
  showFind = true,
}: TransactionToolbarProps) {
  const { t } = useLanguage();
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');

  const handleFind = useCallback(() => {
    if (onFind) {
      onFind(findQuery === '*' ? '' : findQuery);
    }
    setFindOpen(false);
    setFindQuery('');
  }, [findQuery, onFind]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setFindOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        {showFind && (
          <Button variant="ghost" size="sm" onClick={() => setFindOpen(true)} title="Find (Ctrl+F)" className="text-white hover:bg-white/10">
            <Search className="h-4 w-4 mr-1" />
            Find
          </Button>
        )}
        {showAdd && onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {addLabel}
          </Button>
        )}
      </div>

      <Dialog open={findOpen} onOpenChange={setFindOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Find Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter document number to search, or <code className="bg-muted px-1 rounded">*</code> to show all records.
            </p>
            <Input
              value={findQuery}
              onChange={e => setFindQuery(e.target.value)}
              placeholder={findPlaceholder}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleFind(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFindOpen(false)}>Cancel</Button>
            <Button onClick={handleFind}>
              <Search className="h-4 w-4 mr-1" /> Find
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
