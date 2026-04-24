import { useState } from 'react';
import { useDedupCandidates, useDedupRules, useResolveDedup } from '@/hooks/useMDMSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GitMerge, Check, X } from 'lucide-react';

export default function MDMDedupPage() {
  const [tab, setTab] = useState<'pending' | 'merged' | 'rejected' | 'rules'>('pending');
  const candidates = useDedupCandidates(tab === 'rules' ? 'pending' : tab);
  const rules = useDedupRules();
  const resolve = useResolveDedup();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GitMerge className="h-6 w-6" />Deduplication</h1>
        <p className="text-muted-foreground">Detect and resolve duplicate business partners.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="merged">Merged</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="rules">Match Rules</TabsTrigger>
        </TabsList>

        {(['pending', 'merged', 'rejected'] as const).map((s) => (
          <TabsContent key={s} value={s}>
            <Card>
              <CardHeader><CardTitle className="text-sm">{s.charAt(0).toUpperCase() + s.slice(1)} Candidates</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>BP A</TableHead>
                      <TableHead>BP B</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Matched Fields</TableHead>
                      {s === 'pending' && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(candidates.data ?? []).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.bp_a_id}</TableCell>
                        <TableCell className="font-mono text-xs">{c.bp_b_id}</TableCell>
                        <TableCell><Badge variant={c.match_score >= 0.9 ? 'destructive' : 'default'}>{Number(c.match_score).toFixed(2)}</Badge></TableCell>
                        <TableCell className="text-xs">{JSON.stringify(c.matched_fields)}</TableCell>
                        {s === 'pending' && (
                          <TableCell className="space-x-2">
                            <Button size="sm" onClick={() => resolve.mutate({ id: c.id, action: 'merged', master_bp_id: c.bp_a_id })}>
                              <Check className="h-3 w-3 mr-1" />Merge → A
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: c.id, action: 'rejected' })}>
                              <X className="h-3 w-3 mr-1" />Reject
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {(candidates.data ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">None.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="rules">
          <Card>
            <CardHeader><CardTitle className="text-sm">Active Match Rules</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead><TableHead>Field</TableHead><TableHead>Type</TableHead>
                    <TableHead>Threshold</TableHead><TableHead>Weight</TableHead><TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rules.data ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.rule_name}</TableCell>
                      <TableCell><Badge variant="secondary">{r.field_name}</Badge></TableCell>
                      <TableCell>{r.match_type}</TableCell>
                      <TableCell>{r.similarity_threshold}</TableCell>
                      <TableCell>{r.weight}</TableCell>
                      <TableCell><Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Yes' : 'No'}</Badge></TableCell>
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
