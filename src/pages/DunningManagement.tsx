import { useState } from 'react';
import { useDunningLevels, useDunningRuns, useDunningLetters } from '@/hooks/useDunning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle, Mail, DollarSign, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DunningManagement() {
  const { t } = useLanguage();
  const { levels, isLoading: levelsLoading, createLevel } = useDunningLevels();
  const { runs, isLoading: runsLoading, createRun, updateRun } = useDunningRuns();
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const { letters } = useDunningLetters(selectedRun || undefined);
  const [levelFormOpen, setLevelFormOpen] = useState(false);
  const [runFormOpen, setRunFormOpen] = useState(false);
  const [levelForm, setLevelForm] = useState({ level_number: 1, name: '', days_overdue: 30, fee_amount: 0, interest_rate: 0 });
  const [runForm, setRunForm] = useState({ notes: '' });

  const stats = {
    totalRuns: runs?.length || 0,
    totalLetters: letters?.length || 0,
    totalOverdue: letters?.reduce((s, l) => s + (l.total_overdue || 0), 0) || 0,
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dunning Management</h1>
          <p className="text-muted-foreground">Automated collection letters for overdue invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setLevelForm({ level_number: (levels?.length || 0) + 1, name: '', days_overdue: 30, fee_amount: 0, interest_rate: 0 }); setLevelFormOpen(true); }}>
            <Settings className="h-4 w-4 mr-2" />Configure Levels
          </Button>
          <Button onClick={() => { setRunForm({ notes: '' }); setRunFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Dunning Run
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.totalRuns}</p><p className="text-xs text-muted-foreground">Dunning Runs</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{stats.totalLetters}</p><p className="text-xs text-muted-foreground">Letters Generated</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><DollarSign className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{stats.totalOverdue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Overdue (SAR)</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="runs">
        <TabsList><TabsTrigger value="runs">Dunning Runs</TabsTrigger><TabsTrigger value="levels">Dunning Levels</TabsTrigger><TabsTrigger value="letters" disabled={!selectedRun}>Letters</TabsTrigger></TabsList>

        <TabsContent value="runs">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Run #</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>Customers</TableHead>
                <TableHead>Letters</TableHead><TableHead>Total Amount</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {runsLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow> :
                 (runs || []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No dunning runs</TableCell></TableRow> :
                 (runs || []).map(run => (
                  <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRun(run.id)}>
                    <TableCell className="font-mono text-sm">{run.run_number}</TableCell>
                    <TableCell>{format(new Date(run.run_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{run.total_customers}</TableCell>
                    <TableCell>{run.total_letters}</TableCell>
                    <TableCell>{(run.total_amount || 0).toLocaleString()} SAR</TableCell>
                    <TableCell><Badge variant={run.status === 'sent' ? 'default' : run.status === 'completed' ? 'secondary' : 'outline'}>{run.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="levels">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Level</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Days Overdue</TableHead>
                <TableHead>Fee</TableHead><TableHead>Interest %</TableHead><TableHead>{t('common.active')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(levels || []).map(level => (
                  <TableRow key={level.id}>
                    <TableCell className="font-bold">{level.level_number}</TableCell>
                    <TableCell>{level.name}</TableCell>
                    <TableCell>{level.days_overdue} days</TableCell>
                    <TableCell>{(level.fee_amount || 0).toLocaleString()} SAR</TableCell>
                    <TableCell>{level.interest_rate}%</TableCell>
                    <TableCell><Badge variant={level.is_active ? 'default' : 'secondary'}>{level.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="letters">
          <Card><CardHeader><CardTitle>Dunning Letters</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Level</TableHead><TableHead>Overdue Amount</TableHead>
                <TableHead>Fee</TableHead><TableHead>Interest</TableHead><TableHead>Total Due</TableHead>
                <TableHead>Days Overdue</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(letters || []).map(letter => (
                  <TableRow key={letter.id}>
                    <TableCell><div><p className="font-medium">{letter.customer_name}</p><p className="text-xs text-muted-foreground">{letter.customer_code}</p></div></TableCell>
                    <TableCell><Badge variant="outline">Level {letter.dunning_level}</Badge></TableCell>
                    <TableCell>{(letter.total_overdue || 0).toLocaleString()}</TableCell>
                    <TableCell>{(letter.fee_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>{(letter.interest_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-bold">{(letter.total_due || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-destructive font-medium">{letter.days_overdue} days</TableCell>
                    <TableCell><Badge variant={letter.status === 'sent' ? 'default' : 'outline'}>{letter.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Level Form */}
      <Dialog open={levelFormOpen} onOpenChange={setLevelFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Dunning Level</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Level #</Label><Input type="number" value={levelForm.level_number} onChange={e => setLevelForm({...levelForm, level_number: +e.target.value})} /></div>
              <div><Label>{t('common.name')}</Label><Input value={levelForm.name} onChange={e => setLevelForm({...levelForm, name: e.target.value})} placeholder="Friendly Reminder" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Days Overdue</Label><Input type="number" value={levelForm.days_overdue} onChange={e => setLevelForm({...levelForm, days_overdue: +e.target.value})} /></div>
              <div><Label>Fee (SAR)</Label><Input type="number" value={levelForm.fee_amount} onChange={e => setLevelForm({...levelForm, fee_amount: +e.target.value})} /></div>
              <div><Label>Interest %</Label><Input type="number" value={levelForm.interest_rate} onChange={e => setLevelForm({...levelForm, interest_rate: +e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelFormOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!levelForm.name} onClick={() => { createLevel.mutate(levelForm); setLevelFormOpen(false); }}>Add Level</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Form */}
      <Dialog open={runFormOpen} onOpenChange={setRunFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Dunning Run</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('common.notes')}</Label><Input value={runForm.notes} onChange={e => setRunForm({...runForm, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => { createRun.mutate(runForm); setRunFormOpen(false); }}>Execute Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
