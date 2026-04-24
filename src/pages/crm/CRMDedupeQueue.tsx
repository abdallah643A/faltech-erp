import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDedupeCandidates, useScanForDuplicates, useDecideDuplicate } from "@/hooks/useCRMDedupe";
import { Users, Scan } from "lucide-react";

export default function CRMDedupeQueue() {
  const [status, setStatus] = useState("pending");
  const { data: rows = [], isLoading } = useDedupeCandidates(status);
  const scan = useScanForDuplicates();
  const decide = useDecideDuplicate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Lead Deduplication Queue</h1>
          <p className="text-sm text-muted-foreground">Review fuzzy-matched duplicate candidates and merge or dismiss.</p>
        </div>
        <div className="flex gap-2">
          {["pending","merged","dismissed","kept_both"].map((s) => (
            <Button key={s} variant={status===s?"default":"outline"} size="sm" onClick={()=>setStatus(s)}>{s}</Button>
          ))}
          <Button onClick={() => scan.mutate({ min_score: 0.6, limit: 500 })} disabled={scan.isPending}>
            <Scan className="h-4 w-4 mr-1" /> {scan.isPending ? "Scanning..." : "Scan now"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="border-b">
              <th className="text-left px-4 py-2 font-medium">Score</th>
              <th className="text-left px-4 py-2 font-medium">Master</th>
              <th className="text-left px-4 py-2 font-medium">Duplicate</th>
              <th className="text-left px-4 py-2 font-medium">Signals</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                : rows.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No candidates</td></tr>
                : rows.map((r:any) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2"><Badge>{Number(r.score).toFixed(0)}%</Badge></td>
                  <td className="px-4 py-2 font-mono text-xs">{r.master_partner_id?.slice(0,8)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.duplicate_partner_id?.slice(0,8)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{Object.keys(r.match_signals||{}).join(", ")}</td>
                  <td className="px-4 py-2 text-right">
                    {r.status === 'pending' && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={() => decide.mutate({ id: r.id, decision: 'merged', masterId: r.master_partner_id, dupId: r.duplicate_partner_id })}>Merge</Button>
                        <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.id, decision: 'kept_both' })}>Keep both</Button>
                        <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: r.id, decision: 'dismissed' })}>Dismiss</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
