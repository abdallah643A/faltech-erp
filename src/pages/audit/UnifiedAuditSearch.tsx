import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnifiedAuditSearch } from "@/hooks/useUnifiedAuditSearch";
import { Search, Download, FileSearch } from "lucide-react";

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "ecm_document", label: "ECM Documents" },
  { value: "signature", label: "Signatures" },
  { value: "acct_rule", label: "Accounting Rules" },
  { value: "lc", label: "Letters of Credit" },
  { value: "workflow_rule", label: "Workflow Rules" },
];

export default function UnifiedAuditSearch() {
  const [source, setSource] = useState("");
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [text, setText] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: rows = [], isLoading, refetch } = useUnifiedAuditSearch({
    source: source && source !== 'all' ? source : undefined,
    actor: actor || undefined,
    action: action || undefined,
    text: text || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const exportCsv = () => {
    const header = ["When", "Source", "Action", "Actor", "Entity", "Source ID"];
    const lines = rows.map((r: any) => [
      r.at, r.source, r.action ?? '', r.actor ?? '', r.entity_id ?? '', r.source_id ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-search-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSearch className="h-5 w-5" /> Unified Audit Search</h1>
          <p className="text-sm text-muted-foreground">Cross-module audit trail search across ECM, signatures, rules, LC, and workflows.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Select value={source || 'all'} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {SOURCES.filter(s => s.value).map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Actor" value={actor} onChange={(e) => setActor(e.target.value)} />
            <Input placeholder="Action" value={action} onChange={(e) => setAction(e.target.value)} />
            <Input placeholder="Search payload..." value={text} onChange={(e) => setText(e.target.value)} />
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => refetch()} size="sm"><Search className="h-3 w-3 mr-1" /> Search</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left px-4 py-2 font-medium">When</th>
                <th className="text-left px-4 py-2 font-medium">Source</th>
                <th className="text-left px-4 py-2 font-medium">Action</th>
                <th className="text-left px-4 py-2 font-medium">Actor</th>
                <th className="text-left px-4 py-2 font-medium">Entity</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No matching audit records</td></tr>
              ) : rows.map((r: any) => (
                <tr key={`${r.source}-${r.source_id}`} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.at).toLocaleString()}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{r.source}</Badge></td>
                  <td className="px-4 py-2 text-xs">{r.action || '—'}</td>
                  <td className="px-4 py-2 text-xs">{r.actor || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.entity_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
