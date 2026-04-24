import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useDataQuality, QualityModule, DuplicateGroup, IncompleteRecord, FormatIssue } from '@/hooks/useDataQuality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShieldCheck, Users, Package, Building2, FolderKanban, AlertTriangle,
  Merge, Search, CheckCircle2, XCircle, BarChart3, Loader2, Mail, Phone,
  FileWarning, Layers, TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MODULES: { key: QualityModule; label: string; icon: typeof Users }[] = [
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'vendors', label: 'Vendors', icon: Building2 },
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'items', label: 'Items', icon: Package },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
];

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
  const stroke = score >= 80 ? 'stroke-green-500' : score >= 60 ? 'stroke-yellow-500' : 'stroke-red-500';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={4} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={4}
          className={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <span className={`absolute text-sm font-bold ${color}`}>{score}%</span>
    </div>
  );
}

function ModuleQualityCard({ module }: { module: QualityModule }) {
  const { data, isLoading } = useDataQuality(module);
  const cfg = MODULES.find(m => m.key === module)!;
  const Icon = cfg.icon;

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-3">
          <ScoreRing score={data.overallScore} size={60} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">{cfg.label}</span>
              <Badge variant="outline" className="text-[10px]">{data.totalRecords} records</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.duplicates.length > 0 && (
                <Badge variant="destructive" className="text-[10px] gap-0.5">
                  <Merge className="h-2.5 w-2.5" /> {data.duplicates.length} duplicates
                </Badge>
              )}
              {data.incompleteRecords.length > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  <FileWarning className="h-2.5 w-2.5" /> {data.incompleteRecords.length} incomplete
                </Badge>
              )}
              {data.formatIssues.length > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  <AlertTriangle className="h-2.5 w-2.5" /> {data.formatIssues.length} format issues
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DuplicatesPanel({ module }: { module: QualityModule }) {
  const { data, isLoading } = useDataQuality(module);
  const [mergeDialog, setMergeDialog] = useState<DuplicateGroup | null>(null);
  const [keepIdx, setKeepIdx] = useState(0);
  const { toast } = useToast();

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data || data.duplicates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
        <p className="font-medium">No duplicates detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">{data.duplicates.length} potential duplicate groups found</p>
      {data.duplicates.map((group, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex -space-x-2">
              {group.names.slice(0, 3).map((n, j) => (
                <div key={j} className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background">
                  <span className="text-[10px] font-bold text-primary">{n.charAt(0)}</span>
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{group.names.join(' / ')}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{group.reason}</Badge>
                <span className="text-[10px] text-muted-foreground">Score: {group.score}%</span>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0"
            onClick={() => { setMergeDialog(group); setKeepIdx(0); }}>
            <Merge className="h-3 w-3" /> Review
          </Button>
        </div>
      ))}

      <Dialog open={!!mergeDialog} onOpenChange={() => setMergeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Merge className="h-5 w-5" /> Merge Suggestion</DialogTitle>
            <DialogDescription>Select the primary record to keep. Others can be merged into it.</DialogDescription>
          </DialogHeader>
          {mergeDialog && (
            <div className="space-y-2">
              {mergeDialog.names.map((name, idx) => (
                <div key={idx}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${keepIdx === idx ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setKeepIdx(idx)}>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={keepIdx === idx} />
                    <span className="text-sm font-medium flex-1">{name}</span>
                    {keepIdx === idx && <Badge className="text-[10px]">Primary</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              toast({ title: 'Merge Initiated', description: 'Records queued for merge review by admin.' });
              setMergeDialog(null);
            }} className="gap-1"><Merge className="h-4 w-4" /> Queue Merge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IncompletePanel({ module }: { module: QualityModule }) {
  const { data, isLoading } = useDataQuality(module);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data || data.incompleteRecords.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
        <p className="font-medium">All records are complete</p>
      </div>
    );
  }

  const sorted = [...data.incompleteRecords].sort((a, b) => a.completeness - b.completeness);

  return (
    <ScrollArea className="max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Record</TableHead>
            <TableHead>Completeness</TableHead>
            <TableHead>Missing Fields</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.slice(0, 50).map(rec => (
            <TableRow key={rec.id}>
              <TableCell className="font-medium text-sm">{rec.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Progress value={rec.completeness} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-8">{rec.completeness}%</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {rec.missingFields.map(f => (
                    <Badge key={f} variant="outline" className="text-[10px] text-red-600 border-red-200">{f}</Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {sorted.length > 50 && (
        <p className="text-xs text-muted-foreground text-center py-2">Showing 50 of {sorted.length} records</p>
      )}
    </ScrollArea>
  );
}

function FormatPanel({ module }: { module: QualityModule }) {
  const { data, isLoading } = useDataQuality(module);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data || data.formatIssues.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
        <p className="font-medium">No format issues detected</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Record</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Issue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.formatIssues.slice(0, 50).map((issue, i) => (
            <TableRow key={`${issue.id}-${i}`}>
              <TableCell className="font-medium text-sm">{issue.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] gap-0.5">
                  {issue.field === 'email' ? <Mail className="h-2.5 w-2.5" /> : <Phone className="h-2.5 w-2.5" />}
                  {issue.field}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground font-mono text-xs">{issue.value}</TableCell>
              <TableCell>
                <Badge variant="destructive" className="text-[10px]">{issue.issue}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function StatusPanel({ module }: { module: QualityModule }) {
  const { data, isLoading } = useDataQuality(module);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Status distribution across {data.totalRecords} records</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.statusAnomalies.map(sa => (
          <Card key={sa.status} className={`${!sa.expected ? 'border-orange-300 dark:border-orange-700' : ''}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{sa.status}</span>
                {!sa.expected && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
              </div>
              <p className="text-2xl font-bold mt-1">{sa.count}</p>
              {!sa.expected && <p className="text-[10px] text-orange-600">Non-standard status</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DataQualityCenter() {
  const { t } = useLanguage();
  const { activeCompany, activeCompanyId } = useActiveCompany();
  const [activeModule, setActiveModule] = useState<QualityModule>('customers');

  if (!activeCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-4" />
        <h2 className="text-lg font-semibold">No Company Selected</h2>
        <p className="text-sm">Please select a company to view data quality analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Data Quality Center</h1>
          <p className="text-sm text-muted-foreground">
            Analyzing data for <span className="font-medium text-foreground">{activeCompany?.company_name || 'Selected Company'}</span>
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {MODULES.map(m => (
          <div key={m.key} className="cursor-pointer" onClick={() => setActiveModule(m.key)}>
            <ModuleQualityCard module={m.key} />
          </div>
        ))}
      </div>

      {/* Module Detail */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {(() => { const Icon = MODULES.find(m => m.key === activeModule)!.icon; return <Icon className="h-5 w-5 text-primary" />; })()}
            <CardTitle className="text-lg">{MODULES.find(m => m.key === activeModule)!.label} Quality Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="duplicates" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="duplicates" className="gap-1 text-xs">
                <Merge className="h-3.5 w-3.5" /> Duplicates
              </TabsTrigger>
              <TabsTrigger value="incomplete" className="gap-1 text-xs">
                <FileWarning className="h-3.5 w-3.5" /> Incomplete
              </TabsTrigger>
              <TabsTrigger value="format" className="gap-1 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" /> Format Issues
              </TabsTrigger>
              <TabsTrigger value="status" className="gap-1 text-xs">
                <Layers className="h-3.5 w-3.5" /> Status Usage
              </TabsTrigger>
            </TabsList>
            <TabsContent value="duplicates"><DuplicatesPanel module={activeModule} /></TabsContent>
            <TabsContent value="incomplete"><IncompletePanel module={activeModule} /></TabsContent>
            <TabsContent value="format"><FormatPanel module={activeModule} /></TabsContent>
            <TabsContent value="status"><StatusPanel module={activeModule} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
