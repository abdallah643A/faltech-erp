import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Send, Star, Truck, Shield, MessageCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useSupplierFeedback } from '@/hooks/useSupplierFeedback';
import { useSupplierPhotoUpload } from '@/hooks/useSupplierManagement';
import { usePurchaseOrders } from '@/hooks/useProcurement';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const gradeColors: Record<string, string> = {
  'A+': 'bg-green-100 text-green-800', 'A': 'bg-green-50 text-green-700',
  'B': 'bg-blue-100 text-blue-800', 'C': 'bg-amber-100 text-amber-800',
  'D': 'bg-orange-100 text-orange-800', 'F': 'bg-red-100 text-red-800',
};

function ScoreSlider({ label, value, onChange, icon: Icon }: { label: string; value: number; onChange: (v: number) => void; icon?: any }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{value}/5</span>
      </div>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={() => onChange(s)}
            className={`flex-1 h-8 rounded text-xs font-bold transition-all ${
              s <= value
                ? s <= 2 ? 'bg-red-500 text-white' : s <= 3 ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MobileFeedbackCapture() {
  const { feedbacks, isLoading, createFeedback, calcOverall, calcGrade } = useSupplierFeedback();
  const { upload } = useSupplierPhotoUpload();
  const { purchaseOrders } = usePurchaseOrders();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-fb'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name');
      return data || [];
    },
  });

  const [form, setForm] = useState({
    vendor_name: '', vendor_code: '', purchase_order_id: '', po_number: '',
    project_id: '', site_name: '',
    delivery_on_time_score: 3, delivery_quantity_score: 3, delivery_condition_score: 3, delivery_notes: '',
    quality_spec_compliance_score: 3, quality_defect_score: 3, quality_packaging_score: 3, quality_notes: '', quality_issue_type: '',
    prof_communication_score: 3, prof_behavior_score: 3, prof_responsiveness_score: 3, prof_notes: '',
    is_critical: false, is_safety_related: false,
  });

  const approvedPOs = purchaseOrders?.filter(po => ['approved', 'partially_delivered', 'fully_delivered'].includes(po.status)) || [];

  const handlePOSelect = (poId: string) => {
    const po = approvedPOs.find(p => p.id === poId);
    if (po) {
      setForm(f => ({ ...f, purchase_order_id: poId, vendor_name: po.vendor_name, vendor_code: po.vendor_code || '', po_number: po.po_number }));
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const url = await upload(file);
        setPhotos(prev => [...prev, url]);
      }
    } catch { /* handled */ }
    setUploading(false);
  };

  const previewScore = calcOverall(form);
  const previewGrade = calcGrade(previewScore);

  const handleSubmit = async () => {
    await createFeedback.mutateAsync({
      ...form,
      purchase_order_id: form.purchase_order_id || null,
      project_id: form.project_id || null,
      photo_urls: photos,
      submitted_by: user?.id,
      submitted_by_name: user?.email?.split('@')[0],
    });
    setShowForm(false);
    setPhotos([]);
    setForm({
      vendor_name: '', vendor_code: '', purchase_order_id: '', po_number: '',
      project_id: '', site_name: '',
      delivery_on_time_score: 3, delivery_quantity_score: 3, delivery_condition_score: 3, delivery_notes: '',
      quality_spec_compliance_score: 3, quality_defect_score: 3, quality_packaging_score: 3, quality_notes: '', quality_issue_type: '',
      prof_communication_score: 3, prof_behavior_score: 3, prof_responsiveness_score: 3, prof_notes: '',
      is_critical: false, is_safety_related: false,
    });
  };

  // Stats
  const thisMonth = feedbacks.filter(f => {
    const d = new Date(f.feedback_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const avgScore = feedbacks.length > 0 ? Math.round(feedbacks.reduce((s, f) => s + (f.overall_score || 0), 0) / feedbacks.length) : 0;
  const criticalCount = feedbacks.filter(f => f.is_critical || f.is_safety_related).length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{feedbacks.length}</p>
          <p className="text-xs text-muted-foreground">Total Feedback</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{thisMonth.length}</p>
          <p className="text-xs text-muted-foreground">This Month</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{avgScore}</p>
          <p className="text-xs text-muted-foreground">Avg Score</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
          <p className="text-xs text-muted-foreground">Critical/Safety</p>
        </CardContent></Card>
      </div>

      {/* One-tap new feedback */}
      <Button className="w-full md:w-auto" size="lg" onClick={() => setShowForm(!showForm)}>
        <Send className="h-4 w-4 mr-2" /> {showForm ? 'Cancel Feedback' : 'Submit Supplier Feedback'}
      </Button>

      {/* Mobile-optimized feedback form */}
      {showForm && (
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Rate Supplier</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={gradeColors[previewGrade] || ''} variant="secondary">{previewGrade}</Badge>
                <span className="text-sm font-bold">{previewScore}/100</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Supplier & Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Link to PO (optional)</Label>
                <Select value={form.purchase_order_id} onValueChange={handlePOSelect}>
                  <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                  <SelectContent>
                    {approvedPOs.map(po => (
                      <SelectItem key={po.id} value={po.id}>{po.po_number} - {po.vendor_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Vendor Name *</Label>
                <Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} placeholder="Supplier name" />
              </div>
              <div>
                <Label className="text-xs">Site / Project</Label>
                <Select value={form.project_id} onValueChange={v => {
                  const p = projects.find((pr: any) => pr.id === v);
                  setForm(f => ({ ...f, project_id: v, site_name: p?.name || '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Delivery Performance */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <Truck className="h-4 w-4" /> Delivery Performance
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ScoreSlider label="On-Time" value={form.delivery_on_time_score} onChange={v => setForm(f => ({ ...f, delivery_on_time_score: v }))} icon={Clock} />
                <ScoreSlider label="Quantity Accuracy" value={form.delivery_quantity_score} onChange={v => setForm(f => ({ ...f, delivery_quantity_score: v }))} />
                <ScoreSlider label="Condition" value={form.delivery_condition_score} onChange={v => setForm(f => ({ ...f, delivery_condition_score: v }))} />
              </div>
              <Textarea placeholder="Delivery notes..." value={form.delivery_notes} onChange={e => setForm(f => ({ ...f, delivery_notes: e.target.value }))} className="text-sm" rows={2} />
            </div>

            {/* Quality Metrics */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <Shield className="h-4 w-4" /> Quality Assessment
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ScoreSlider label="Spec Compliance" value={form.quality_spec_compliance_score} onChange={v => setForm(f => ({ ...f, quality_spec_compliance_score: v }))} />
                <ScoreSlider label="Defect-Free" value={form.quality_defect_score} onChange={v => setForm(f => ({ ...f, quality_defect_score: v }))} />
                <ScoreSlider label="Packaging" value={form.quality_packaging_score} onChange={v => setForm(f => ({ ...f, quality_packaging_score: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.quality_issue_type} onValueChange={v => setForm(f => ({ ...f, quality_issue_type: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Issue type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="defects">Defects</SelectItem>
                    <SelectItem value="wrong_spec">Wrong Spec</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="contaminated">Contaminated</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Quality notes..." value={form.quality_notes} onChange={e => setForm(f => ({ ...f, quality_notes: e.target.value }))} className="text-sm" rows={1} />
              </div>
            </div>

            {/* Professionalism */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <MessageCircle className="h-4 w-4" /> Professionalism
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ScoreSlider label="Communication" value={form.prof_communication_score} onChange={v => setForm(f => ({ ...f, prof_communication_score: v }))} />
                <ScoreSlider label="Behavior" value={form.prof_behavior_score} onChange={v => setForm(f => ({ ...f, prof_behavior_score: v }))} />
                <ScoreSlider label="Responsiveness" value={form.prof_responsiveness_score} onChange={v => setForm(f => ({ ...f, prof_responsiveness_score: v }))} />
              </div>
              <Textarea placeholder="Professionalism notes..." value={form.prof_notes} onChange={e => setForm(f => ({ ...f, prof_notes: e.target.value }))} className="text-sm" rows={2} />
            </div>

            {/* Flags & Photos */}
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_critical} onChange={e => setForm(f => ({ ...f, is_critical: e.target.checked }))} />
                <span className="text-xs font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Critical Issue
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_safety_related} onChange={e => setForm(f => ({ ...f, is_safety_related: e.target.checked }))} />
                <span className="text-xs font-medium text-orange-600 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Safety Related
                </span>
              </label>
            </div>

            <div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoCapture} />
              <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Camera className="h-4 w-4 mr-2" /> {uploading ? 'Uploading...' : `Attach Photos ${photos.length > 0 ? `(${photos.length})` : ''}`}
              </Button>
              {photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {photos.map((url, i) => <img key={i} src={url} alt="" className="h-14 w-14 object-cover rounded border" />)}
                </div>
              )}
            </div>

            <Button className="w-full" size="lg" onClick={handleSubmit}
              disabled={!form.vendor_name || createFeedback.isPending}>
              <Send className="h-4 w-4 mr-2" /> Submit Feedback ({previewGrade} — {previewScore}/100)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Feedbacks */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Feedback</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-center py-4 text-muted-foreground text-sm">Loading...</p> :
          feedbacks.length === 0 ? <p className="text-center py-4 text-muted-foreground text-sm">No feedback submitted yet.</p> : (
            <div className="space-y-2">
              {feedbacks.slice(0, 20).map(fb => (
                <div key={fb.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{fb.vendor_name}</span>
                      {fb.is_critical && <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />}
                      {fb.is_safety_related && <Shield className="h-3 w-3 text-orange-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(fb.feedback_date), 'dd/MM/yyyy')}</span>
                      {fb.po_number && <span>• {fb.po_number}</span>}
                      {fb.site_name && <span>• {fb.site_name}</span>}
                      <span>• by {fb.submitted_by_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={gradeColors[fb.overall_grade] || ''} variant="secondary">{fb.overall_grade}</Badge>
                    <span className="text-sm font-bold">{fb.overall_score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
