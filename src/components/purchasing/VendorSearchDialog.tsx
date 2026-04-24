import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2 } from 'lucide-react';
import { useBusinessPartners, BusinessPartner } from '@/hooks/useBusinessPartners';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (partner: BusinessPartner) => void;
}

export function VendorSearchDialog({ open, onOpenChange, onSelect }: Props) {
  const { businessPartners, isLoading } = useBusinessPartners();
  const [search, setSearch] = useState('');

  const vendors = useMemo(() =>
    businessPartners.filter(bp =>
      bp.card_type === 'supplier' || bp.card_type === 'vendor'
    ),
    [businessPartners]
  );

  const filtered = useMemo(() => {
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(v =>
      v.card_code.toLowerCase().includes(q) ||
      v.card_name.toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q) ||
      (v.phone || '').toLowerCase().includes(q)
    );
  }, [vendors, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Vendor</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        <div className="overflow-y-auto max-h-[50vh] border rounded">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">No vendors found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Code</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(v => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => { onSelect(v); onOpenChange(false); setSearch(''); }}
                  >
                    <TableCell className="font-medium">{v.card_code}</TableCell>
                    <TableCell>{v.card_name}</TableCell>
                    <TableCell>{v.phone || '-'}</TableCell>
                    <TableCell>{v.email || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
