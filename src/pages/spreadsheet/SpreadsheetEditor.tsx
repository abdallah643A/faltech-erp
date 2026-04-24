import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkbooks, useSheets, useCells, useScenarios, useSSComments, useVersions } from '@/hooks/useSpreadsheetStudio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Plus, Lock, Unlock, MessageCircle, History, GitBranch, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';

const ROWS = 20;
const COLS = 12;
const COL_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function SpreadsheetEditor() {
  const { workbookId } = useParams<{ workbookId: string }>();
  const navigate = useNavigate();
  const { data: workbooks = [] } = useWorkbooks();
  const workbook = workbooks.find(w => w.id === workbookId);
  const { data: sheets = [], create: createSheet } = useSheets(workbookId);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const currentSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];
  const { data: cells = [], upsert: upsertCell } = useCells(currentSheet?.id);
  const { data: scenarios = [], create: createScenario } = useScenarios(workbookId);
  const { create: createVersion } = useVersions(workbookId);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showScenarioDialog, setShowScenarioDialog] = useState(false);
  const [scenarioForm, setScenarioForm] = useState({ name: '', description: '', scenario_type: 'optimistic' });

  // Build cell grid
  const cellMap = useMemo(() => {
    const map = new Map<string, any>();
    cells.forEach(c => map.set(`${c.row_index}-${c.col_index}`, c));
    return map;
  }, [cells]);

  const getCellValue = (row: number, col: number) => {
    const cell = cellMap.get(`${row}-${col}`);
    return cell?.display_value || cell?.value || '';
  };

  const getCellStyle = (row: number, col: number) => {
    const cell = cellMap.get(`${row}-${col}`);
    if (cell?.is_locked) return 'bg-muted/50';
    if (cell?.formula) return 'text-blue-600';
    return '';
  };

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
    const cell = cellMap.get(`${row}-${col}`);
    setEditValue(cell?.formula || cell?.value || '');
  };

  const handleCellSave = () => {
    if (!selectedCell || !currentSheet) return;
    const isFormula = editValue.startsWith('=');
    upsertCell.mutate({
      sheet_id: currentSheet.id,
      row_index: selectedCell.row,
      col_index: selectedCell.col,
      value: isFormula ? undefined : editValue,
      formula: isFormula ? editValue : undefined,
      display_value: editValue,
      cell_type: isFormula ? 'formula' : 'text',
    });
  };

  const handleSaveVersion = () => {
    if (!workbookId) return;
    createVersion.mutate({
      workbook_id: workbookId,
      version_number: 1,
      change_summary: 'Manual save',
      snapshot_data: { cells: cells },
    });
  };

  const handleAddSheet = () => {
    if (!workbookId) return;
    createSheet.mutate({
      workbook_id: workbookId,
      name: `Sheet${sheets.length + 1}`,
      sheet_order: sheets.length + 1,
    });
  };

  const handleCreateScenario = () => {
    if (!workbookId || !scenarioForm.name.trim()) return;
    createScenario.mutate({ ...scenarioForm, workbook_id: workbookId }, {
      onSuccess: () => { setShowScenarioDialog(false); setScenarioForm({ name: '', description: '', scenario_type: 'optimistic' }); },
    });
  };

  if (!workbook) {
    return <div className="p-6 text-center text-muted-foreground">Workbook not found. <Button variant="link" onClick={() => navigate('/spreadsheet/gallery')}>Back to Gallery</Button></div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b p-3 flex items-center gap-3 bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate('/spreadsheet/gallery')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h2 className="font-semibold">{workbook.name}</h2>
          <p className="text-xs text-muted-foreground">{workbook.workbook_type} • {workbook.status}</p>
        </div>
        <div className="flex gap-2">
          {scenarios.length > 0 && (
            <Select defaultValue="">
              <SelectTrigger className="w-40"><SelectValue placeholder="Base Scenario" /></SelectTrigger>
              <SelectContent>{scenarios.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowScenarioDialog(true)}><GitBranch className="h-4 w-4 mr-1" />Scenario</Button>
          <Button variant="outline" size="sm" onClick={() => setShowComments(!showComments)}><MessageCircle className="h-4 w-4 mr-1" />Comments</Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/spreadsheet/versions/${workbookId}`)}><History className="h-4 w-4 mr-1" />History</Button>
          <Button size="sm" onClick={handleSaveVersion}><Save className="h-4 w-4 mr-1" />Save</Button>
        </div>
      </div>

      {/* Formula Bar */}
      {selectedCell && (
        <div className="border-b px-3 py-1.5 flex items-center gap-2 bg-muted/30">
          <Badge variant="outline" className="font-mono text-xs">{COL_LABELS[selectedCell.col]}{selectedCell.row + 1}</Badge>
          <Input
            className="h-7 text-sm font-mono"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleCellSave}
            onKeyDown={e => { if (e.key === 'Enter') handleCellSave(); }}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {/* Spreadsheet Grid */}
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              <th className="border px-2 py-1 w-10 text-center text-xs text-muted-foreground">#</th>
              {Array.from({ length: COLS }).map((_, c) => (
                <th key={c} className="border px-2 py-1 text-center text-xs font-medium text-muted-foreground min-w-[100px]">{COL_LABELS[c]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }).map((_, r) => (
              <tr key={r} className="hover:bg-muted/20">
                <td className="border px-2 py-1 text-center text-xs text-muted-foreground bg-muted/30">{r + 1}</td>
                {Array.from({ length: COLS }).map((_, c) => {
                  const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                  return (
                    <td
                      key={c}
                      className={`border px-2 py-1 cursor-cell text-xs ${getCellStyle(r, c)} ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                      onClick={() => handleCellClick(r, c)}
                    >
                      {getCellValue(r, c)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet Tabs */}
      <div className="border-t px-3 py-1.5 flex items-center gap-2 bg-muted/30">
        {sheets.map(s => (
          <Button
            key={s.id}
            variant={currentSheet?.id === s.id ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveSheetId(s.id)}
          >{s.name}</Button>
        ))}
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleAddSheet}><Plus className="h-3 w-3 mr-1" />Add Sheet</Button>
      </div>

      {/* Scenario Dialog */}
      <Dialog open={showScenarioDialog} onOpenChange={setShowScenarioDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Scenario</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={scenarioForm.name} onChange={e => setScenarioForm(p => ({ ...p, name: e.target.value }))} placeholder="Optimistic Q4" /></div>
            <div><Label>Type</Label>
              <Select value={scenarioForm.scenario_type} onValueChange={v => setScenarioForm(p => ({ ...p, scenario_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="optimistic">Optimistic</SelectItem>
                  <SelectItem value="pessimistic">Pessimistic</SelectItem>
                  <SelectItem value="what-if">What-If</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={scenarioForm.description} onChange={e => setScenarioForm(p => ({ ...p, description: e.target.value }))} /></div>
            <Button onClick={handleCreateScenario} className="w-full">Create Scenario</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
