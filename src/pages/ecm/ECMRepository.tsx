import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  FolderOpen, File, Upload, Plus, ChevronRight, ChevronDown,
  MoreVertical, Edit, Trash2, Download, Eye, Lock, Unlock,
  Search, Grid3X3, List, FileText, Image, FileSpreadsheet,
  FolderPlus, ArrowUp, Clock, Shield, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'name', header: 'Name' },
  { key: 'type', header: 'Type' },
  { key: 'department', header: 'Department' },
  { key: 'confidentiality', header: 'Confidentiality' },
  { key: 'status', header: 'Status' },
  { key: 'modified', header: 'Modified' },
  { key: 'actions', header: 'Actions' },
];


const DEPARTMENTS = ['Finance', 'HR', 'Legal', 'Procurement', 'Projects', 'Sales', 'Production', 'Administration', 'IT'];
const DEPT_COLORS: Record<string, string> = {
  Finance: '#0066cc', HR: '#e8a000', Legal: '#cc0000', Procurement: '#6b7280',
  Projects: '#1a7a4a', Sales: '#8b5cf6', Production: '#f59e0b', Administration: '#64748b', IT: '#06b6d4'
};
const CONFIDENTIALITY = ['public', 'internal', 'confidential', 'strictly_confidential'];
const CONF_COLORS: Record<string, string> = {
  public: 'bg-green-100 text-green-800', internal: 'bg-blue-100 text-blue-800',
  confidential: 'bg-amber-100 text-amber-800', strictly_confidential: 'bg-red-100 text-red-800'
};

function getFileIcon(ext?: string) {
  switch (ext?.toLowerCase()) {
    case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': return <Image className="h-4 w-4 text-purple-500" />;
    case 'xlsx': case 'xls': return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    case 'docx': case 'doc': return <FileText className="h-4 w-4 text-blue-600" />;
    default: return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  department: string | null;
  color: string;
  children: FolderNode[];
  depth: number;
}

function buildTree(folders: any[]): FolderNode[] {
  const map: Record<string, FolderNode> = {};
  const roots: FolderNode[] = [];
  folders.forEach(f => { map[f.id] = { ...f, children: [] }; });
  folders.forEach(f => {
    if (f.parent_id && map[f.parent_id]) {
      map[f.parent_id].children.push(map[f.id]);
    } else {
      roots.push(map[f.id]);
    }
  });
  return roots;
}

function FolderTreeItem({ node, selectedId, onSelect, level = 0 }: {
  node: FolderNode; selectedId: string | null; onSelect: (id: string) => void; level?: number;
}) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer text-sm hover:bg-muted/60 transition-colors',
          isSelected && 'bg-primary/10 text-primary font-medium'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => { onSelect(node.id); if (hasChildren) setExpanded(!expanded); }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        ) : <span className="w-3.5" />}
        <FolderOpen className="h-4 w-4 shrink-0" style={{ color: node.color || '#0066cc' }} />
        <span className="truncate">{node.name}</span>
      </div>
      {expanded && node.children.map(child => (
        <FolderTreeItem key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} level={level + 1} />
      ))}
    </div>
  );
}

