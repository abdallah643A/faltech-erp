import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePredictiveSignals, usePredictiveRuns, useRunPredictiveEngine, useResolveSignal } from '@/hooks/useAssetPredictive';
import { Activity, AlertTriangle, Bot, Play } from 'lucide-react';
import { format } from 'date-fns';

const sevColors: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-700 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  low: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
};

export default function PredictiveMaintenancePage() {
  const { data: signals = [], isLoading } = usePredictiveSignals('open');
  const { data: runs = [] } = usePredictiveRuns();
  const runEngine = useRunPredictiveEngine();
  const resolve = useResolveSignal();

  const counts = {
    critical: signals.filter(s => s.severity === 'critical').length,
    high: signals.filter(s => s.severity === 'high').length,
    medium: signals.filter(s => s.severity === 'medium').length,
    ai: signals.filter(s => s.detection_source === 'ai').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'IBM Plex Sans' }}>
            <Activity className="h-6 w-6" style={{ color: '#0066cc' }} /> Predictive Maintenance
          </h1>
          <p className="text-sm text-muted-foreground">Rule-based threshold scanning with Lovable AI confidence escalation</p>
        </div>
        <Button onClick={() => runEngine.mutate()} disabled={runEngine.isPending} style={{ backgroundColor: '#0066cc' }}>
          <Play className="h-4 w-4 mr-1" /> {runEngine.isPending ? 'Scanning…' : 'Run Predictive Scan'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><AlertTriangle className="h-5 w-5 text-red-600 mb-1" /><div className="text-2xl font-bold">{counts.critical}</div><div className="text-xs text-muted-foreground">Critical</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-orange-600">{counts.high}</div><div className="text-xs text-muted-foreground">High</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-amber-600">{counts.medium}</div><div className="text-xs text-muted-foreground">Medium</div></CardContent></Card>
        <Card><CardContent className="pt-4"><Bot className="h-5 w-5 text-purple-600 mb-1" /><div className="text-2xl font-bold">{counts.ai}</div><div className="text-xs text-muted-foreground">AI-flagged</div></CardContent></Card>
      </div>

      <Tabs defaultValue="signals">
        <TabsList>
          <TabsTrigger value="signals">Open Signals</TabsTrigger>
          <TabsTrigger value="runs">Scan History</TabsTrigger>
        </TabsList>
        <TabsContent value="signals">
          <Card>
            <CardHeader><CardTitle className="text-base">Active Predictive Signals</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Severity</TableHead><TableHead>Signal</TableHead><TableHead>Source</TableHead><TableHead>Confidence</TableHead><TableHead>Recommended Action</TableHead><TableHead>Detected</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : signals.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No open signals — run a scan to detect risks.</TableCell></TableRow>
                  ) : signals.map(s => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${sevColors[s.severity]}`}>{s.severity}</Badge></TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{s.title}</div>
                        {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{s.detection_source === 'ai' ? <><Bot className="h-3 w-3 mr-1 inline" />AI</> : 'Rule'}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{Number(s.confidence_score).toFixed(0)}%</TableCell>
                      <TableCell className="text-xs">{s.recommended_action || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'MMM d, HH:mm')}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: s.id })}>Resolve</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="runs">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Scans</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Started</TableHead><TableHead>Type</TableHead><TableHead>Assets</TableHead><TableHead>Signals</TableHead><TableHead>AI Calls</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {runs.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.started_at), 'PPp')}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.run_type}</Badge></TableCell>
                      <TableCell>{r.assets_scanned}</TableCell>
                      <TableCell>{r.signals_created}</TableCell>
                      <TableCell>{r.ai_calls}</TableCell>
                      <TableCell className="text-xs">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '-'}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
