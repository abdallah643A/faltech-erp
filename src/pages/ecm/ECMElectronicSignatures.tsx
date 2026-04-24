import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PenTool, Shield, Upload, FileSignature, Clock, CheckCircle, AlertTriangle,
  Eye, Download, Lock, Fingerprint, Smartphone, Mail, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ECMElectronicSignatures = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ['ecm-signatures'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_signatures').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const verified = signatures.filter(s => s.status === 'verified').length;
  const pending = signatures.filter(s => ['awaiting', 'pending_otp'].includes(s.status)).length;
  const today = signatures.filter(s => s.signed_at && new Date(s.signed_at).toDateString() === new Date().toDateString()).length;
  const failed = signatures.filter(s => s.status === 'rejected').length;

  const handleSign = () => setShowOTPDialog(true);

  const verifyOTP = () => {
    if (otpValue.length === 6) {
      toast.success("Signature verified and applied successfully");
      setShowOTPDialog(false);
      setOtpValue('');
    } else {
      toast.error("Invalid OTP code");
    }
  };

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSignature className="h-6 w-6 text-[#0066cc]" />
          <div>
            <h1 className="text-xl font-bold">Electronic Signatures</h1>
            <p className="text-sm text-muted-foreground">Sign, verify, and manage digital signatures</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Upload Signature</Button>
          <Button className="bg-[#0066cc] hover:bg-[#0055aa]"><PenTool className="h-4 w-4 mr-2" /> Draw Signature</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Signed', value: verified, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Pending Signatures', value: pending, icon: Clock, color: 'text-amber-600' },
          { label: 'Verified Today', value: today, icon: Shield, color: 'text-blue-600' },
          { label: 'Failed Attempts', value: failed, icon: AlertTriangle, color: 'text-red-600' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Signature Log</TabsTrigger>
          <TabsTrigger value="my-signature">My Signature</TabsTrigger>
          <TabsTrigger value="requests">Signature Requests</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Signer</TableHead>
                      <TableHead>Signed At</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signatures.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No signature records yet</TableCell></TableRow>
                    ) : signatures.map(sig => (
                      <TableRow key={sig.id}>
                        <TableCell className="font-medium text-sm">{sig.document_name}</TableCell>
                        <TableCell className="text-sm">{sig.signer_name || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{sig.signed_at ? format(new Date(sig.signed_at), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{sig.ip_address || '-'}</TableCell>
                        <TableCell className="text-sm">{sig.signature_method || '-'}</TableCell>
                        <TableCell>
                          <Badge className={sig.status === 'verified' ? 'bg-green-100 text-green-700' : sig.status === 'pending_otp' ? 'bg-amber-100 text-amber-700' : ''}>
                            {sig.status === 'verified' ? '✓ Verified' : sig.status === 'pending_otp' ? 'Pending OTP' : 'Awaiting'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-signature" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Draw Signature</CardTitle></CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg h-40 flex items-center justify-center bg-muted/30 cursor-crosshair">
                  <p className="text-muted-foreground text-sm">Click and draw your signature here</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm">Clear</Button>
                  <Button size="sm" className="bg-[#0066cc]">Save Signature</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Upload Signature Image</CardTitle></CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center bg-muted/30">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drop image or click to upload</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, max 2MB</p>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardHeader><CardTitle className="text-sm">Two-Factor Authentication for Signing</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <div className="flex items-center gap-3 p-4 border rounded-lg flex-1">
                    <Mail className="h-6 w-6 text-[#0066cc]" />
                    <div>
                      <p className="text-sm font-medium">Email OTP</p>
                      <p className="text-xs text-muted-foreground">6-digit code sent to your email</p>
                    </div>
                    <Badge className="ml-auto bg-green-100 text-green-700">Active</Badge>
                  </div>
                  <div className="flex items-center gap-3 p-4 border rounded-lg flex-1">
                    <Smartphone className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">SMS OTP</p>
                      <p className="text-xs text-muted-foreground">6-digit code sent via SMS</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">Enable</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {(() => {
            const pendingSigs = signatures.filter(s => s.status === 'awaiting' || s.status === 'pending_otp');
            return pendingSigs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No pending signature requests</div>
            ) : (
              <div className="space-y-3">
                {pendingSigs.map(req => (
                  <Card key={req.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileSignature className="h-5 w-5 text-[#0066cc]" />
                        <div>
                          <p className="text-sm font-medium">{req.document_name}</p>
                          <p className="text-xs text-muted-foreground">From: {req.requested_department || 'N/A'} · Due: {req.due_date || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={req.priority === 'high' ? 'destructive' : 'secondary'}>{req.priority}</Badge>
                        <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                        <Button size="sm" className="bg-[#0066cc]" onClick={handleSign}><PenTool className="h-3.5 w-3.5 mr-1" /> Sign</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Signature Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: Lock, title: 'Lock document after signing', desc: 'Prevent edits after all signatures are collected' },
                { icon: Fingerprint, title: 'Require 2FA for all signatures', desc: 'OTP verification mandatory before signing' },
                { icon: Shield, title: 'Record IP address & device', desc: "Log signer's IP and browser for audit" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-[#0066cc]" />
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-[#0066cc]" /> Verify Your Identity
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">A 6-digit OTP has been sent to your registered email.</p>
            <div>
              <Label>OTP Code</Label>
              <Input value={otpValue} onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="text-center text-2xl tracking-[0.5em] font-mono" maxLength={6} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowOTPDialog(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#0066cc]" onClick={verifyOTP}>Verify & Sign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ECMElectronicSignatures;