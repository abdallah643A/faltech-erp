import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, Search, Download, Upload } from 'lucide-react';
import { useCostCodes, CostCode } from '@/hooks/useCostCodes';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';

const DIVISIONS = [
  { num: 1, label: '01 - General Requirements' },
  { num: 2, label: '02 - Existing Conditions' },
  { num: 3, label: '03 - Concrete' },
  { num: 4, label: '04 - Masonry' },
  { num: 5, label: '05 - Metals' },
  { num: 6, label: '06 - Wood, Plastics, Composites' },
  { num: 7, label: '07 - Thermal & Moisture Protection' },
  { num: 8, label: '08 - Openings' },
  { num: 9, label: '09 - Finishes' },
  { num: 10, label: '10 - Specialties' },
  { num: 11, label: '11 - Equipment' },
  { num: 12, label: '12 - Furnishings' },
  { num: 13, label: '13 - Special Construction' },
  { num: 14, label: '14 - Conveying Equipment' },
  { num: 21, label: '21 - Fire Suppression' },
  { num: 22, label: '22 - Plumbing' },
  { num: 23, label: '23 - HVAC' },
  { num: 26, label: '26 - Electrical' },
  { num: 27, label: '27 - Communications' },
  { num: 28, label: '28 - Electronic Safety & Security' },
  { num: 31, label: '31 - Earthwork' },
  { num: 32, label: '32 - Exterior Improvements' },
  { num: 33, label: '33 - Utilities' },
];

export default function CPMSCostCodes() {
  const { t } = useLanguage();
  const { codes, createCode, updateCode, deleteCode, getHierarchy } = useCostCodes();
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<CostCode | null>(null);
  const [search, setSearch] = useState('');
  const [expandedDivisions, setExpandedDivisions] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({ code: '', division_number: 1, title: '', description: '', parent_code: '', is_active: true });

  const allCodes = codes.data || [];
  const filtered = search
    ? allCodes.filter(c => c.code.includes(search) || c.title.toLowerCase().includes(search.toLowerCase()))
    : allCodes;

  const { roots, getChildren } = getHierarchy(filtered);

  const toggleDivision = (div: number) => {
    const next = new Set(expandedDivisions);
    next.has(div) ? next.delete(div) : next.add(div);
    setExpandedDivisions(next);
  };

  const openCreate = (parentCode?: string, divNum?: number) => {
    setEditItem(null);
    setForm({
      code: parentCode ? `${parentCode}.` : '',
      division_number: divNum || 1,
      title: '', description: '', parent_code: parentCode || '', is_active: true,
    });
    setShowDialog(true);
  };

  const openEdit = (item: CostCode) => {
    setEditItem(item);
    setForm({
      code: item.code,
      division_number: item.division_number,
      title: item.title,
      description: item.description || '',
      parent_code: item.parent_code || '',
      is_active: item.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.code || !form.title) return;
    if (editItem) {
      updateCode.mutate({ id: editItem.id, ...form });
    } else {
      createCode.mutate(form as any);
    }
    setShowDialog(false);
  };

  const handleExport = () => {
    const rows = allCodes.map(c => ({
      Code: c.code, Division: c.division_number, Title: c.title,
      Description: c.description || '', Parent: c.parent_code || '', Active: c.is_active ? 'Yes' : 'No',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cost Codes');
    XLSX.writeFile(wb, 'cost_codes.xlsx');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      rows.forEach(r => {
        createCode.mutate({
          code: String(r.Code || r.code || ''),
          division_number: Number(r.Division || r.division_number || 1),
          title: String(r.Title || r.title || ''),
          description: String(r.Description || r.description || ''),
          parent_code: r.Parent || r.parent_code || null,
          is_active: r.Active === 'No' ? false : true,
        } as any);
      });
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Group by division
  const divisions = DIVISIONS.map(d => ({
    ...d,
    items: filtered.filter(c => c.division_number === d.num && !c.parent_code),
  })).filter(d => d.items.length > 0 || !search);

  const renderChildren = (parentCode: string, depth: number) => {
  const { t } = useLanguage();

    const children = getChildren(parentCode);
    if (!children.length) return null;
    return children.map(child => (
      <TableRow key={child.id} className="bg-muted/20">
        <TableCell style={{ paddingLeft: `${(depth + 1) * 24}px` }}>
          <span className="text-xs font-mono">{child.code}</span>
        </TableCell>
        <TableCell className="text-xs">{child.title}</TableCell>
        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{child.description}</TableCell>
        <TableCell>
          <Badge variant={child.is_active ? 'default' : 'secondary'} className="text-[10px]">
            {child.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCreate(child.code, child.division_number)}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(child)}>
              <Edit className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {child.code}?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteCode.mutate(child.id)}>{t('common.delete')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CSI MasterFormat Cost Codes</h1>
          <p className="text-sm text-muted-foreground">Manage construction cost classification codes</p>
        </div>
        <div className="flex gap-2">
          <label>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" asChild><span><Upload className="h-4 w-4 mr-1" />Import</span></Button>
          </label>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />{t('common.export')}</Button>
          <Button size="sm" onClick={() => openCreate()}><Plus className="h-4 w-4 mr-1" />Add Code</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by code or title..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
            <Badge variant="outline">{allCodes.length} codes</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead className="w-[80px]">{t('common.status')}</TableHead>
                <TableHead className="w-[120px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {divisions.map(div => {
                const expanded = expandedDivisions.has(div.num);
                return (
                  <TableRow key={div.num} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleDivision(div.num)}>
                    <TableCell colSpan={5}>
                      <div className="flex items-center gap-2">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">{div.label}</span>
                        <Badge variant="outline" className="text-[10px]">{div.items.length}</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={e => { e.stopPropagation(); openCreate(String(div.num).padStart(2, '0'), div.num); }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Render expanded items below their division row via a flat list */}
            </TableBody>
          </Table>

          {/* Expanded view per division */}
          {divisions.filter(d => expandedDivisions.has(d.num)).map(div => (
            <div key={`exp-${div.num}`} className="border rounded-md mt-2 mb-4">
              <Table>
                <TableBody>
                  {div.items.map(item => (
                    <>
                      <TableRow key={item.id}>
                        <TableCell className="w-[160px] pl-8">
                          <span className="font-mono text-sm font-medium">{item.code}</span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{item.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{item.description}</TableCell>
                        <TableCell className="w-[80px]">
                          <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {item.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCreate(item.code, item.division_number)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(item)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {item.code}?</AlertDialogTitle>
                                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCode.mutate(item.id)}>{t('common.delete')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      {renderChildren(item.code, 1)}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Cost Code' : 'Add Cost Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. 03.30.01" />
              </div>
              <div>
                <Label>Division</Label>
                <Select value={String(form.division_number)} onValueChange={v => setForm({ ...form, division_number: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map(d => (
                      <SelectItem key={d.num} value={String(d.num)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Concrete Pumping" />
            </div>
            <div>
              <Label>{t('common.description')}</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detailed description..." />
            </div>
            <div>
              <Label>Parent Code</Label>
              <Select value={form.parent_code || '_none'} onValueChange={v => setForm({ ...form, parent_code: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="None (top level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None (top level)</SelectItem>
                  {allCodes.filter(c => c.code !== form.code).map(c => (
                    <SelectItem key={c.id} value={c.code}>{c.code} - {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>{t('common.active')}</Label>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!form.code || !form.title}>
              {editItem ? 'Update' : 'Create'} Cost Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
