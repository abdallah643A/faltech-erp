import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkbooks, useVersions } from '@/hooks/useSpreadsheetStudio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Eye, GitCompare, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function VersionHistory() {
  const { workbookId } = useParams<{ workbookId: string }>();
  const { data: workbooks = [] } = useWorkbooks();
  const [selectedWb, setSelectedWb] = useState(workbookId || '');
  const { data: versions = [], isLoading } = useVersions(selectedWb || undefined);
  const [viewSnapshot, setViewSnapshot] = useState<any>(null);

  const wb = workbooks.find(w => w.id === selectedWb);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><History className="h-6 w-6" />Version History</h1>
        <p className="text-muted-foreground">Track all changes and snapshots for workbooks</p>
      </div>

      {!workbookId && (
        <Card>
          <CardContent className="p-4">
            <Select value={selectedWb} onValueChange={setSelectedWb}>
              <SelectTrigger className="w-80"><SelectValue placeholder="Select workbook" /></SelectTrigger>
              <SelectContent>{workbooks.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {wb && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold">{wb.name}</h3>
              <p className="text-sm text-muted-foreground">{wb.workbook_type} • {versions.length} versions</p>
            </div>
            <Badge>{wb.status}</Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Versions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : versions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No versions saved yet. Save from the editor to create a version.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Saved At</TableHead>
                  <TableHead>Saved By</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v, i) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">v{v.version_number}</Badge>
                      {i === 0 && <Badge className="ml-2 bg-green-500/10 text-green-700">Latest</Badge>}
                    </TableCell>
                    <TableCell className="text-sm flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(v.created_at), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell className="text-sm flex items-center gap-1"><User className="h-3 w-3" />{v.created_by_name || 'System'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.change_summary || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => setViewSnapshot(v.snapshot_data)}>
                          <Eye className="h-3.5 w-3.5 mr-1" />View
                        </Button>
                        {i > 0 && (
                          <Button size="sm" variant="outline" className="h-7">
                            <GitCompare className="h-3.5 w-3.5 mr-1" />Compare
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewSnapshot} onOpenChange={() => setViewSnapshot(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Version Snapshot</DialogTitle></DialogHeader>
          <div className="max-h-[400px] overflow-auto">
            <pre className="text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap">{JSON.stringify(viewSnapshot, null, 2)}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
