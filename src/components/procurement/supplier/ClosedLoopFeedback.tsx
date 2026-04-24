import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Clock, MessageCircle, Shield, ArrowUpCircle, XCircle } from 'lucide-react';
import { useSupplierEscalations, useFeedbackResponses } from '@/hooks/useSupplierFeedback';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  action_taken: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-muted text-muted-foreground',
};

const severityColors: Record<string, string> = {
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const typeIcons: Record<string, any> = {
  critical_issue: AlertTriangle,
  safety: Shield,
  repeated_failures: ArrowUpCircle,
  threshold_breach: XCircle,
};

export function ClosedLoopFeedback() {
  const { escalations, isLoading, updateEscalation } = useSupplierEscalations();
  const { user } = useAuth();
  const [selectedEsc, setSelectedEsc] = useState<any>(null);
  const [showResolve, setShowResolve] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [responseForm, setResponseForm] = useState({ feedback_id: '', vendor_name: '', response_type: 'acknowledgment', response_text: '' });
  const { responses, addResponse } = useFeedbackResponses(responseForm.feedback_id || undefined);

  const openCount = escalations.filter(e => e.status === 'open').length;
  const acknowledgedCount = escalations.filter(e => e.status === 'acknowledged').length;
  const resolvedCount = escalations.filter(e => e.status === 'resolved' || e.status === 'closed').length;
  const safetyCount = escalations.filter(e => e.escalation_type === 'safety' && e.status !== 'closed').length;

  const handleStatusUpdate = async (id: string, status: string) => {
    const updates: any = { id, status };
    if (status === 'resolved') {
      updates.resolved_by = user?.id;
      updates.resolved_at = new Date().toISOString();
      updates.resolution_notes = resolveNotes;
    }
    await updateEscalation.mutateAsync(updates);
    setShowResolve(false);
    setResolveNotes('');
    setSelectedEsc(null);
  };

  const handleAddResponse = async () => {
    await addResponse.mutateAsync({
      feedback_id: responseForm.feedback_id,
      vendor_name: responseForm.vendor_name,
      response_type: responseForm.response_type,
      response_text: responseForm.response_text,
      responded_by: 'Supplier',
    });
    setShowResponse(false);
    setResponseForm({ feedback_id: '', vendor_name: '', response_type: 'acknowledgment', response_text: '' });
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
          <p className="text-2xl font-bold text-red-600">{openCount}</p>
          <p className="text-xs text-muted-foreground">Open Escalations</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <p className="text-2xl font-bold text-blue-600">{acknowledgedCount}</p>
          <p className="text-xs text-muted-foreground">Acknowledged</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Shield className="h-5 w-5 mx-auto mb-1 text-orange-500" />
          <p className="text-2xl font-bold text-orange-600">{safetyCount}</p>
          <p className="text-xs text-muted-foreground">Active Safety</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </CardContent></Card>
      </div>

      {/* Escalation Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Escalation Log & Closed-Loop Tracking</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-center py-4 text-muted-foreground text-sm">Loading...</p> :
          escalations.length === 0 ? <p className="text-center py-4 text-muted-foreground text-sm">No escalations. Critical/safety feedback is auto-escalated.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Escalated By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escalations.map(esc => {
                    const Icon = typeIcons[esc.escalation_type] || AlertTriangle;
                    return (
                      <TableRow key={esc.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Icon className="h-3 w-3" />
                            <span className="text-xs">{esc.escalation_type?.replace(/_/g, ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge className={severityColors[esc.severity] || ''}>{esc.severity}</Badge></TableCell>
                        <TableCell className="font-medium text-sm">{esc.vendor_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">{esc.title}</TableCell>
                        <TableCell className="text-xs">{esc.escalated_by_name || '-'}</TableCell>
                        <TableCell className="text-xs">{format(new Date(esc.created_at), 'dd/MM/yyyy')}</TableCell>
                        <TableCell><Badge className={statusColors[esc.status] || ''}>{esc.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {esc.status === 'open' && (
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => handleStatusUpdate(esc.id, 'acknowledged')}>
                                Acknowledge
                              </Button>
                            )}
                            {(esc.status === 'open' || esc.status === 'acknowledged' || esc.status === 'action_taken') && (
                              <Button size="sm" variant="outline" className="text-xs h-7 text-green-600"
                                onClick={() => { setSelectedEsc(esc); setShowResolve(true); }}>
                                Resolve
                              </Button>
                            )}
                            {esc.feedback_id && (
                              <Button size="sm" variant="ghost" className="text-xs h-7"
                                onClick={() => {
                                  setResponseForm({ feedback_id: esc.feedback_id, vendor_name: esc.vendor_name, response_type: 'improvement_plan', response_text: '' });
                                  setShowResponse(true);
                                }}>
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement Tracking Summary */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Supplier Improvement Tracking</CardTitle></CardHeader>
        <CardContent>
          {(() => {
            const vendorEscalations: Record<string, { total: number; resolved: number; avgResolutionDays: number[] }> = {};
            escalations.forEach(esc => {
              if (!vendorEscalations[esc.vendor_name]) vendorEscalations[esc.vendor_name] = { total: 0, resolved: 0, avgResolutionDays: [] };
              vendorEscalations[esc.vendor_name].total++;
              if (esc.status === 'resolved' || esc.status === 'closed') {
                vendorEscalations[esc.vendor_name].resolved++;
                if (esc.resolved_at && esc.created_at) {
                  const days = (new Date(esc.resolved_at).getTime() - new Date(esc.created_at).getTime()) / 86400000;
                  vendorEscalations[esc.vendor_name].avgResolutionDays.push(days);
                }
              }
            });

            const items = Object.entries(vendorEscalations)
              .map(([vendor, data]) => ({
                vendor,
                ...data,
                resolutionRate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
                avgDays: data.avgResolutionDays.length > 0
                  ? Math.round(data.avgResolutionDays.reduce((a, b) => a + b, 0) / data.avgResolutionDays.length)
                  : null,
              }))
              .sort((a, b) => b.total - a.total);

            if (items.length === 0) return <p className="text-center py-4 text-muted-foreground text-sm">No escalation history to track improvements.</p>;

            return (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Total Escalations</TableHead>
                      <TableHead>Resolved</TableHead>
                      <TableHead>Resolution Rate</TableHead>
                      <TableHead>Avg Resolution (days)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.vendor}>
                        <TableCell className="font-medium text-sm">{item.vendor}</TableCell>
                        <TableCell>{item.total}</TableCell>
                        <TableCell>{item.resolved}</TableCell>
                        <TableCell>
                          <span className={item.resolutionRate >= 80 ? 'text-green-600' : item.resolutionRate >= 50 ? 'text-amber-600' : 'text-red-600'}>
                            {item.resolutionRate}%
                          </span>
                        </TableCell>
                        <TableCell>{item.avgDays !== null ? `${item.avgDays}d` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${
                            item.resolutionRate >= 80 ? 'border-green-500 text-green-600' :
                            item.resolutionRate >= 50 ? 'border-amber-500 text-amber-600' :
                            'border-red-500 text-red-600'
                          }`}>
                            {item.resolutionRate >= 80 ? 'Responsive' : item.resolutionRate >= 50 ? 'Moderate' : 'Unresponsive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={showResolve} onOpenChange={setShowResolve}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Escalation</DialogTitle></DialogHeader>
          <div>
            <p className="text-sm mb-2"><strong>{selectedEsc?.vendor_name}</strong> — {selectedEsc?.title}</p>
            <Label>Resolution Notes *</Label>
            <Textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="Describe the resolution..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolve(false)}>Cancel</Button>
            <Button onClick={() => selectedEsc && handleStatusUpdate(selectedEsc.id, 'resolved')} disabled={!resolveNotes}>Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Response Dialog */}
      <Dialog open={showResponse} onOpenChange={setShowResponse}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplier Response</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Response Type</Label>
              <Select value={responseForm.response_type} onValueChange={v => setResponseForm(f => ({ ...f, response_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acknowledgment">Acknowledgment</SelectItem>
                  <SelectItem value="improvement_plan">Improvement Plan</SelectItem>
                  <SelectItem value="dispute">Dispute</SelectItem>
                  <SelectItem value="resolution">Resolution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Response Text *</Label>
              <Textarea value={responseForm.response_text} onChange={e => setResponseForm(f => ({ ...f, response_text: e.target.value }))}
                placeholder="Supplier's response or improvement plan..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponse(false)}>Cancel</Button>
            <Button onClick={handleAddResponse} disabled={!responseForm.response_text || addResponse.isPending}>Submit Response</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
