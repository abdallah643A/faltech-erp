import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Camera, CheckCircle2, XCircle, Star, Truck, Package, AlertTriangle, MapPin, Clock } from 'lucide-react';
import { useDeliveryVerifications, useSupplierPhotoUpload } from '@/hooks/useSupplierManagement';
import { usePurchaseOrders } from '@/hooks/useProcurement';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  verified: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
};

export function MobileVerification() {
  const { verifications, isLoading, createVerification } = useDeliveryVerifications();
  const { purchaseOrders } = usePurchaseOrders();
  const { upload } = useSupplierPhotoUpload();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    purchase_order_id: '', vendor_name: '', po_number: '',
    items_expected: 0, items_received: 0, items_damaged: 0, items_missing: 0,
    overall_condition: 'good', delivery_on_time: true,
    discrepancy_notes: '', supplier_rating: 0, rating_comments: '',
  });

  const approvedPOs = purchaseOrders?.filter(po => ['approved', 'partially_delivered'].includes(po.status)) || [];

  const handlePOSelect = (poId: string) => {
    const po = approvedPOs.find(p => p.id === poId);
    if (po) {
      setForm(f => ({
        ...f,
        purchase_order_id: poId,
        vendor_name: po.vendor_name,
        po_number: po.po_number,
      }));
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await upload(file);
        urls.push(url);
      }
      setPhotos(prev => [...prev, ...urls]);
    } catch { /* handled by hook */ }
    setUploading(false);
  };

  const handleSubmit = async () => {
    await createVerification.mutateAsync({
      ...form,
      photo_urls: photos,
      verified_by: user?.id,
      verified_by_name: user?.email?.split('@')[0],
      delivery_status: form.items_missing > 0 || form.items_damaged > 0 ? 'partial' : 'verified',
      actual_delivery_date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
    setForm({ purchase_order_id: '', vendor_name: '', po_number: '', items_expected: 0, items_received: 0, items_damaged: 0, items_missing: 0, overall_condition: 'good', delivery_on_time: true, discrepancy_notes: '', supplier_rating: 0, rating_comments: '' });
    setPhotos([]);
  };

  // Stats
  const totalVerified = verifications.filter(v => v.delivery_status === 'verified').length;
  const partialCount = verifications.filter(v => v.delivery_status === 'partial').length;
  const avgRating = verifications.filter(v => v.supplier_rating).length > 0
    ? (verifications.reduce((s, v) => s + (v.supplier_rating || 0), 0) / verifications.filter(v => v.supplier_rating).length).toFixed(1)
    : '0';

  return (
    <div className="space-y-4">
      {/* Mobile-friendly KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Truck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{verifications.length}</p>
          <p className="text-xs text-muted-foreground">Total Verifications</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold text-green-600">{totalVerified}</p>
          <p className="text-xs text-muted-foreground">Fully Verified</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-600" />
          <p className="text-2xl font-bold text-amber-600">{partialCount}</p>
          <p className="text-xs text-muted-foreground">With Issues</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Star className="h-5 w-5 mx-auto mb-1 text-amber-500" />
          <p className="text-2xl font-bold">{avgRating}</p>
          <p className="text-xs text-muted-foreground">Avg Rating</p>
        </CardContent></Card>
      </div>

      {/* New Verification Button */}
      <Button className="w-full md:w-auto" onClick={() => setShowForm(!showForm)}>
        <Package className="h-4 w-4 mr-2" /> {showForm ? 'Cancel' : 'New Delivery Verification'}
      </Button>

      {/* Mobile-optimized verification form */}
      {showForm && (
        <Card className="border-primary/50">
          <CardHeader><CardTitle className="text-base">Verify Delivery</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Purchase Order *</Label>
              <Select value={form.purchase_order_id} onValueChange={handlePOSelect}>
                <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                <SelectContent>
                  {approvedPOs.map(po => (
                    <SelectItem key={po.id} value={po.id}>{po.po_number} - {po.vendor_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.vendor_name && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{form.vendor_name}</p>
                <p className="text-xs text-muted-foreground">PO: {form.po_number}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Items Expected</Label><Input type="number" value={form.items_expected} onChange={e => setForm(f => ({ ...f, items_expected: +e.target.value }))} /></div>
              <div><Label>Items Received</Label><Input type="number" value={form.items_received} onChange={e => setForm(f => ({ ...f, items_received: +e.target.value }))} /></div>
              <div><Label>Items Damaged</Label><Input type="number" value={form.items_damaged} onChange={e => setForm(f => ({ ...f, items_damaged: +e.target.value }))} /></div>
              <div><Label>Items Missing</Label><Input type="number" value={form.items_missing} onChange={e => setForm(f => ({ ...f, items_missing: +e.target.value }))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Overall Condition</Label>
                <Select value={form.overall_condition} onValueChange={v => setForm(f => ({ ...f, overall_condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="acceptable">Acceptable</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>On-Time Delivery?</Label>
                <Select value={form.delivery_on_time ? 'yes' : 'no'} onValueChange={v => setForm(f => ({ ...f, delivery_on_time: v === 'yes' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No - Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Supplier Rating */}
            <div>
              <Label>Rate This Delivery</Label>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => setForm(f => ({ ...f, supplier_rating: star }))}
                    className="p-1 hover:scale-110 transition-transform">
                    <Star className={`h-6 w-6 ${star <= form.supplier_rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
                <span className="text-sm ml-2 text-muted-foreground">{form.supplier_rating}/5</span>
              </div>
            </div>

            {/* Photo Capture */}
            <div>
              <Label>Photos / Evidence</Label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple
                className="hidden" onChange={handlePhotoCapture} />
              <Button variant="outline" className="w-full mt-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Camera className="h-4 w-4 mr-2" /> {uploading ? 'Uploading...' : 'Capture Photo'}
              </Button>
              {photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {photos.map((url, i) => (
                    <img key={i} src={url} alt={`Photo ${i+1}`} className="h-16 w-16 object-cover rounded-md border" />
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Discrepancy Notes</Label>
              <Textarea value={form.discrepancy_notes} onChange={e => setForm(f => ({ ...f, discrepancy_notes: e.target.value }))} placeholder="Describe any discrepancies..." />
            </div>
            <div>
              <Label>Rating Comments</Label>
              <Textarea value={form.rating_comments} onChange={e => setForm(f => ({ ...f, rating_comments: e.target.value }))} placeholder="Comments on supplier performance..." />
            </div>

            <Button className="w-full" onClick={handleSubmit}
              disabled={!form.vendor_name || createVerification.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Submit Verification
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Verifications */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Verifications</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-center py-4 text-muted-foreground">Loading...</p> :
          verifications.length === 0 ? <p className="text-center py-4 text-muted-foreground">No verifications yet.</p> : (
            <div className="space-y-3 md:hidden">
              {verifications.slice(0, 20).map(v => (
                <div key={v.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{v.vendor_name}</p>
                    <Badge className={statusColors[v.delivery_status] || ''}>{v.delivery_status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{v.po_number || 'No PO'}</span>
                    <span>{format(new Date(v.verification_date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span>Received: {v.items_received}/{v.items_expected}</span>
                    {v.items_damaged > 0 && <span className="text-destructive">Damaged: {v.items_damaged}</span>}
                    {v.supplier_rating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {v.supplier_rating}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Desktop table */}
          {verifications.length > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>PO</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>On-Time</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.slice(0, 50).map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs">{format(new Date(v.verification_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium text-sm">{v.vendor_name}</TableCell>
                      <TableCell className="font-mono text-xs">{v.po_number || '-'}</TableCell>
                      <TableCell className="text-xs">{v.items_received}/{v.items_expected}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{v.overall_condition}</Badge></TableCell>
                      <TableCell>{v.delivery_on_time ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= (v.supplier_rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/20'}`} />)}
                        </div>
                      </TableCell>
                      <TableCell><Badge className={statusColors[v.delivery_status] || ''}>{v.delivery_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
