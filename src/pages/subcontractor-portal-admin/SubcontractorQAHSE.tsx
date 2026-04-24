import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQASubmissions, useHSESubmissions } from "@/hooks/useSubcontractorPortal";
import { format } from "date-fns";

export default function SubcontractorQAHSE() {
  const { data: qa = [] } = useQASubmissions();
  const { data: hse = [] } = useHSESubmissions();

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Quality & HSE Submissions</h1>
        <p className="text-sm text-muted-foreground">Inspections, incidents, near-misses, toolbox talks from site teams.</p>
      </div>

      <Tabs defaultValue="qa">
        <TabsList>
          <TabsTrigger value="qa">QA / QC ({qa.length})</TabsTrigger>
          <TabsTrigger value="hse">HSE ({hse.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="qa">
          <Card>
            <CardHeader><CardTitle>Inspections</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Inspector</TableHead>
                  <TableHead>Location</TableHead><TableHead>Result</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {qa.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-xs">{format(new Date(q.submitted_at), "MMM d HH:mm")}</TableCell>
                      <TableCell>{q.inspection_type}</TableCell>
                      <TableCell>{q.inspector_name ?? "—"}</TableCell>
                      <TableCell>{q.location ?? "—"}</TableCell>
                      <TableCell>{q.result ? <Badge variant={q.result === "pass" ? "default" : "destructive"}>{q.result}</Badge> : "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{q.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {qa.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No QA submissions</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="hse">
          <Card>
            <CardHeader><CardTitle>HSE Reports</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead>
                  <TableHead>Title</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {hse.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{format(new Date(h.submitted_at), "MMM d HH:mm")}</TableCell>
                      <TableCell>{h.submission_type}</TableCell>
                      <TableCell>{h.severity ? <Badge variant={h.severity === "high" || h.severity === "critical" ? "destructive" : "secondary"}>{h.severity}</Badge> : "—"}</TableCell>
                      <TableCell>{h.title}</TableCell>
                      <TableCell>{h.location ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{h.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {hse.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No HSE reports</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
