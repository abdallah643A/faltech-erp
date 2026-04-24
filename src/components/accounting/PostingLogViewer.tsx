import { useState } from 'react';
import { useGLAdvancedRules } from '@/hooks/useGLAdvancedRules';
import { ACCOUNT_TYPE_LABELS } from '@/services/sapPostingEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Eye, FileText, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PostingLogViewer() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { postingLogs, getPostingLogLines } = useGLAdvancedRules();
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [logLines, setLogLines] = useState<any[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const viewLog = async (log: any) => {
    setSelectedLog(log);
    const lines = await getPostingLogLines(log.id);
    setLogLines(lines);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isAr ? 'سجل الترحيلات' : 'Posting Log & Account Trace'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'عرض سجل كامل لكل ترحيل مع تفسير مصدر كل حساب' : 'Full audit trail of every posting with account source explanation'}
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{isAr ? 'نوع المستند' : 'Document'}</TableHead>
                <TableHead>{isAr ? 'رقم المستند' : 'Doc #'}</TableHead>
                <TableHead>{isAr ? 'مصدر الحساب' : 'Account Source'}</TableHead>
                <TableHead>{isAr ? 'مدين' : 'Debit'}</TableHead>
                <TableHead>{isAr ? 'دائن' : 'Credit'}</TableHead>
                <TableHead>{isAr ? 'متوازن' : 'Balanced'}</TableHead>
                <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postingLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant={log.status === 'posted' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}>{log.status}</Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline">{log.document_type}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{log.document_number || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={log.account_source === 'advanced_rule' ? 'default' : 'secondary'}>{log.account_source || 'default'}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{Number(log.total_debit).toFixed(2)}</TableCell>
                  <TableCell className="font-mono">{Number(log.total_credit).toFixed(2)}</TableCell>
                  <TableCell>{log.is_balanced ? '✓' : '✗'}</TableCell>
                  <TableCell className="text-xs">{log.created_at ? format(new Date(log.created_at), 'yyyy-MM-dd HH:mm') : ''}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => viewLog(log)}><Eye className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {postingLogs.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No posting logs yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Posting Trace - {selectedLog?.document_type} #{selectedLog?.document_number || ''}</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardContent className="pt-4 grid grid-cols-3 gap-4 text-sm">
                  <div><strong>Account Source:</strong> <Badge>{selectedLog.account_source}</Badge></div>
                  <div><strong>Used Defaults:</strong> {selectedLog.used_defaults ? 'Yes' : 'No'}</div>
                  <div><strong>Status:</strong> <Badge variant={selectedLog.status === 'posted' ? 'default' : 'destructive'}>{selectedLog.status}</Badge></div>
                </CardContent>
              </Card>

              {/* Rationale */}
              {selectedLog.posting_rationale && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-1">Posting Rationale</p>
                    <p className="text-sm text-muted-foreground">{selectedLog.posting_rationale}</p>
                  </CardContent>
                </Card>
              )}

              {/* Resolution Path */}
              {selectedLog.resolution_path && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Resolution Steps</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(selectedLog.resolution_path as any[]).map((step: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="shrink-0">Step {step.step}</Badge>
                        <div>
                          <p className="font-medium">{step.action}</p>
                          <p className="text-xs text-muted-foreground">{step.details}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Candidate Rules */}
              {selectedLog.candidate_rules && (selectedLog.candidate_rules as any[]).length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Rule Competition ({(selectedLog.candidate_rules as any[]).length} evaluated)</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedLog.candidate_rules as any[]).map((c: any, i: number) => (
                          <TableRow key={i} className={c.status === 'winner' ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                            <TableCell>
                              <div className="text-sm font-medium">{c.rule_name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{c.rule_code}</div>
                            </TableCell>
                            <TableCell className="font-mono">{c.priority}</TableCell>
                            <TableCell className="font-mono">{c.match_score}</TableCell>
                            <TableCell>
                              <Badge variant={c.status === 'winner' ? 'default' : 'secondary'} className="text-xs">
                                {c.status === 'winner' ? '✓ Winner' : '✗ Rejected'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[250px]">{c.status === 'winner' ? 'Best match' : c.rejection_reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Config Snapshot */}
              {selectedLog.config_snapshot && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Account Configuration Snapshot (at posting time)</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      Captured: {(selectedLog.config_snapshot as any).snapshot_at ? format(new Date((selectedLog.config_snapshot as any).snapshot_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                      {' • '}{(selectedLog.config_snapshot as any).advanced_rules_count || 0} rules evaluated
                    </p>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {((selectedLog.config_snapshot as any).defaults || []).filter((d: any) => d.acct_code).map((d: any, i: number) => (
                        <div key={i} className="flex justify-between px-2 py-1 bg-muted/40 rounded">
                          <span className="text-muted-foreground">{ACCOUNT_TYPE_LABELS[d.account_type] || d.account_type}</span>
                          <span className="font-mono">{d.acct_code}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* JE Lines */}
              {logLines.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Journal Entry Lines</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Debit</TableHead>
                          <TableHead>Credit</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Why?</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logLines.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell>{l.line_order}</TableCell>
                            <TableCell className="font-mono">{l.acct_code}</TableCell>
                            <TableCell className="text-sm">{l.acct_name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{ACCOUNT_TYPE_LABELS[l.account_purpose] || l.account_purpose}</Badge></TableCell>
                            <TableCell className="font-mono">{l.side === 'debit' ? Number(l.amount).toFixed(2) : ''}</TableCell>
                            <TableCell className="font-mono">{l.side === 'credit' ? Number(l.amount).toFixed(2) : ''}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{l.account_source}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{l.source_details}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