export default function ECMRepository() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDept, setNewFolderDept] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadMeta, setUploadMeta] = useState({ title: '', department: '', confidentiality: 'internal', tags: '', document_type: 'general' });

  const { data: folders = [] } = useQuery({
    queryKey: ['ecm-folders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_folders').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['ecm-documents', selectedFolder, searchQuery],
    queryFn: async () => {
      let q = supabase.from('ecm_documents').select('*').order('created_at', { ascending: false });
      if (selectedFolder) q = q.eq('folder_id', selectedFolder);
      if (searchQuery) q = q.or(`title.ilike.%${searchQuery}%,file_name.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const createFolder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ecm_folders').insert({
        name: newFolderName,
        department: newFolderDept || null,
        parent_id: selectedFolder,
        color: DEPT_COLORS[newFolderDept] || '#0066cc',
        path: '/',
        depth: 0,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecm-folders'] });
      toast.success('Folder created');
      setShowNewFolder(false);
      setNewFolderName('');
      setNewFolderDept('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadDocument = useMutation({
    mutationFn: async () => {
      for (const file of uploadFiles) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const filePath = `${user?.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('ecm-documents').upload(filePath, file);
        if (uploadErr) throw uploadErr;

        const { error: insertErr } = await supabase.from('ecm_documents').insert({
          folder_id: selectedFolder,
          title: uploadMeta.title || file.name.replace(/\.[^.]+$/, ''),
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          file_extension: ext,
          department: uploadMeta.department || null,
          confidentiality: uploadMeta.confidentiality || 'internal',
          tags: uploadMeta.tags ? uploadMeta.tags.split(',').map(t => t.trim()) : [],
          document_type: uploadMeta.document_type || 'general',
          created_by: user?.id,
        });
        if (insertErr) throw insertErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecm-documents'] });
      toast.success(`${uploadFiles.length} document(s) uploaded`);
      setShowUpload(false);
      setUploadFiles([]);
      setUploadMeta({ title: '', department: '', confidentiality: 'internal', tags: '', document_type: 'general' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ecm_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ecm-documents'] }); toast.success('Document deleted'); },
  });

  const folderTree = buildTree(folders);
  const selectedFolderData = folders.find(f => f.id === selectedFolder);

  const breadcrumb = (() => {
    if (!selectedFolder) return [{ label: 'All Documents', id: null as string | null }];
    const trail: { label: string; id: string | null }[] = [{ label: 'Root', id: null }];
    let current = folders.find(f => f.id === selectedFolder);
    const path: typeof trail = [];
    while (current) {
      path.unshift({ label: current.name, id: current.id });
      current = current.parent_id ? folders.find(f => f.id === current!.parent_id) : undefined;
    }
    return [...trail, ...path];
  })();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) { setUploadFiles(files); setShowUpload(true); }
  }, []);

  return (
    <div className="flex h-[calc(100vh-180px)] gap-4">
      {/* Folder Tree */}
      <Card className="w-64 shrink-0 border-border">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Folders</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewFolder(true)}>
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-1 pb-2">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-sm hover:bg-muted/60',
                !selectedFolder && 'bg-primary/10 text-primary font-medium'
              )}
              onClick={() => setSelectedFolder(null)}
            >
              <FolderOpen className="h-4 w-4" />
              <span>All Documents</span>
            </div>
            {folderTree.map(node => (
              <FolderTreeItem key={node.id} node={node} selectedId={selectedFolder} onSelect={setSelectedFolder} />
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Document Area */}
      <div className="flex-1 flex flex-col gap-3" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
        {/* Breadcrumb + Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <button className="hover:text-foreground transition-colors" onClick={() => setSelectedFolder(b.id)}>{b.label}</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 w-48 h-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <ExportImportButtons data={documents || []} columns={exportColumns} filename="ecm-repository" title="ECM Repository" />
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-1" /> Upload
            </Button>
          </div>
        </div>

        {/* Documents */}
        <Card className="flex-1 border-border overflow-hidden">
          <ScrollArea className="h-full">
            {documents.length === 0 ? (
              <div className="h-full flex items-center justify-center p-12">
                <div className="text-center text-muted-foreground">
                  <Upload className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">Drop files here or click Upload</p>
                  <p className="text-sm mt-1">Supported: PDF, DOCX, XLSX, PPTX, JPG, PNG</p>
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="border-b">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Department</th>
                    <th className="text-left px-4 py-2 font-medium">Confidentiality</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Modified</th>
                    <th className="text-right px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.file_extension)}
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">{doc.document_number} • {(doc.file_size / 1024).toFixed(0)} KB</p>
                          </div>
                          {doc.is_checked_out && <Lock className="h-3 w-3 text-amber-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-2 capitalize">{doc.document_type}</td>
                      <td className="px-4 py-2">{doc.department || '—'}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className={CONF_COLORS[doc.confidentiality || 'internal']}>
                          {(doc.confidentiality || 'internal').replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={doc.status === 'active' ? 'default' : doc.status === 'expired' ? 'destructive' : 'secondary'}>
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{new Date(doc.updated_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                            <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Edit Metadata</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteDoc.mutate(doc.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {documents.map(doc => (
                  <Card key={doc.id} className="border-border hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-center h-16 mb-3 bg-muted/30 rounded">
                        {getFileIcon(doc.file_extension)}
                      </div>
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{doc.document_number}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Badge variant="outline" className="text-[10px]">{doc.document_type}</Badge>
                        {doc.is_checked_out && <Lock className="h-3 w-3 text-amber-500" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Folder</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folder Name</Label>
              <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter folder name" />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={newFolderDept} onValueChange={setNewFolderDept}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedFolder && <p className="text-sm text-muted-foreground">Parent folder: {selectedFolderData?.name}</p>}
            <Button className="w-full" onClick={() => createFolder.mutate()} disabled={!newFolderName}>Create Folder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload Document{uploadFiles.length > 1 ? 's' : ''}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {uploadFiles.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select files</p>
                <input type="file" multiple className="mt-2" onChange={e => setUploadFiles(Array.from(e.target.files || []))} />
              </div>
            ) : (
              <div className="text-sm space-y-1">
                {uploadFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    {getFileIcon(f.name.split('.').pop())}
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label>Title</Label>
              <Input value={uploadMeta.title} onChange={e => setUploadMeta(p => ({ ...p, title: e.target.value }))} placeholder="Document title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Select value={uploadMeta.department} onValueChange={v => setUploadMeta(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Confidentiality</Label>
                <Select value={uploadMeta.confidentiality} onValueChange={v => setUploadMeta(p => ({ ...p, confidentiality: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONFIDENTIALITY.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={uploadMeta.tags} onChange={e => setUploadMeta(p => ({ ...p, tags: e.target.value }))} placeholder="contract, legal, 2025" />
            </div>
            <Button className="w-full" onClick={() => uploadDocument.mutate()} disabled={uploadFiles.length === 0 || uploadDocument.isPending}>
              {uploadDocument.isPending ? 'Uploading...' : `Upload ${uploadFiles.length} File(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
