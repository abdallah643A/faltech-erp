import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Plus, Camera, Clock, CheckCircle2, XCircle, ArrowUpCircle, Search } from 'lucide-react';
import { useSupplierIssues, useSupplierPhotoUpload } from '@/hooks/useSupplierManagement';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  investigating: 'bg-amber-100 text-amber-800',
  escalated: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-muted text-muted-foreground',
};

const issueTypes = ['quality', 'delay', 'wrong_items', 'quantity_mismatch', 'documentation', 'safety'];

export function SupplierIssueTracker() {
  const { issues, isLoading, createIssue, updateIssue } = useSupplierIssues();
  const { upload } = useSupplierPhotoUpload();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    vendor_name: '', issue_type: 'quality', severity: 'medium',
    title: '', description: '',
  });

  const filtered = issues.filter(i => {
    const matchSearch = i.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.issue_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCount = issues.filter(i => i.status === 'open').length;
  const escalatedCount = issues.filter(i => i.status === 'escalated').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const criticalCount = issues.filter(i => i.severity === 'critical' && i.status !== 'closed').length;

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await upload(file);
        setPhotos(prev => [...prev, url]);
      }
    } catch { /* handled */ }
    setUploading(false);
  };

  const handleCreate = async () => {
    await createIssue.mutateAsync({
      ...form,
      photo_urls: photos,
      reported_by: user?.id,
      reported_by_name: user?.email?.split('@')[0],
    });
    setShowCreate(false);
    setForm({ vendor_name: '', issue_type: 'quality', severity: 'medium', title: '', description: '' });
    setPhotos([]);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const updates: any = { id, status };
    if (status === 'resolved') {
      updates.resolved_by = user?.id;
      updates.resolved_by_name = user?.email?.split('@')[0];
      updates.resolved_date = new Date().toISOString();
    }
    if (status === 'escalated') {
      updates.escalated_at = new Date().toISOString();
    }
    await updateIssue.mutateAsync(updates);
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
          <p className="text-2xl font-bold text-red-600">{openCount}</p>
          <p className="text-xs text-muted-foreground">Open Issues</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <ArrowUpCircle className="h-5 w-5 mx-auto mb-1 text-orange-500" />
          <p className="text-2xl font-bold text-orange-600">{escalatedCount}</p>
          <p className="text-xs text-muted-foreground">Escalated</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
          <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
          <p className="text-xs text-muted-foreground">Critical Active</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search issues..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3 w-3 mr-1" /> Report Issue</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-center py-4 text-muted-foreground">Loading...</p> :
          filtered.length === 0 ? <p className="text-center py-4 text-muted-foreground">No issues found.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(issue => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-mono text-xs">{issue.issue_number}</TableCell>
                      <TableCell className="font-medium text-sm">{issue.vendor_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{issue.issue_type}</Badge></TableCell>
                      <TableCell><Badge className={severityColors[issue.severity] || ''}>{issue.severity}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{issue.title}</TableCell>
                      <TableCell className="text-xs">{format(new Date(issue.reported_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell><Badge className={statusColors[issue.status] || ''}>{issue.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {issue.status === 'open' && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleStatusChange(issue.id, 'investigating')}>Investigate</Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 text-orange-600" onClick={() => handleStatusChange(issue.id, 'escalated')}>Escalate</Button>
                            </>
                          )}
                          {(issue.status === 'investigating' || issue.status === 'escalated') && (
                            <Button size="sm" variant="outline" className="text-xs h-7 text-green-600" onClick={() => handleStatusChange(issue.id, 'resolved')}>Resolve</Button>
                          )}
                          {issue.status === 'resolved' && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleStatusChange(issue.id, 'closed')}>Close</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Issue Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Report Supplier Issue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Vendor Name *</Label><Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Issue Type *</Label>
                <Select value={form.issue_type} onValueChange={v => setForm(f => ({ ...f, issue_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {issueTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div>
              <Label>Photos</Label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoCapture} />
              <Button variant="outline" className="w-full mt-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Camera className="h-4 w-4 mr-2" /> {uploading ? 'Uploading...' : 'Take Photo'}
              </Button>
              {photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {photos.map((url, i) => <img key={i} src={url} alt="" className="h-16 w-16 object-cover rounded border" />)}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.vendor_name || !form.title || createIssue.isPending}>Report Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
