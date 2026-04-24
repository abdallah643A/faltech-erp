import { useState } from 'react';
import { useBackgroundJobs } from '@/hooks/useBackgroundJobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Eye, Activity, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pending' },
  running: { icon: Loader2, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: 'Running' },
  completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Failed' },
  cancelled: { icon: AlertTriangle, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', label: 'Cancelled' },
};

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function BackgroundJobMonitor() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const { data: jobs = [], isLoading } = useBackgroundJobs(statusFilter);

  const summary = {
    total: jobs.length,
    running: jobs.filter(j => j.status === 'running').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  };

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Background Job Monitor</h1>
        <p className="text-muted-foreground">Track imports, syncs, report generation, and other background operations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Jobs', value: summary.total, icon: Activity, color: 'text-foreground' },
          { label: 'Running', value: summary.running, icon: Loader2, color: 'text-blue-500' },
          { label: 'Completed', value: summary.completed, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Failed', value: summary.failed, icon: XCircle, color: 'text-red-500' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div>
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" /> Auto-refresh 5s
        </div>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Job Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Started</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : jobs.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No background jobs found</TableCell></TableRow>
              ) : jobs.map(job => {
                const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                const Icon = sc.icon;
                return (
                  <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedJob(job)}>
                    <TableCell>
                      <Badge className={`${sc.color} gap-1 text-[10px]`}>
                        <Icon className={`h-3 w-3 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-xs">{job.job_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{job.entity_name || '—'}</TableCell>
                    <TableCell className="w-[120px]">
                      <Progress value={job.progress} className="h-1.5" />
                      <span className="text-[10px] text-muted-foreground">{job.progress}%</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {job.processed_items}/{job.total_items}
                      {job.failed_items > 0 && <span className="text-red-500 ml-1">({job.failed_items} failed)</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDuration(job.duration_ms)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.started_at ? format(new Date(job.started_at), 'dd MMM HH:mm') : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Type:</span> {selectedJob.job_type}</div>
                  <div><span className="text-muted-foreground">Entity:</span> {selectedJob.entity_name || '—'}</div>
                  <div><span className="text-muted-foreground">Status:</span> {selectedJob.status}</div>
                  <div><span className="text-muted-foreground">Progress:</span> {selectedJob.progress}%</div>
                  <div><span className="text-muted-foreground">Total:</span> {selectedJob.total_items}</div>
                  <div><span className="text-muted-foreground">Processed:</span> {selectedJob.processed_items}</div>
                  <div><span className="text-muted-foreground">Failed:</span> {selectedJob.failed_items}</div>
                  <div><span className="text-muted-foreground">Skipped:</span> {selectedJob.skipped_items}</div>
                  <div><span className="text-muted-foreground">Duration:</span> {formatDuration(selectedJob.duration_ms)}</div>
                  <div><span className="text-muted-foreground">Started:</span> {selectedJob.started_at ? format(new Date(selectedJob.started_at), 'PPpp') : '—'}</div>
                </div>
                {selectedJob.error_message && (
                  <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">Error</div>
                    <pre className="text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap">{selectedJob.error_message}</pre>
                  </div>
                )}
                {selectedJob.result_summary && (
                  <div className="p-3 rounded-md bg-muted/50 border">
                    <div className="font-medium text-xs mb-1">Result Summary</div>
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selectedJob.result_summary, null, 2)}</pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
