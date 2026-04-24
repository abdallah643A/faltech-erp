import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useOcrJobs, useRunOcrWorker } from "@/hooks/useGovernanceSuite";
import { ScanLine, Play, RefreshCw, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const statusBadge: Record<string, string> = {
  queued: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  completed: "bg-green-500/15 text-green-700 dark:text-green-300",
  failed: "bg-destructive/15 text-destructive",
};

export default function OcrIngestionPage() {
  const { data: jobs = [], refetch, isFetching } = useOcrJobs();
  const run = useRunOcrWorker();

  const queued = jobs.filter((j: any) => j.status === "queued").length;
  const processing = jobs.filter((j: any) => j.status === "processing").length;
  const completed = jobs.filter((j: any) => j.status === "completed").length;
  const failed = jobs.filter((j: any) => j.status === "failed").length;
  const successRate = jobs.length ? Math.round((completed / jobs.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ScanLine /> OCR Ingestion</h1>
          <p className="text-sm text-muted-foreground">Async background OCR queue powered by Lovable AI vision.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            <Play className="w-4 h-4 mr-2" /> Run worker now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Queued</div><div className="text-2xl font-bold">{queued}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Processing</div><div className="text-2xl font-bold">{processing}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-bold text-green-600">{completed}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Failed</div><div className="text-2xl font-bold text-destructive">{failed}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Success rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Progress value={successRate} className="flex-1" />
            <span className="font-bold">{successRate}%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent OCR jobs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lang</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No OCR jobs yet</TableCell></TableRow>
              )}
              {jobs.map((j: any) => (
                <TableRow key={j.id}>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {j.status === "completed" ? <CheckCircle2 className="w-3 h-3 text-green-600" /> :
                       j.status === "failed" ? <AlertCircle className="w-3 h-3 text-destructive" /> :
                       <FileText className="w-3 h-3 text-muted-foreground" />}
                      <span className="truncate max-w-[280px]">{j.file_name ?? j.file_path}</span>
                    </div>
                    {j.error_message && <div className="text-xs text-destructive mt-1">{j.error_message}</div>}
                  </TableCell>
                  <TableCell><Badge className={statusBadge[j.status]}>{j.status}</Badge></TableCell>
                  <TableCell className="text-xs">{j.language_detected ?? "—"}</TableCell>
                  <TableCell className="text-xs">{j.confidence_score ? `${j.confidence_score}%` : "—"}</TableCell>
                  <TableCell className="text-xs">{j.page_count ?? "—"}</TableCell>
                  <TableCell className="text-xs">{j.processing_time_ms ? `${j.processing_time_ms}ms` : "—"}</TableCell>
                  <TableCell className="text-xs">{format(new Date(j.created_at), "MMM dd HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
